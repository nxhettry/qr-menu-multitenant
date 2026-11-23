-- Phase 5 reliability: rate limiting, account deletion/export, abuse reports and upload cleanup.
-- Functions marked "service only" are callable solely with the server-side secret key.

-- Fixed-window counters. The key is chosen by trusted server code, never by the browser.
create table private.rate_limits (
  key text not null check (length(key) between 1 and 200),
  window_start timestamptz not null,
  hits integer not null default 0,
  primary key (key, window_start)
);
alter table private.rate_limits enable row level security;
revoke all on private.rate_limits from public, anon, authenticated;

-- Service only. Returns 0 when allowed, otherwise the seconds until the window resets.
create function public.rate_limit_hit(p_key text, p_limit integer, p_window_seconds integer) returns integer
language plpgsql security definer set search_path = '' as $$
declare bucket timestamptz; used integer;
begin
  if length(coalesce(p_key, '')) not between 1 and 200 or p_limit < 1 or p_window_seconds < 1 then
    raise exception 'Invalid rate limit' using errcode = '22023';
  end if;
  bucket := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);
  insert into private.rate_limits(key, window_start, hits) values(p_key, bucket, 1)
  on conflict (key, window_start) do update set hits = private.rate_limits.hits + 1
  returning hits into used;
  if used <= p_limit then return 0; end if;
  return greatest(1, ceil(extract(epoch from bucket + make_interval(secs => p_window_seconds) - now()))::integer);
end;
$$;

-- Service only. Housekeeping that needs no external calls.
create function public.run_maintenance() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare limits_removed integer;
begin
  delete from private.rate_limits where window_start < now() - interval '1 day';
  get diagnostics limits_removed = row_count;
  return jsonb_build_object('rateLimitsRemoved', limits_removed);
end;
$$;

-- Uploads that never became (or are no longer) a logo, cover or item image.
alter table private.menu_uploads add column discarded_at timestamptz;

-- Service only. Lists Cloudinary assets that can be deleted; mark them afterwards.
create function public.list_unreferenced_uploads(p_limit integer) returns jsonb
language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', x.id, 'publicId', x.public_id)), '[]'::jsonb)
  from (
    select u.id, 'qrmenu/' || u.restaurant_id::text || '/' || u.id::text as public_id
    from private.menu_uploads u
    where u.discarded_at is null and u.created_at < now() - interval '1 hour'
      and not exists (select 1 from public.restaurants r
        where r.id = u.restaurant_id and 'qrmenu/' || u.restaurant_id::text || '/' || u.id::text in (r.logo_public_id, r.cover_public_id))
      and not exists (select 1 from public.menu_items i
        where i.restaurant_id = u.restaurant_id and i.image_public_id = 'qrmenu/' || u.restaurant_id::text || '/' || u.id::text)
    order by u.created_at limit least(greatest(coalesce(p_limit, 50), 1), 200)
  ) x;
$$;

create function public.mark_uploads_discarded(p_ids uuid[]) returns integer
language plpgsql security definer set search_path = '' as $$
declare marked integer;
begin
  update private.menu_uploads set discarded_at = now() where id = any(p_ids) and discarded_at is null;
  get diagnostics marked = row_count;
  return marked;
end;
$$;

-- Account deletion with a 14-day grace period. Restaurants the user solely owns are hidden at once
-- and their web addresses are released immediately; printed QR codes use short codes and keep working
-- if the request is cancelled.
alter table public.profiles add column deletion_requested_at timestamptz;

create function public.request_account_deletion() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare actor uuid := auth.uid(); target record; placeholder text; released jsonb := '[]'::jsonb;
begin
  if actor is null then raise exception 'Sign in first' using errcode = '42501'; end if;
  insert into public.profiles(id) values(actor) on conflict do nothing;
  update public.profiles set deletion_requested_at = coalesce(deletion_requested_at, now()) where id = actor;
  for target in
    select r.id, r.slug from public.restaurants r join public.memberships m on m.restaurant_id = r.id
    where m.user_id = actor and m.role = 'OWNER' and r.deleted_at is null
      and not exists (select 1 from public.memberships o where o.restaurant_id = r.id and o.role = 'OWNER' and o.user_id <> actor)
    order by r.id for update of r
  loop
    placeholder := 'removed-' || substr(replace(target.id::text, '-', ''), 1, 12);
    update public.restaurants set deleted_at = now(), slug = placeholder,
      status = case when status = 'SUSPENDED' then status else 'DRAFT' end where id = target.id;
    delete from public.slug_history where restaurant_id = target.id;
    delete from private.slug_reservations where restaurant_id = target.id and slug <> placeholder;
    released := released || jsonb_build_object('id', target.id, 'slug', target.slug);
  end loop;
  insert into public.audit_events(actor_id, action, metadata)
  values(actor, 'account.deletion_requested', jsonb_build_object('restaurants', jsonb_array_length(released)));
  return released;
