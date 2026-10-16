-- Supabase Phase 1. Apply once through the migration tool after inspecting the
-- target project. No existing application tables or customer data are removed.
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to authenticated;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '' check (length(display_name) <= 100),
  created_at timestamptz not null default now()
);

create table public.restaurants (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) between 1 and 100),
  name_ne text check (length(name_ne) <= 100),
  slug text not null unique check (slug ~ '^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$'),
  short_code text not null unique default substr(translate(encode(uuid_send(gen_random_uuid()), 'base64'), '+/', '-_'), 1, 7),
  description text check (length(description) <= 1000),
  logo_public_id text, logo_version bigint,
  cover_public_id text, cover_version bigint,
  theme_color text not null default '#9a3412' check (theme_color ~ '^#[0-9a-fA-F]{6}$'),
  phone text check (length(phone) <= 30), address text check (length(address) <= 300),
  map_url text check (map_url is null or (map_url ~ '^https://' and length(map_url) <= 1000)),
  opening_hours jsonb not null default '{}'::jsonb,
  currency text not null default 'NPR' check (currency = 'NPR'),
  prices_include_vat boolean not null default false,
  vat_percent numeric(5,2) not null default 0 check (vat_percent between 0 and 100),
  service_charge_percent numeric(5,2) not null default 0 check (service_charge_percent between 0 and 100),
  status text not null default 'DRAFT' check (status in ('DRAFT', 'PUBLISHED', 'SUSPENDED')),
  published_at timestamptz, deleted_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  check (short_code ~ '^[A-Za-z0-9_-]{7}$')
);

create table public.memberships (
  user_id uuid not null references auth.users(id) on delete cascade,
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  role text not null check (role in ('OWNER', 'MANAGER', 'EDITOR')),
  created_at timestamptz not null default now(),
  primary key (user_id, restaurant_id)
);
create index memberships_restaurant_idx on public.memberships(restaurant_id, user_id);

create table public.subscriptions (
  restaurant_id uuid primary key references public.restaurants(id) on delete cascade,
  plan text not null default 'starter',
  status text not null default 'TRIAL' check (status in ('TRIAL', 'ACTIVE', 'PAST_DUE', 'CANCELLED')),
  trial_ends_at timestamptz not null default now() + interval '30 days',
  current_period_end timestamptz, editing_locked_at timestamptz,
  last_payment_ref text, notes text,
  created_at timestamptz not null default now()
);

-- A single namespace prevents concurrent reuse of current AND historical slugs.
create table private.slug_reservations (
  slug text primary key,
  restaurant_id uuid not null references public.restaurants(id) on delete cascade deferrable initially deferred
);
create table public.slug_history (
  old_slug text primary key,
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  created_at timestamptz not null default now()
);
create index slug_history_restaurant_idx on public.slug_history(restaurant_id);

create table public.menu_categories (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  name text not null check (length(trim(name)) between 1 and 100), name_ne text,
  sort_order integer not null default 0, is_visible boolean not null default true,
  deleted_at timestamptz, created_at timestamptz not null default now(),
  unique (id, restaurant_id)
);
create index categories_order_idx on public.menu_categories(restaurant_id, sort_order);

create table public.menu_items (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  category_id uuid not null,
  name text not null check (length(trim(name)) between 1 and 150), name_ne text,
  description text check (length(description) <= 1000), description_ne text,
  uses_variants boolean not null default false,
  price_minor integer check (price_minor between 0 and 1000000000),
  image_public_id text, image_version bigint,
  is_available boolean not null default true,
  diet text check (diet in ('VEG', 'NON_VEG', 'EGG')),
  spice_level smallint check (spice_level between 0 and 3),
  is_example_price boolean not null default false,
  sort_order integer not null default 0, deleted_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique (id, restaurant_id),
  foreign key (category_id, restaurant_id) references public.menu_categories(id, restaurant_id),
  check ((uses_variants and price_minor is null) or (not uses_variants and price_minor is not null))
);
create index items_order_idx on public.menu_items(restaurant_id, category_id, sort_order);

