-- Super-admin portal, QR scan counters and terms consent.
-- Add the first admin manually: insert into private.super_admins(user_id) values('<auth user id>');
create function private.is_super_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists(select 1 from private.super_admins where user_id = (select auth.uid()));
$$;
revoke all on function private.is_super_admin() from public, anon;
grant execute on function private.is_super_admin() to authenticated;

create function private.assert_super_admin() returns void
language plpgsql stable security definer set search_path = '' as $$
begin
  if not private.is_super_admin() then raise exception 'Not permitted' using errcode = '42501'; end if;
end;
$$;
revoke all on function private.assert_super_admin() from public, anon, authenticated;

-- Super admins act as a member of every restaurant and bypass suspension/editing locks.
create or replace function private.is_member(p_restaurant_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select private.is_super_admin() or exists(select 1 from public.memberships m
    where m.restaurant_id = p_restaurant_id and m.user_id = (select auth.uid()));
$$;
create or replace function private.can_edit(p_restaurant_id uuid, p_roles text[])
returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.memberships m
    join public.restaurants r on r.id = m.restaurant_id
    join public.subscriptions s on s.restaurant_id = r.id
    where r.id = p_restaurant_id and m.user_id = (select auth.uid()) and m.role = any(p_roles)
      and r.deleted_at is null and r.status <> 'SUSPENDED'
      and (s.editing_locked_at is null or s.editing_locked_at > now()))
  or (private.is_super_admin() and exists(select 1 from public.restaurants r where r.id = p_restaurant_id and r.deleted_at is null));
$$;

create function public.is_super_admin() returns boolean
language sql stable security definer set search_path = '' as $$ select private.is_super_admin(); $$;
revoke all on function public.is_super_admin() from public, anon;
grant execute on function public.is_super_admin() to authenticated;

-- Terms consent is captured from sign-up metadata once, when the auth user is created.
alter table public.profiles add column terms_version text check (terms_version ~ '^\d{4}-\d{2}-\d{2}$'),
  add column terms_accepted_at timestamptz;
create function private.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
declare version text := new.raw_user_meta_data->>'terms_version';
begin
  if version !~ '^\d{4}-\d{2}-\d{2}$' then version := null; end if;
  insert into public.profiles(id, terms_version, terms_accepted_at)
  values(new.id, version, case when version is not null then now() end)
  on conflict (id) do nothing;
  return new;
end;
$$;
revoke all on function private.handle_new_user() from public, anon, authenticated;
create trigger on_auth_user_created after insert on auth.users
for each row execute function private.handle_new_user();

create function private.local_day() returns date
language sql stable set search_path = '' as $$ select (now() at time zone 'Asia/Kathmandu')::date; $$;

create table public.menu_scan_days (
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  day date not null,
  scans integer not null default 0 check (scans >= 0),
  primary key (restaurant_id, day)
);
create index menu_scan_days_day_idx on public.menu_scan_days(day);
alter table public.menu_scan_days enable row level security;
revoke all on public.menu_scan_days from anon, authenticated;

create function public.record_menu_scan(p_code text) returns void
language sql security definer set search_path = '' as $$
  insert into public.menu_scan_days(restaurant_id, day, scans)
  select id, private.local_day(), 1 from public.restaurants where short_code = p_code and deleted_at is null
  on conflict (restaurant_id, day) do update set scans = public.menu_scan_days.scans + 1;
$$;
revoke all on function public.record_menu_scan(text) from public;
grant execute on function public.record_menu_scan(text) to anon, authenticated;

create table private.restaurant_suspensions (
  restaurant_id uuid primary key references public.restaurants(id) on delete cascade,
  previous_status text not null check (previous_status in ('DRAFT', 'PUBLISHED')),
  created_at timestamptz not null default now()
);
alter table private.restaurant_suspensions enable row level security;
revoke all on private.restaurant_suspensions from public, anon, authenticated;

