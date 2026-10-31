-- Dish catalog: a shared list of canonical dishes for name suggestions, plus a review list of unmatched names.
-- Normalisation is mirrored in src/lib/dishes/normalize.ts; scripts/test-dishes.mjs keeps the two identical.
create function private.normalize_dish_name(p_name text) returns text
language sql immutable parallel safe set search_path = '' as $$
  select btrim(regexp_replace(regexp_replace(regexp_replace(regexp_replace(lower(coalesce(p_name, '')),
    '[-_/&,+]', ' ', 'g'),
    '[!-/:-@[-`{-~’‘“”–—।]', '', 'g'),
    '\m(half|full|small|medium|large|regular)\M', ' ', 'g'),
    '\s+', ' ', 'g'));
$$;

create function private.dish_search_keys(p_name text, p_name_ne text, p_aliases text[]) returns text[]
language sql immutable parallel safe set search_path = '' as $$
  select coalesce(array(select distinct key from (
    select private.normalize_dish_name(value) as key from unnest(array[p_name, p_name_ne] || p_aliases) as value
  ) keys where key <> '' order by key), '{}');
$$;

create table public.dishes (
  id uuid primary key default gen_random_uuid(),
  slug text unique check (slug ~ '^[a-z0-9][a-z0-9-]{0,98}$'),
  name text not null check (length(btrim(name)) between 1 and 150),
  name_ne text check (length(name_ne) <= 150),
  category text check (length(category) <= 100),
  aliases text[] not null default '{}' check (cardinality(aliases) <= 30),
  tags text[] not null default '{}' check (cardinality(tags) <= 20),
  status text not null default 'ACTIVE' check (status in ('ACTIVE', 'HIDDEN')),
  normalized text generated always as (private.normalize_dish_name(name)) stored,
  search_keys text[] generated always as (private.dish_search_keys(name, name_ne, aliases)) stored,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  check (private.normalize_dish_name(name) <> '')
);
create index dishes_search_keys_idx on public.dishes using gin(search_keys);
create index dishes_status_name_idx on public.dishes(status, name);

create table private.dish_name_candidates (
  normalized text primary key,
  sample_name text not null,
  restaurant_count integer not null default 0,
  first_seen_at timestamptz not null default now(), last_seen_at timestamptz not null default now()
);
create index dish_candidates_rank_idx on private.dish_name_candidates(restaurant_count desc, last_seen_at desc);
create table private.dish_name_candidate_restaurants (
  normalized text not null references private.dish_name_candidates(normalized) on delete cascade,
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  primary key (normalized, restaurant_id)
);
alter table private.dish_name_candidates enable row level security;
alter table private.dish_name_candidate_restaurants enable row level security;
revoke all on private.dish_name_candidates, private.dish_name_candidate_restaurants from public, anon, authenticated;

alter table public.menu_items add column dish_id uuid references public.dishes(id) on delete set null;
create index menu_items_dish_idx on public.menu_items(dish_id) where dish_id is not null;

alter table public.dishes enable row level security;
revoke all on public.dishes from public, anon, authenticated;
grant select(id, slug, name, name_ne, category, aliases, tags, status) on public.dishes to anon, authenticated;
create policy dishes_read_active on public.dishes for select to anon, authenticated using (status = 'ACTIVE');

create function private.touch_dish() returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at := now(); return new; end;
$$;
create trigger dishes_touch before update on public.dishes for each row execute function private.touch_dish();

revoke all on function private.normalize_dish_name(text), private.dish_search_keys(text, text, text[]), private.touch_dish() from public, anon, authenticated;