end;
$$;

create function public.cancel_account_deletion() returns integer
language plpgsql security definer set search_path = '' as $$
declare actor uuid := auth.uid(); requested timestamptz; restored integer;
begin
  if actor is null then raise exception 'Sign in first' using errcode = '42501'; end if;
  select deletion_requested_at into requested from public.profiles where id = actor for update;
  if requested is null then return 0; end if;
  update public.restaurants r set deleted_at = null
  where r.deleted_at >= requested and r.slug like 'removed-%'
    and exists (select 1 from public.memberships m where m.restaurant_id = r.id and m.user_id = actor and m.role = 'OWNER');
  get diagnostics restored = row_count;
  update public.profiles set deletion_requested_at = null where id = actor;
  insert into public.audit_events(actor_id, action, metadata)
  values(actor, 'account.deletion_cancelled', jsonb_build_object('restaurants', restored));
  return restored;
end;
$$;

-- Service only. Accounts whose grace period ended, with the restaurants they solely own.
create function public.list_accounts_due_for_purge(p_limit integer) returns jsonb
language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object('userId', x.id, 'restaurantIds', x.restaurant_ids)), '[]'::jsonb)
  from (
    select p.id, coalesce((select jsonb_agg(m.restaurant_id) from public.memberships m
      where m.user_id = p.id and m.role = 'OWNER'
        and not exists (select 1 from public.memberships o where o.restaurant_id = m.restaurant_id and o.role = 'OWNER' and o.user_id <> p.id)), '[]'::jsonb) as restaurant_ids
    from public.profiles p
    where p.deletion_requested_at < now() - interval '14 days'
    order by p.deletion_requested_at limit least(greatest(coalesce(p_limit, 10), 1), 50)
  ) x;
$$;