create table public.menu_item_variants (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  item_id uuid not null,
  name text not null check (length(trim(name)) between 1 and 100), name_ne text,
  price_minor integer not null check (price_minor between 0 and 1000000000),
  is_available boolean not null default true, sort_order integer not null default 0,
  foreign key (item_id, restaurant_id) references public.menu_items(id, restaurant_id) on delete cascade
);
create index variants_order_idx on public.menu_item_variants(restaurant_id, item_id, sort_order);

create table public.menu_imports (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  source_type text not null check (source_type in ('CSV', 'PASTE', 'TEMPLATE', 'IMAGE', 'PDF')),
  status text not null default 'PENDING' check (status in ('PENDING', 'CONFIRMED', 'FAILED')),
  summary_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index imports_restaurant_idx on public.menu_imports(restaurant_id, created_at);
create table public.audit_events (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid references public.restaurants(id) on delete set null,
  actor_id uuid references auth.users(id) on delete set null,
  action text not null, metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index audit_restaurant_idx on public.audit_events(restaurant_id, created_at);
create table private.super_admins (
  user_id uuid primary key references auth.users(id) on delete cascade
);

create function private.is_member(p_restaurant_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.memberships m
    where m.restaurant_id = p_restaurant_id and m.user_id = (select auth.uid()));
$$;
create function private.can_edit(p_restaurant_id uuid, p_roles text[])
returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.memberships m
    join public.restaurants r on r.id = m.restaurant_id
    join public.subscriptions s on s.restaurant_id = r.id
    where r.id = p_restaurant_id and m.user_id = (select auth.uid()) and m.role = any(p_roles)
      and r.deleted_at is null and r.status <> 'SUSPENDED'
      and (s.editing_locked_at is null or s.editing_locked_at > now()));
$$;
revoke all on function private.is_member(uuid), private.can_edit(uuid,text[]) from public, anon;
grant execute on function private.is_member(uuid), private.can_edit(uuid,text[]) to authenticated;

create function private.guard_restaurant() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.slug = any(array['dashboard','login','register','api','q','admin','settings','pricing','about','help','terms','privacy','setup','auth','onboarding','forgot-password','reset-password','robots','sitemap','www','momo-house']) then
    raise exception 'This address is reserved' using errcode = '23514';
  end if;
  if tg_op = 'UPDATE' and new.short_code <> old.short_code then
    raise exception 'QR short codes cannot be changed' using errcode = '23514';
  end if;
  insert into private.slug_reservations(slug, restaurant_id) values(new.slug, new.id) on conflict do nothing;
  if not exists(select 1 from private.slug_reservations where slug = new.slug and restaurant_id = new.id) then
    raise exception 'This address is already reserved' using errcode = '23505';
  end if;
  if tg_op = 'UPDATE' and old.slug <> new.slug then
    insert into public.slug_history(old_slug, restaurant_id) values(old.slug, new.id) on conflict do nothing;
  end if;
  new.updated_at = now();
  return new;
end;
$$;
revoke all on function private.guard_restaurant() from public, anon, authenticated;
create trigger guard_restaurant before insert or update on public.restaurants
for each row execute function private.guard_restaurant();

-- Deferred checks allow a variant item and its variants to be saved atomically.
create function private.check_item_prices(p_item_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare item public.menu_items; variant_count integer;
begin
  select * into item from public.menu_items where id = p_item_id and deleted_at is null for update;
  if not found then return; end if;
  select count(*) into variant_count from public.menu_item_variants where item_id = item.id;
  if (item.uses_variants and variant_count = 0) or (not item.uses_variants and variant_count > 0) then
    raise exception 'An item must have either one price or at least one variant' using errcode = '23514';
  end if;
end;
$$;
create function private.validate_item_prices() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_table_name = 'menu_items' then
    perform private.check_item_prices(new.id);
  else
    if tg_op <> 'INSERT' then perform private.check_item_prices(old.item_id); end if;
    if tg_op <> 'DELETE' then perform private.check_item_prices(new.item_id); end if;
  end if;
  return null;
end;
$$;
revoke all on function private.check_item_prices(uuid), private.validate_item_prices() from public, anon, authenticated;
create constraint trigger item_price_invariant after insert or update on public.menu_items
deferrable initially deferred for each row execute function private.validate_item_prices();
create constraint trigger variant_price_invariant after insert or update or delete on public.menu_item_variants
deferrable initially deferred for each row execute function private.validate_item_prices();

create function public.create_restaurant(p_name text, p_slug text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare actor uuid := auth.uid(); new_id uuid;
begin
  if actor is null then raise exception 'Sign in first' using errcode = '42501'; end if;
  if not exists(select 1 from auth.users where id = actor and email_confirmed_at is not null) then
    raise exception 'Verify your email first' using errcode = '42501';
  end if;
  if (select count(*) from public.memberships where user_id = actor and role = 'OWNER') >= 10 then
    raise exception 'Restaurant limit reached' using errcode = '23514';
  end if;
  insert into public.profiles(id) values(actor) on conflict do nothing;
  insert into public.restaurants(name, slug) values(trim(p_name), p_slug) returning id into new_id;
  insert into public.memberships(user_id, restaurant_id, role) values(actor, new_id, 'OWNER');
  insert into public.subscriptions(restaurant_id) values(new_id);
  insert into public.audit_events(restaurant_id, actor_id, action) values(new_id, actor, 'restaurant.created');
  return new_id;
end;
$$;
revoke all on function public.create_restaurant(text,text) from public, anon;
grant execute on function public.create_restaurant(text,text) to authenticated;

-- No anonymous table SELECT grants. This projection returns public fields only.
create function public.get_public_menu(p_slug text) returns jsonb
language sql stable security definer set search_path = '' as $$
select case when r.status <> 'PUBLISHED' then jsonb_build_object('status','UNAVAILABLE') else
  jsonb_build_object('id',r.id,'slug',r.slug,'shortCode',r.short_code,'name',r.name,'nameNe',r.name_ne,
    'description',r.description,'address',r.address,'phone',r.phone,'mapUrl',r.map_url,
    'themeColor',r.theme_color,'logoPublicId',r.logo_public_id,'logoVersion',r.logo_version,
    'coverPublicId',r.cover_public_id,'coverVersion',r.cover_version,'openingHours',r.opening_hours,
    'currency',r.currency,'pricesIncludeVat',r.prices_include_vat,'vatPercent',r.vat_percent,
    'serviceChargePercent',r.service_charge_percent,'updatedAt',r.updated_at,'status',r.status,
    'categories',coalesce((select jsonb_agg(jsonb_build_object('id',c.id,'name',c.name,'nameNe',c.name_ne,
      'items',coalesce((select jsonb_agg(jsonb_build_object('id',i.id,'name',i.name,'nameNe',i.name_ne,
        'description',i.description,'descriptionNe',i.description_ne,'priceMinor',i.price_minor,
        'imagePublicId',i.image_public_id,'imageVersion',i.image_version,'isAvailable',i.is_available,
        'diet',i.diet,'spiceLevel',i.spice_level,'variants',coalesce((select jsonb_agg(
          jsonb_build_object('id',v.id,'name',v.name,'nameNe',v.name_ne,'priceMinor',v.price_minor,'isAvailable',v.is_available)
          order by v.sort_order,v.id) from public.menu_item_variants v where v.item_id=i.id and v.restaurant_id=r.id),'[]'::jsonb))
        order by i.sort_order,i.id) from public.menu_items i where i.category_id=c.id and i.restaurant_id=r.id and i.deleted_at is null),'[]'::jsonb))
      order by c.sort_order,c.id) from public.menu_categories c where c.restaurant_id=r.id and c.is_visible and c.deleted_at is null),'[]'::jsonb))
end from public.restaurants r where r.slug=p_slug and r.deleted_at is null;
$$;
create function public.resolve_menu_code(p_code text) returns text
language sql stable security definer set search_path = '' as $$
  select slug from public.restaurants where short_code=p_code and deleted_at is null;
$$;
create function public.resolve_old_slug(p_slug text) returns text
language sql stable security definer set search_path = '' as $$
  select r.slug from public.slug_history h join public.restaurants r on r.id=h.restaurant_id
    where h.old_slug=p_slug and r.slug<>p_slug and r.deleted_at is null;
$$;
revoke all on function public.get_public_menu(text), public.resolve_menu_code(text), public.resolve_old_slug(text) from public;
grant execute on function public.get_public_menu(text), public.resolve_menu_code(text), public.resolve_old_slug(text) to anon, authenticated;

-- Every exposed table gets explicit grants and RLS together. Helpers are private,
-- use fixed search paths, and avoid recursive membership policies.
do $$
declare table_name text;
begin
  foreach table_name in array array['profiles','restaurants','memberships','subscriptions','slug_history','menu_categories','menu_items','menu_item_variants','menu_imports','audit_events'] loop
    execute format('alter table public.%I enable row level security',table_name);
    execute format('revoke all on table public.%I from anon, authenticated',table_name);
  end loop;
end;
$$;
revoke all on all tables in schema private from public, anon, authenticated;
alter table private.super_admins enable row level security;
alter table private.slug_reservations enable row level security;
grant select on public.profiles, public.restaurants, public.memberships, public.slug_history,
  public.menu_categories, public.menu_items, public.menu_item_variants, public.menu_imports, public.audit_events to authenticated;
grant update(display_name) on public.profiles to authenticated;
grant select(restaurant_id,plan,status,trial_ends_at,current_period_end,editing_locked_at) on public.subscriptions to authenticated;
grant update(name,name_ne,slug,description,theme_color,phone,address,map_url,opening_hours,prices_include_vat,vat_percent,service_charge_percent) on public.restaurants to authenticated;
grant insert,update,delete on public.menu_categories,public.menu_items,public.menu_item_variants,public.menu_imports to authenticated;

create policy profile_read on public.profiles for select to authenticated using (id=(select auth.uid()));
create policy profile_update on public.profiles for update to authenticated using (id=(select auth.uid())) with check (id=(select auth.uid()));
create policy restaurant_read on public.restaurants for select to authenticated using (private.is_member(id));
create policy restaurant_update on public.restaurants for update to authenticated
  using (private.can_edit(id,array['OWNER','MANAGER'])) with check (private.can_edit(id,array['OWNER','MANAGER']));
create policy membership_read on public.memberships for select to authenticated using (user_id=(select auth.uid()));
create policy subscription_read on public.subscriptions for select to authenticated using (private.is_member(restaurant_id));
create policy history_read on public.slug_history for select to authenticated using (private.is_member(restaurant_id));
create policy audit_read on public.audit_events for select to authenticated using (private.is_member(restaurant_id));

do $$
declare table_name text;
begin
  foreach table_name in array array['menu_categories','menu_items','menu_item_variants','menu_imports'] loop
    execute format('create policy tenant_read on public.%I for select to authenticated using (private.is_member(restaurant_id))',table_name);
    execute format('create policy tenant_insert on public.%I for insert to authenticated with check (private.can_edit(restaurant_id,array[''OWNER'',''MANAGER'',''EDITOR'']))',table_name);
    execute format('create policy tenant_update on public.%I for update to authenticated using (private.can_edit(restaurant_id,array[''OWNER'',''MANAGER'',''EDITOR''])) with check (private.can_edit(restaurant_id,array[''OWNER'',''MANAGER'',''EDITOR'']))',table_name);
    execute format('create policy tenant_delete on public.%I for delete to authenticated using (private.can_edit(restaurant_id,array[''OWNER'',''MANAGER'',''EDITOR'']))',table_name);
  end loop;
end;
$$;

comment on function public.create_restaurant(text,text) is 'Atomic onboarding; identity derived from auth.uid(), never a caller-supplied user or role.';
comment on function public.get_public_menu(text) is 'Anonymous-safe projection; internal billing, membership, and user data are excluded.';