-- Links an item to a catalog dish, or records its name for review. A link survives only while the item's name still matches.
create function private.link_item_dish(p_restaurant_id uuid, p_item_id uuid, p_payload jsonb) returns void
language plpgsql security definer set search_path = '' as $$
declare item public.menu_items; key text; requested uuid; chosen uuid; matches uuid[];
begin
  select * into item from public.menu_items where id = p_item_id and restaurant_id = p_restaurant_id;
  if not found then return; end if;
  key := private.normalize_dish_name(item.name);
  requested := case when p_payload ? 'dish_id' then nullif(p_payload->>'dish_id', '')::uuid else item.dish_id end;
  if key = '' then chosen := null;
  else
    select d.id into chosen from public.dishes d
    where d.id = requested and d.search_keys @> array[key] and (d.status = 'ACTIVE' or d.id = item.dish_id);
    if chosen is null then
      select array_agg(d.id) into matches from public.dishes d where d.status = 'ACTIVE' and d.search_keys @> array[key];
      if cardinality(matches) = 1 then chosen := matches[1]; end if;
    end if;
  end if;
  update public.menu_items set dish_id = chosen where id = p_item_id and dish_id is distinct from chosen;
  if chosen is null and key <> '' and not exists(select 1 from public.dishes d where d.search_keys @> array[key]) then
    insert into private.dish_name_candidates(normalized, sample_name) values(key, item.name)
    on conflict (normalized) do update set last_seen_at = now();
    insert into private.dish_name_candidate_restaurants(normalized, restaurant_id) values(key, p_restaurant_id) on conflict do nothing;
    update private.dish_name_candidates c set restaurant_count = (select count(*) from private.dish_name_candidate_restaurants r where r.normalized = c.normalized)
    where c.normalized = key;
  end if;
end;
$$;
revoke all on function private.link_item_dish(uuid, uuid, jsonb) from public, anon, authenticated;

alter function public.mutate_menu(uuid, text, jsonb) set schema private;
alter function private.mutate_menu(uuid, text, jsonb) rename to mutate_menu_core;
revoke all on function private.mutate_menu_core(uuid, text, jsonb) from public, anon, authenticated;

create function public.mutate_menu(p_restaurant_id uuid, p_operation text, p_payload jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare receipt jsonb;
begin
  receipt := private.mutate_menu_core(p_restaurant_id, p_operation, p_payload);
  if p_operation = 'saveItem' then
    perform private.link_item_dish(p_restaurant_id, (receipt->>'id')::uuid, p_payload);
  end if;
  return receipt;
end;
$$;
revoke all on function public.mutate_menu(uuid, text, jsonb) from public, anon;
grant execute on function public.mutate_menu(uuid, text, jsonb) to authenticated;

-- The whole active catalog in one small response; the browser searches it locally.
create function public.get_dish_catalog() returns jsonb
language sql stable security invoker set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', d.id, 'name', d.name, 'nameNe', d.name_ne, 'category', d.category, 'aliases', d.aliases)
    order by d.name, d.id), '[]'::jsonb) from public.dishes d where d.status = 'ACTIVE';
$$;
revoke all on function public.get_dish_catalog() from public;
grant execute on function public.get_dish_catalog() to anon, authenticated;

-- Admin: dishes and the review list of owner-typed names that matched nothing.
create function private.link_matching_items(p_dish_id uuid) returns integer
language plpgsql security definer set search_path = '' as $$
declare linked integer;
begin
  update public.menu_items i set dish_id = p_dish_id
  from public.dishes d
  where d.id = p_dish_id and d.status = 'ACTIVE' and i.dish_id is null and i.deleted_at is null
    and d.search_keys @> array[private.normalize_dish_name(i.name)] and private.normalize_dish_name(i.name) <> ''
    and not exists(select 1 from public.dishes other where other.id <> d.id and other.status = 'ACTIVE'
      and other.search_keys @> array[private.normalize_dish_name(i.name)]);
  get diagnostics linked = row_count;
  delete from private.dish_name_candidates c where exists(select 1 from public.dishes d where d.search_keys @> array[c.normalized]);
  return linked;
end;
$$;
revoke all on function private.link_matching_items(uuid) from public, anon, authenticated;

create function private.clean_text_list(p_values jsonb, p_max integer, p_length integer) returns text[]
language plpgsql immutable set search_path = '' as $$
declare cleaned text[];
begin
  if p_values is null or jsonb_typeof(p_values) <> 'array' then return '{}'; end if;
  select coalesce(array(select distinct on (lower(v)) v from (select btrim(value) as v from jsonb_array_elements_text(p_values)) s
    where v <> '' and length(v) <= p_length order by lower(v), v), '{}') into cleaned;
  if cardinality(cleaned) > p_max then raise exception 'Too many entries' using errcode = '23514'; end if;
  return cleaned;
