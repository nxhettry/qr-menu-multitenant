-- Phase 4C: shared image library, additive. menu_items.image_public_id/image_version stay as a denormalised copy of
-- the chosen asset so every existing reader keeps working; image_asset_id is the link used for sharing and dedupe.
create table public.media_assets (
  id uuid primary key default gen_random_uuid(),
  public_id text not null unique check (length(public_id) between 1 and 200),
  version bigint not null check (version > 0),
  width integer not null check (width between 1 and 12000),
  height integer not null check (height between 1 and 12000),
  sha256 text not null check (sha256 ~ '^[a-f0-9]{64}$'),
  source text not null check (source in ('CURATED', 'USER')),
  owner_restaurant_id uuid references public.restaurants(id) on delete set null,
  visibility text not null default 'PRIVATE' check (visibility in ('PRIVATE', 'PENDING', 'PUBLIC', 'REJECTED')),
  dish_id uuid references public.dishes(id) on delete set null,
  created_at timestamptz not null default now()
);
create unique index media_assets_hash_owner_idx on public.media_assets(sha256, owner_restaurant_id);
create index media_assets_owner_idx on public.media_assets(owner_restaurant_id, created_at desc);
create index media_assets_dish_idx on public.media_assets(dish_id) where visibility = 'PUBLIC';
alter table public.media_assets enable row level security;
revoke all on public.media_assets from public, anon, authenticated;

alter table public.menu_items add column image_asset_id uuid references public.media_assets(id) on delete set null;
alter table public.menu_items drop constraint item_asset_tenant;
alter table public.menu_items add constraint item_asset_tenant check (
  image_public_id is null or image_asset_id is not null
  or image_public_id ~ ('^qrmenu/' || restaurant_id::text || '/[a-f0-9-]{36}$'));

-- Upload quota: 15 per rolling 24 hours, 50 during the first 7 days, with a super-admin override per restaurant.
create table private.upload_limit_overrides (
  restaurant_id uuid primary key references public.restaurants(id) on delete cascade,
  daily_limit integer not null check (daily_limit between 1 and 500)
);
alter table private.upload_limit_overrides enable row level security;
revoke all on private.upload_limit_overrides from public, anon, authenticated;

create function private.upload_limit(p_restaurant_id uuid) returns integer
language sql stable security definer set search_path = '' as $$
  select coalesce(
    (select o.daily_limit from private.upload_limit_overrides o where o.restaurant_id = p_restaurant_id),
    (select case when r.created_at > now() - interval '7 days' then 50 else 15 end from public.restaurants r where r.id = p_restaurant_id),
    15);
$$;
revoke all on function private.upload_limit(uuid) from public, anon, authenticated;

create function public.admin_set_upload_limit(p_restaurant_id uuid, p_limit integer) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform private.assert_super_admin();
  if not exists (select 1 from public.restaurants where id = p_restaurant_id and deleted_at is null) then
    raise exception 'Restaurant not found' using errcode = 'P0002';
  end if;
  if p_limit is null then delete from private.upload_limit_overrides where restaurant_id = p_restaurant_id;
  else
    insert into private.upload_limit_overrides(restaurant_id, daily_limit) values(p_restaurant_id, p_limit)
    on conflict (restaurant_id) do update set daily_limit = excluded.daily_limit;
  end if;
  insert into public.audit_events(restaurant_id, actor_id, action, metadata)
  values(p_restaurant_id, auth.uid(), 'admin.upload_limit.set', jsonb_build_object('limit', p_limit));
end;
$$;