create index audit_created_idx on public.audit_events(created_at desc, id desc);

create function private.like_pattern(p_search text) returns text
language sql immutable set search_path = '' as $$
  select case when nullif(trim(p_search), '') is null then null
    else '%' || replace(replace(replace(left(trim(p_search), 100), '\', '\\'), '%', '\%'), '_', '\_') || '%' end;
$$;

create function public.admin_overview() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare today date := private.local_day();
begin
  perform private.assert_super_admin();
  return jsonb_build_object(
    'users', (select jsonb_build_object('total', count(*), 'verified', count(*) filter (where email_confirmed_at is not null),
      'banned', count(*) filter (where banned_until > now()),
      'new7', count(*) filter (where created_at > now() - interval '7 days'),
      'new30', count(*) filter (where created_at > now() - interval '30 days')) from auth.users),
    'restaurants', (select jsonb_build_object('total', count(*), 'published', count(*) filter (where status = 'PUBLISHED'),
      'draft', count(*) filter (where status = 'DRAFT'), 'suspended', count(*) filter (where status = 'SUSPENDED'),
      'new7', count(*) filter (where created_at > now() - interval '7 days'),
      'new30', count(*) filter (where created_at > now() - interval '30 days')) from public.restaurants where deleted_at is null),
    'scans', (select jsonb_build_object('today', coalesce(sum(scans) filter (where day = today), 0),
      'week', coalesce(sum(scans) filter (where day > today - 7), 0), 'month', coalesce(sum(scans), 0))
      from public.menu_scan_days where day > today - 30),
    'items', (select count(*) from public.menu_items where deleted_at is null));
end;
$$;

create function public.admin_list_users(p_search text, p_page integer, p_page_size integer) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare pattern text := private.like_pattern(p_search);
  size integer := least(greatest(coalesce(p_page_size, 20), 1), 50);
  skip integer := (greatest(coalesce(p_page, 1), 1) - 1) * size;
  result jsonb;
begin
  perform private.assert_super_admin();
  with matched as (
    select u.id, u.email, u.created_at, u.last_sign_in_at, u.email_confirmed_at, u.banned_until from auth.users u
    where pattern is null or u.email ilike pattern or exists(select 1 from public.memberships m
      join public.restaurants r on r.id = m.restaurant_id
      where m.user_id = u.id and (r.name ilike pattern or r.slug ilike pattern))
  ), page as (select * from matched order by created_at desc, id limit size offset skip)
  select jsonb_build_object('total', (select count(*) from matched), 'rows', coalesce((select jsonb_agg(jsonb_build_object(
    'id', p.id, 'email', p.email, 'createdAt', p.created_at, 'lastSignInAt', p.last_sign_in_at,
    'emailConfirmedAt', p.email_confirmed_at, 'bannedUntil', p.banned_until,
    'isSuperAdmin', exists(select 1 from private.super_admins a where a.user_id = p.id),
    'restaurantCount', (select count(*) from public.memberships m where m.user_id = p.id)
  ) order by p.created_at desc, p.id) from page p), '[]'::jsonb)) into result;
  return result;
end;
$$;

create function public.admin_list_restaurants(p_search text, p_status text, p_page integer, p_page_size integer) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare pattern text := private.like_pattern(p_search);
  size integer := least(greatest(coalesce(p_page_size, 20), 1), 50);
  skip integer := (greatest(coalesce(p_page, 1), 1) - 1) * size;
  since date := private.local_day() - 30;
  result jsonb;
begin
  perform private.assert_super_admin();
  with matched as (
    select r.id, r.name, r.slug, r.short_code, r.status, r.created_at, r.updated_at from public.restaurants r
    where r.deleted_at is null and (p_status is null or r.status = p_status)
      and (pattern is null or r.name ilike pattern or r.slug ilike pattern or r.short_code = trim(p_search))
  ), page as (select * from matched order by created_at desc, id limit size offset skip)
  select jsonb_build_object('total', (select count(*) from matched), 'rows', coalesce((select jsonb_agg(jsonb_build_object(
    'id', p.id, 'name', p.name, 'slug', p.slug, 'shortCode', p.short_code, 'status', p.status,
    'createdAt', p.created_at, 'updatedAt', p.updated_at,
    'ownerEmail', (select u.email from public.memberships m join auth.users u on u.id = m.user_id
      where m.restaurant_id = p.id and m.role = 'OWNER' order by m.created_at limit 1),
    'categoryCount', (select count(*) from public.menu_categories c where c.restaurant_id = p.id and c.deleted_at is null),
    'itemCount', (select count(*) from public.menu_items i where i.restaurant_id = p.id and i.deleted_at is null),
    'scans30', (select coalesce(sum(s.scans), 0) from public.menu_scan_days s where s.restaurant_id = p.id and s.day > since)
  ) order by p.created_at desc, p.id) from page p), '[]'::jsonb)) into result;
  return result;
end;
$$;

create function public.admin_get_user(p_user_id uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare result jsonb;
begin
  perform private.assert_super_admin();
  select jsonb_build_object('id', u.id, 'email', u.email, 'createdAt', u.created_at, 'lastSignInAt', u.last_sign_in_at,
    'emailConfirmedAt', u.email_confirmed_at, 'bannedUntil', u.banned_until,
    'isSuperAdmin', exists(select 1 from private.super_admins a where a.user_id = u.id),
    'termsVersion', p.terms_version, 'termsAcceptedAt', p.terms_accepted_at,
    'restaurants', coalesce((select jsonb_agg(jsonb_build_object('id', r.id, 'name', r.name, 'slug', r.slug, 'status', r.status, 'role', m.role)
      order by m.created_at) from public.memberships m join public.restaurants r on r.id = m.restaurant_id
      where m.user_id = u.id and r.deleted_at is null), '[]'::jsonb))
  into result from auth.users u left join public.profiles p on p.id = u.id where u.id = p_user_id;
  return result;
end;
$$;

create function public.admin_get_restaurant(p_restaurant_id uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare today date := private.local_day(); result jsonb;
begin
  perform private.assert_super_admin();
  select jsonb_build_object('id', r.id, 'name', r.name, 'nameNe', r.name_ne, 'slug', r.slug, 'shortCode', r.short_code,
    'status', r.status, 'description', r.description, 'phone', r.phone, 'address', r.address,
    'createdAt', r.created_at, 'updatedAt', r.updated_at, 'publishedAt', r.published_at,
    'subscription', (select jsonb_build_object('plan', s.plan, 'status', s.status, 'trialEndsAt', s.trial_ends_at)
      from public.subscriptions s where s.restaurant_id = r.id),
    'members', coalesce((select jsonb_agg(jsonb_build_object('userId', m.user_id, 'email', u.email, 'role', m.role) order by m.created_at)
      from public.memberships m join auth.users u on u.id = m.user_id where m.restaurant_id = r.id), '[]'::jsonb),
    'categoryCount', (select count(*) from public.menu_categories c where c.restaurant_id = r.id and c.deleted_at is null),
    'itemCount', (select count(*) from public.menu_items i where i.restaurant_id = r.id and i.deleted_at is null),
    'scans', (select jsonb_build_object('today', coalesce(sum(scans) filter (where day = today), 0),
      'week', coalesce(sum(scans) filter (where day > today - 7), 0),
      'month', coalesce(sum(scans) filter (where day > today - 30), 0), 'total', coalesce(sum(scans), 0))
      from public.menu_scan_days where restaurant_id = r.id))
  into result from public.restaurants r where r.id = p_restaurant_id and r.deleted_at is null;
  return result;
end;
$$;

-- Keyset pagination keeps the activity feed cheap at any depth.
create function public.admin_list_events(p_restaurant_id uuid, p_before_at timestamptz, p_before_id uuid, p_limit integer) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare size integer := least(greatest(coalesce(p_limit, 25), 1), 50); result jsonb;
begin
  perform private.assert_super_admin();
  with page as (
    select e.* from public.audit_events e
    where (p_restaurant_id is null or e.restaurant_id = p_restaurant_id)
      and (p_before_at is null or (e.created_at, e.id) < (p_before_at, coalesce(p_before_id, 'ffffffff-ffff-ffff-ffff-ffffffffffff'::uuid)))
    order by e.created_at desc, e.id desc limit size
  )
  select coalesce(jsonb_agg(jsonb_build_object('id', p.id, 'action', p.action, 'createdAt', p.created_at, 'metadata', p.metadata,
    'restaurantId', p.restaurant_id, 'restaurantName', r.name, 'actorEmail', u.email) order by p.created_at desc, p.id desc), '[]'::jsonb)
  into result from page p left join public.restaurants r on r.id = p.restaurant_id left join auth.users u on u.id = p.actor_id;
  return result;
end;
$$;

create function public.admin_set_restaurant_suspended(p_restaurant_id uuid, p_suspended boolean) returns text
language plpgsql security definer set search_path = '' as $$
declare restaurant public.restaurants; restored text;
begin
  perform private.assert_super_admin();
  select * into restaurant from public.restaurants where id = p_restaurant_id and deleted_at is null for update;
  if not found then raise exception 'Restaurant not found' using errcode = 'P0002'; end if;
  if p_suspended and restaurant.status <> 'SUSPENDED' then
    insert into private.restaurant_suspensions(restaurant_id, previous_status) values(restaurant.id, restaurant.status)
    on conflict (restaurant_id) do update set previous_status = excluded.previous_status, created_at = now();
    update public.restaurants set status = 'SUSPENDED' where id = restaurant.id;
  elsif not p_suspended and restaurant.status = 'SUSPENDED' then
    delete from private.restaurant_suspensions where restaurant_id = restaurant.id returning previous_status into restored;
    update public.restaurants set status = coalesce(restored, 'DRAFT') where id = restaurant.id;
  else
    return restaurant.slug;
  end if;
  insert into public.audit_events(restaurant_id, actor_id, action)
  values(restaurant.id, auth.uid(), case when p_suspended then 'admin.restaurant.suspended' else 'admin.restaurant.restored' end);
  return restaurant.slug;
end;
$$;

-- Account changes go through the Auth admin API; this records them in the shared audit trail.
create function public.admin_log_user_action(p_user_id uuid, p_action text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform private.assert_super_admin();
  if p_action not in ('admin.user.password_set', 'admin.user.banned', 'admin.user.unbanned', 'admin.user.reset_sent') then
    raise exception 'Invalid action' using errcode = '23514';
  end if;
  insert into public.audit_events(actor_id, action, metadata)
  select auth.uid(), p_action, jsonb_build_object('userId', u.id, 'email', u.email) from auth.users u where u.id = p_user_id;
end;
$$;

revoke all on function public.admin_overview(), public.admin_list_users(text,integer,integer),
  public.admin_list_restaurants(text,text,integer,integer), public.admin_get_user(uuid), public.admin_get_restaurant(uuid),
  public.admin_list_events(uuid,timestamptz,uuid,integer), public.admin_set_restaurant_suspended(uuid,boolean),
  public.admin_log_user_action(uuid,text) from public, anon;
grant execute on function public.admin_overview(), public.admin_list_users(text,integer,integer),
  public.admin_list_restaurants(text,text,integer,integer), public.admin_get_user(uuid), public.admin_get_restaurant(uuid),
  public.admin_list_events(uuid,timestamptz,uuid,integer), public.admin_set_restaurant_suspended(uuid,boolean),
  public.admin_log_user_action(uuid,text) to authenticated;