end;
$$;
revoke all on function private.clean_text_list(jsonb, integer, integer) from public, anon, authenticated;

create function private.admin_dish_json(d public.dishes, p_linked_items bigint default null) returns jsonb
language sql stable set search_path = '' as $$
  select jsonb_build_object('id', d.id, 'slug', d.slug, 'name', d.name, 'nameNe', d.name_ne, 'category', d.category,
    'aliases', d.aliases, 'tags', d.tags, 'status', d.status, 'updatedAt', d.updated_at,
    'itemCount', coalesce(p_linked_items, (select count(*) from public.menu_items i where i.dish_id = d.id and i.deleted_at is null)));
$$;
revoke all on function private.admin_dish_json(public.dishes, bigint) from public, anon, authenticated;

create function public.admin_list_dishes(p_search text, p_status text, p_page integer, p_page_size integer) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare pattern text := private.like_pattern(p_search);
  size integer := least(greatest(coalesce(p_page_size, 20), 1), 50);
  skip integer := (greatest(coalesce(p_page, 1), 1) - 1) * size;
  result jsonb;
begin
  perform private.assert_super_admin();
  with matched as (
    select d.id, d.name from public.dishes d
    where (p_status is null or d.status = p_status)
      and (pattern is null or d.name ilike pattern or d.name_ne ilike pattern or d.category ilike pattern
        or exists(select 1 from unnest(d.aliases) a where a ilike pattern))
  ), page as (select * from matched order by name, id limit size offset skip)
  select jsonb_build_object('total', (select count(*) from matched), 'rows', coalesce((select jsonb_agg(private.admin_dish_json(d) order by d.name, d.id)
    from public.dishes d join page p on p.id = d.id), '[]'::jsonb))
  into result;
  return result;
end;
$$;