-- Service only. Permanently removes the account and the restaurants it solely owns.
create function public.purge_account(p_user_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare owned uuid[];
begin
  if not exists (select 1 from public.profiles where id = p_user_id and deletion_requested_at < now() - interval '14 days') then
    raise exception 'Account is not due for deletion' using errcode = '55000';
  end if;
  select coalesce(array_agg(m.restaurant_id), '{}') into owned from public.memberships m
  where m.user_id = p_user_id and m.role = 'OWNER'
    and not exists (select 1 from public.memberships o where o.restaurant_id = m.restaurant_id and o.role = 'OWNER' and o.user_id <> p_user_id);
  delete from private.menu_uploads where restaurant_id = any(owned) or actor_id = p_user_id;
  delete from public.restaurants where id = any(owned);
  delete from auth.users where id = p_user_id;
end;
$$;

-- Everything the signed-in user can take with them, as one JSON document.
create function public.export_account_data() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare actor uuid := auth.uid(); result jsonb;
begin
  if actor is null then raise exception 'Sign in first' using errcode = '42501'; end if;
  select jsonb_build_object('exportedAt', now(),
    'account', jsonb_build_object('id', u.id, 'email', u.email, 'createdAt', u.created_at,
      'displayName', p.display_name, 'termsVersion', p.terms_version, 'termsAcceptedAt', p.terms_accepted_at),
    'restaurants', coalesce((select jsonb_agg(jsonb_build_object(
      'id', r.id, 'role', m.role, 'name', r.name, 'nameNe', r.name_ne, 'slug', r.slug, 'shortCode', r.short_code,
      'status', r.status, 'description', r.description, 'phone', r.phone, 'address', r.address, 'mapUrl', r.map_url,
      'openingHours', r.opening_hours, 'themeColor', r.theme_color, 'pricesIncludeVat', r.prices_include_vat,
      'vatPercent', r.vat_percent, 'serviceChargePercent', r.service_charge_percent, 'createdAt', r.created_at,
      'categories', coalesce((select jsonb_agg(jsonb_build_object('id', c.id, 'name', c.name, 'nameNe', c.name_ne,
        'isVisible', c.is_visible, 'items', coalesce((select jsonb_agg(jsonb_build_object('id', i.id, 'name', i.name,
          'nameNe', i.name_ne, 'description', i.description, 'descriptionNe', i.description_ne, 'priceMinor', i.price_minor,
          'isAvailable', i.is_available, 'diet', i.diet, 'spiceLevel', i.spice_level,
          'variants', coalesce((select jsonb_agg(jsonb_build_object('name', v.name, 'nameNe', v.name_ne,
            'priceMinor', v.price_minor, 'isAvailable', v.is_available) order by v.sort_order, v.id)
            from public.menu_item_variants v where v.item_id = i.id and v.restaurant_id = r.id), '[]'::jsonb))
          order by i.sort_order, i.id) from public.menu_items i
          where i.category_id = c.id and i.restaurant_id = r.id and i.deleted_at is null), '[]'::jsonb))
        order by c.sort_order, c.id) from public.menu_categories c
        where c.restaurant_id = r.id and c.deleted_at is null), '[]'::jsonb))
      order by r.created_at)
      from public.memberships m join public.restaurants r on r.id = m.restaurant_id
      where m.user_id = actor and r.deleted_at is null), '[]'::jsonb))
  into result from auth.users u left join public.profiles p on p.id = u.id where u.id = actor;
  return result;
end;
$$;

-- Abuse reports are written through the rate-limited server route and reviewed by super admins.
create table public.abuse_reports (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  reason text not null check (reason in ('INAPPROPRIATE', 'MISLEADING', 'COPYRIGHT', 'SPAM', 'OTHER')),
  details text not null default '' check (length(details) <= 1000),
  contact text check (length(contact) <= 200),
  status text not null default 'OPEN' check (status in ('OPEN', 'RESOLVED', 'DISMISSED')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references auth.users(id) on delete set null
);
create index abuse_reports_status_idx on public.abuse_reports(status, created_at desc);
alter table public.abuse_reports enable row level security;
revoke all on public.abuse_reports from public, anon, authenticated;

-- Service only. Returns false when the menu is not published.
create function public.report_menu(p_slug text, p_reason text, p_details text, p_contact text) returns boolean
language plpgsql security definer set search_path = '' as $$
declare target uuid;
begin
  select id into target from public.restaurants where slug = p_slug and status = 'PUBLISHED' and deleted_at is null;
  if target is null then return false; end if;
  insert into public.abuse_reports(restaurant_id, reason, details, contact)
  values(target, p_reason, left(coalesce(p_details, ''), 1000), nullif(left(trim(coalesce(p_contact, '')), 200), ''));
  return true;
end;
$$;

create function public.admin_list_abuse_reports(p_status text, p_page integer, p_page_size integer) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare size integer := least(greatest(coalesce(p_page_size, 20), 1), 50);
  skip integer := (greatest(coalesce(p_page, 1), 1) - 1) * size; result jsonb;
begin
  perform private.assert_super_admin();
  with matched as (
    select a.*, r.name as restaurant_name, r.slug as restaurant_slug from public.abuse_reports a
    join public.restaurants r on r.id = a.restaurant_id
    where p_status is null or a.status = p_status
  ), page as (select * from matched order by created_at desc, id limit size offset skip)
  select jsonb_build_object('total', (select count(*) from matched), 'rows', coalesce((select jsonb_agg(jsonb_build_object(
    'id', p.id, 'restaurantId', p.restaurant_id, 'restaurantName', p.restaurant_name, 'restaurantSlug', p.restaurant_slug,
    'reason', p.reason, 'details', p.details, 'contact', p.contact, 'status', p.status,
    'createdAt', p.created_at, 'resolvedAt', p.resolved_at) order by p.created_at desc, p.id) from page p), '[]'::jsonb))
  into result;
  return result;
end;
$$;

create function public.admin_resolve_abuse_report(p_id uuid, p_status text) returns void
language plpgsql security definer set search_path = '' as $$
declare report public.abuse_reports;
begin
  perform private.assert_super_admin();
  if p_status not in ('OPEN', 'RESOLVED', 'DISMISSED') then raise exception 'Invalid status' using errcode = '23514'; end if;
  update public.abuse_reports set status = p_status, resolved_at = case when p_status = 'OPEN' then null else now() end,
    resolved_by = case when p_status = 'OPEN' then null else auth.uid() end
  where id = p_id returning * into report;
  if not found then raise exception 'Report not found' using errcode = 'P0002'; end if;
  insert into public.audit_events(restaurant_id, actor_id, action, metadata)
  values(report.restaurant_id, auth.uid(), 'admin.abuse_report.' || lower(p_status), jsonb_build_object('reportId', report.id));
end;
$$;

revoke all on function public.rate_limit_hit(text,integer,integer), public.run_maintenance(),
  public.list_unreferenced_uploads(integer), public.mark_uploads_discarded(uuid[]),
  public.list_accounts_due_for_purge(integer), public.purge_account(uuid),
  public.report_menu(text,text,text,text), public.request_account_deletion(), public.cancel_account_deletion(),
  public.export_account_data(), public.admin_list_abuse_reports(text,integer,integer),
  public.admin_resolve_abuse_report(uuid,text) from public, anon, authenticated;
grant execute on function public.request_account_deletion(), public.cancel_account_deletion(), public.export_account_data(),
  public.admin_list_abuse_reports(text,integer,integer), public.admin_resolve_abuse_report(uuid,text) to authenticated;