create function public.admin_get_upload_limit(p_restaurant_id uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  perform private.assert_super_admin();
  return jsonb_build_object('limit', private.upload_limit(p_restaurant_id),
    'overridden', exists (select 1 from private.upload_limit_overrides where restaurant_id = p_restaurant_id),
    'usedToday', (select count(*) from private.menu_uploads where restaurant_id = p_restaurant_id and created_at > now() - interval '24 hours'));
end;
$$;

-- Records a freshly uploaded item photo as a private asset and links the item to it.
create function private.register_item_asset(p_restaurant_id uuid, p_payload jsonb) returns void
language plpgsql security definer set search_path = '' as $$
declare upload private.menu_uploads; asset public.media_assets; dish uuid;
begin
  select * into upload from private.menu_uploads where id = (p_payload->>'upload_id')::uuid and restaurant_id = p_restaurant_id;
  if not found or upload.kind <> 'item' or coalesce(p_payload->>'sha256', '') = '' then return; end if;
  select dish_id into dish from public.menu_items where id = upload.item_id and restaurant_id = p_restaurant_id;
  insert into public.media_assets(public_id, version, width, height, sha256, source, owner_restaurant_id, visibility, dish_id)
  values('qrmenu/' || p_restaurant_id::text || '/' || upload.id::text, (p_payload->>'version')::bigint,
    (p_payload->>'width')::integer, (p_payload->>'height')::integer, p_payload->>'sha256', 'USER', p_restaurant_id,
    case when coalesce((p_payload->>'share')::boolean, false) then 'PENDING' else 'PRIVATE' end, dish)
  on conflict do nothing returning * into asset;
  if asset.id is null then
    select * into asset from public.media_assets where sha256 = p_payload->>'sha256' and owner_restaurant_id = p_restaurant_id;
  end if;
  update public.menu_items set image_asset_id = asset.id, image_public_id = asset.public_id, image_version = asset.version
  where id = upload.item_id and restaurant_id = p_restaurant_id;
end;
$$;
revoke all on function private.register_item_asset(uuid, jsonb) from public, anon, authenticated;

alter function public.mutate_menu(uuid, text, jsonb) set schema private;
alter function private.mutate_menu(uuid, text, jsonb) rename to mutate_menu_dishes;
revoke all on function private.mutate_menu_dishes(uuid, text, jsonb) from public, anon, authenticated;

create function public.mutate_menu(p_restaurant_id uuid, p_operation text, p_payload jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare restaurant public.restaurants; asset public.media_assets; upload private.menu_uploads; receipt jsonb;
  target uuid; item uuid;
begin
  if p_payload is null or jsonb_typeof(p_payload) <> 'object' or octet_length(p_payload::text) > 524288 then
    raise exception 'Invalid menu input' using errcode = '23514';
  end if;
  if p_operation = 'reserveUpload' then
    if coalesce(p_payload->>'kind', '') not in ('logo', 'cover', 'item') then raise exception 'Invalid image target' using errcode = '23514'; end if;
    restaurant := private.lock_menu(p_restaurant_id, p_payload->>'kind' <> 'item');
    target := nullif(p_payload->>'item_id', '')::uuid;
    if p_payload->>'kind' = 'item' and not exists (select 1 from public.menu_items where id = target and restaurant_id = p_restaurant_id and deleted_at is null) then
      raise exception 'Item not found' using errcode = 'P0002';
    end if;
    if (select count(*) from private.menu_uploads where restaurant_id = p_restaurant_id and created_at > now() - interval '24 hours') >= private.upload_limit(p_restaurant_id) then
      raise exception 'Daily image upload limit reached. Try again tomorrow' using errcode = '23514';
    end if;
    insert into private.menu_uploads(restaurant_id, actor_id, kind, item_id) values(p_restaurant_id, auth.uid(), p_payload->>'kind', target) returning * into upload;
    return jsonb_build_object('slug', restaurant.slug, 'previousSlug', restaurant.slug, 'uploadId', upload.id,
      'publicId', 'qrmenu/' || p_restaurant_id::text || '/' || upload.id::text);
  elsif p_operation = 'useAsset' then
    restaurant := private.lock_menu(p_restaurant_id, false);
    item := (p_payload->>'item_id')::uuid;
    select * into asset from public.media_assets
    where id = (p_payload->>'asset_id')::uuid and (visibility = 'PUBLIC' or owner_restaurant_id = p_restaurant_id);
    if not found then raise exception 'Photo not available' using errcode = 'P0002'; end if;
    update public.menu_items set image_asset_id = asset.id, image_public_id = asset.public_id, image_version = asset.version
    where id = item and restaurant_id = p_restaurant_id and deleted_at is null;
    if not found then raise exception 'Item not found' using errcode = 'P0002'; end if;
    update public.restaurants set updated_at = now() where id = p_restaurant_id returning * into restaurant;
    insert into public.audit_events(restaurant_id, actor_id, action) values(p_restaurant_id, auth.uid(), 'menu.useAsset');
    return jsonb_build_object('id', item, 'slug', restaurant.slug, 'previousSlug', restaurant.slug);
  elsif p_operation = 'shareAsset' then
    restaurant := private.lock_menu(p_restaurant_id, true);
    update public.media_assets set visibility = case when (p_payload->>'share')::boolean then 'PENDING' else 'PRIVATE' end
    where id = (p_payload->>'asset_id')::uuid and owner_restaurant_id = p_restaurant_id and source = 'USER'
      and visibility = case when (p_payload->>'share')::boolean then 'PRIVATE' else 'PENDING' end;
    if not found then raise exception 'Photo sharing can’t be changed' using errcode = 'P0002'; end if;
    insert into public.audit_events(restaurant_id, actor_id, action) values(p_restaurant_id, auth.uid(), 'menu.shareAsset');
    return jsonb_build_object('id', (p_payload->>'asset_id')::uuid, 'slug', restaurant.slug, 'previousSlug', restaurant.slug);
  end if;

  receipt := private.mutate_menu_dishes(p_restaurant_id, p_operation, p_payload);
  if p_operation = 'attachImage' then
    perform private.register_item_asset(p_restaurant_id, p_payload);
  elsif p_operation = 'removeImage' and p_payload->>'kind' = 'item' then
    update public.menu_items set image_asset_id = null where id = (p_payload->>'item_id')::uuid and restaurant_id = p_restaurant_id;
  end if;
  return receipt;
end;
$$;
revoke all on function public.mutate_menu(uuid, text, jsonb) from public, anon;
grant execute on function public.mutate_menu(uuid, text, jsonb) to authenticated;

-- Dedupe lookup: the caller proves they hold the image by sending its hash; only own or public assets are returned.
create function public.find_reusable_asset(p_restaurant_id uuid, p_sha256 text) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare asset public.media_assets;
begin
  if not private.can_edit(p_restaurant_id, array['OWNER', 'MANAGER', 'EDITOR']) then raise exception 'Editing is not permitted' using errcode = '42501'; end if;
  select * into asset from public.media_assets
  where sha256 = p_sha256 and (visibility = 'PUBLIC' or owner_restaurant_id = p_restaurant_id)
  order by (owner_restaurant_id = p_restaurant_id) desc nulls last, created_at limit 1;
  return case when asset.id is null then null else jsonb_build_object('id', asset.id) end;
end;
$$;

-- What the item photo picker shows: the restaurant's own uploads and public photos for the item's dish.
create function public.list_photo_options(p_restaurant_id uuid, p_item_id uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare dish uuid;
begin
  if not private.is_member(p_restaurant_id) then raise exception 'Not permitted' using errcode = '42501'; end if;
  select dish_id into dish from public.menu_items where id = p_item_id and restaurant_id = p_restaurant_id and deleted_at is null;
  return jsonb_build_object(
    'own', coalesce((select jsonb_agg(jsonb_build_object('id', a.id, 'publicId', a.public_id, 'version', a.version, 'visibility', a.visibility) order by a.created_at desc)
      from (select * from public.media_assets where owner_restaurant_id = p_restaurant_id order by created_at desc limit 40) a), '[]'::jsonb),
    'library', case when dish is null then '[]'::jsonb else coalesce((select jsonb_agg(jsonb_build_object('id', a.id, 'publicId', a.public_id, 'version', a.version) order by a.created_at)
      from (select * from public.media_assets where visibility = 'PUBLIC' and dish_id = dish and owner_restaurant_id is distinct from p_restaurant_id order by created_at limit 40) a), '[]'::jsonb) end);
end;
$$;

-- Cleanup keeps shared assets and anything any item still shows, whichever restaurant owns the file.
create or replace function public.list_unreferenced_uploads(p_limit integer) returns jsonb
language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', x.id, 'publicId', x.public_id)), '[]'::jsonb)
  from (
    select u.id, 'qrmenu/' || u.restaurant_id::text || '/' || u.id::text as public_id
    from private.menu_uploads u
    where u.discarded_at is null and u.created_at < now() - interval '1 hour'
      and not exists (select 1 from public.restaurants r
        where 'qrmenu/' || u.restaurant_id::text || '/' || u.id::text in (r.logo_public_id, r.cover_public_id))
      and not exists (select 1 from public.menu_items i where i.image_public_id = 'qrmenu/' || u.restaurant_id::text || '/' || u.id::text)
      and not exists (select 1 from public.media_assets a
        where a.public_id = 'qrmenu/' || u.restaurant_id::text || '/' || u.id::text and a.visibility in ('PENDING', 'PUBLIC'))
    order by u.created_at limit least(greatest(coalesce(p_limit, 50), 1), 200)
  ) x;
$$;

create or replace function public.mark_uploads_discarded(p_ids uuid[]) returns integer
language plpgsql security definer set search_path = '' as $$
declare marked integer;
begin
  delete from public.media_assets a using private.menu_uploads u
  where u.id = any(p_ids) and a.public_id = 'qrmenu/' || u.restaurant_id::text || '/' || u.id::text and a.visibility in ('PRIVATE', 'REJECTED');
  update private.menu_uploads set discarded_at = now() where id = any(p_ids) and discarded_at is null;
  get diagnostics marked = row_count;
  return marked;
end;
$$;

-- Service only. Public ids that must survive a restaurant's deletion because other menus may show them.
create function public.list_shared_asset_ids(p_restaurant_ids uuid[]) returns jsonb
language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(public_id), '[]'::jsonb) from public.media_assets
  where owner_restaurant_id = any(p_restaurant_ids) and visibility = 'PUBLIC';
$$;

create or replace function public.purge_account(p_user_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare owned uuid[];
begin
  if not exists (select 1 from public.profiles where id = p_user_id and deletion_requested_at < now() - interval '14 days') then
    raise exception 'Account is not due for deletion' using errcode = '55000';
  end if;
  select coalesce(array_agg(m.restaurant_id), '{}') into owned from public.memberships m
  where m.user_id = p_user_id and m.role = 'OWNER'
    and not exists (select 1 from public.memberships o where o.restaurant_id = m.restaurant_id and o.role = 'OWNER' and o.user_id <> p_user_id);
  delete from public.media_assets where owner_restaurant_id = any(owned) and visibility <> 'PUBLIC';
  delete from private.menu_uploads where restaurant_id = any(owned) or actor_id = p_user_id;
  delete from public.restaurants where id = any(owned);
  delete from auth.users where id = p_user_id;
end;
$$;

revoke all on function public.admin_set_upload_limit(uuid, integer), public.admin_get_upload_limit(uuid), public.find_reusable_asset(uuid, text),
  public.list_photo_options(uuid, uuid), public.list_shared_asset_ids(uuid[]) from public, anon, authenticated;
revoke all on function public.list_unreferenced_uploads(integer), public.mark_uploads_discarded(uuid[]), public.purge_account(uuid) from public, anon, authenticated;
grant execute on function public.admin_set_upload_limit(uuid, integer), public.admin_get_upload_limit(uuid), public.find_reusable_asset(uuid, text), public.list_photo_options(uuid, uuid) to authenticated;