create function public.admin_save_dish(p_payload jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare target uuid := nullif(p_payload->>'id', '')::uuid; saved public.dishes; linked integer;
  v_name text := btrim(p_payload->>'name'); v_status text := coalesce(p_payload->>'status', 'ACTIVE');
  v_aliases text[]; v_tags text[];
begin
  perform private.assert_super_admin();
  if p_payload is null or jsonb_typeof(p_payload) <> 'object' or v_name is null or length(v_name) not between 1 and 150
    or private.normalize_dish_name(v_name) = '' or v_status not in ('ACTIVE', 'HIDDEN') then
    raise exception 'Invalid dish' using errcode = '23514';
  end if;
  v_aliases := private.clean_text_list(p_payload->'aliases', 30, 150);
  v_tags := private.clean_text_list(p_payload->'tags', 20, 50);
  if target is null then
    insert into public.dishes(slug, name, name_ne, category, aliases, tags, status)
    values(nullif(btrim(p_payload->>'slug'), ''), v_name, nullif(btrim(p_payload->>'name_ne'), ''), nullif(btrim(p_payload->>'category'), ''), v_aliases, v_tags, v_status)
    returning * into saved;
  else
    update public.dishes set name = v_name, name_ne = nullif(btrim(p_payload->>'name_ne'), ''), category = nullif(btrim(p_payload->>'category'), ''),
      aliases = v_aliases, tags = v_tags, status = v_status, slug = coalesce(nullif(btrim(p_payload->>'slug'), ''), slug)
      where id = target returning * into saved;
    if not found then raise exception 'Dish not found' using errcode = 'P0002'; end if;
  end if;
  linked := private.link_matching_items(saved.id);
  insert into public.audit_events(actor_id, action, metadata)
  values(auth.uid(), case when target is null then 'admin.dish.created' else 'admin.dish.updated' end, jsonb_build_object('dishId', saved.id, 'name', saved.name, 'linkedItems', linked));
  return private.admin_dish_json(saved);
end;
$$;

create function public.admin_merge_dishes(p_source uuid, p_target uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare source public.dishes; target public.dishes; moved integer; merged text[];
begin
  perform private.assert_super_admin();
  if p_source = p_target then raise exception 'Choose two different dishes' using errcode = '23514'; end if;
  select * into source from public.dishes where id = p_source for update;
  select * into target from public.dishes where id = p_target for update;
  if source.id is null or target.id is null then raise exception 'Dish not found' using errcode = 'P0002'; end if;
  select coalesce(array(select distinct on (lower(v)) v from unnest(target.aliases || source.aliases || array[source.name] || coalesce(array[source.name_ne], '{}')) v
    where lower(v) <> lower(target.name) order by lower(v), v limit 30), '{}') into merged;
  update public.menu_items set dish_id = target.id where dish_id = source.id;
  get diagnostics moved = row_count;
  delete from public.dishes where id = source.id;
  update public.dishes set aliases = merged where id = target.id returning * into target;
  perform private.link_matching_items(target.id);
  insert into public.audit_events(actor_id, action, metadata)
  values(auth.uid(), 'admin.dish.merged', jsonb_build_object('sourceName', source.name, 'targetId', target.id, 'targetName', target.name, 'movedItems', moved));
  return private.admin_dish_json(target);
end;
$$;

create function public.admin_list_dish_candidates(p_search text, p_page integer, p_page_size integer) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare pattern text := private.like_pattern(p_search);
  size integer := least(greatest(coalesce(p_page_size, 20), 1), 50);
  skip integer := (greatest(coalesce(p_page, 1), 1) - 1) * size;
  result jsonb;
begin
  perform private.assert_super_admin();
  with matched as (
    select c.* from private.dish_name_candidates c where pattern is null or c.sample_name ilike pattern or c.normalized ilike pattern
  ), page as (select * from matched order by restaurant_count desc, last_seen_at desc, normalized limit size offset skip)
  select jsonb_build_object('total', (select count(*) from matched), 'rows', coalesce((select jsonb_agg(jsonb_build_object(
    'normalized', p.normalized, 'name', p.sample_name, 'restaurantCount', p.restaurant_count, 'lastSeenAt', p.last_seen_at)
    order by p.restaurant_count desc, p.last_seen_at desc, p.normalized) from page p), '[]'::jsonb)) into result;
  return result;
end;
$$;

-- Turns a reviewed candidate into an alias of an existing dish, a new dish, or dismisses it.
create function public.admin_resolve_dish_candidate(p_normalized text, p_action text, p_dish_id uuid default null) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare candidate private.dish_name_candidates; dish public.dishes; linked integer := 0;
begin
  perform private.assert_super_admin();
  select * into candidate from private.dish_name_candidates where normalized = p_normalized for update;
  if not found then raise exception 'Candidate not found' using errcode = 'P0002'; end if;
  if p_action = 'dismiss' then
    delete from private.dish_name_candidates where normalized = p_normalized;
  elsif p_action = 'alias' then
    select * into dish from public.dishes where id = p_dish_id for update;
    if not found then raise exception 'Dish not found' using errcode = 'P0002'; end if;
    if cardinality(dish.aliases) >= 30 then raise exception 'Too many entries' using errcode = '23514'; end if;
    update public.dishes set aliases = array_append(aliases, candidate.sample_name) where id = dish.id returning * into dish;
    linked := private.link_matching_items(dish.id);
  elsif p_action = 'dish' then
    insert into public.dishes(name) values(candidate.sample_name) returning * into dish;
    linked := private.link_matching_items(dish.id);
  else
    raise exception 'Invalid action' using errcode = '23514';
  end if;
  insert into public.audit_events(actor_id, action, metadata)
  values(auth.uid(), 'admin.dish.candidate_' || p_action, jsonb_build_object('name', candidate.sample_name, 'dishId', dish.id, 'linkedItems', linked));
  return jsonb_build_object('linkedItems', linked);
end;
$$;

revoke all on function public.admin_list_dishes(text, text, integer, integer), public.admin_save_dish(jsonb), public.admin_merge_dishes(uuid, uuid),
  public.admin_list_dish_candidates(text, integer, integer), public.admin_resolve_dish_candidate(text, text, uuid) from public, anon;
grant execute on function public.admin_list_dishes(text, text, integer, integer), public.admin_save_dish(jsonb), public.admin_merge_dishes(uuid, uuid),
  public.admin_list_dish_candidates(text, integer, integer), public.admin_resolve_dish_candidate(text, text, uuid) to authenticated;
