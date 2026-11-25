-- RestroFuel POS link: connect once, pull the menu on sync, stage it for the owner (docs/RESTROFUEL-INTEGRATION.md).

alter table public.menu_categories add column external_ref text check (external_ref ~ '^[0-9]{1,18}$'),
  add column external_base jsonb check (external_base is null or jsonb_typeof(external_base) = 'object');
alter table public.menu_items add column external_ref text check (external_ref ~ '^[0-9]{1,18}$'),
  add column external_base jsonb check (external_base is null or jsonb_typeof(external_base) = 'object');
create unique index menu_categories_external_ref_idx on public.menu_categories(restaurant_id, external_ref)
  where external_ref is not null and deleted_at is null;
create unique index menu_items_external_ref_idx on public.menu_items(restaurant_id, external_ref)
  where external_ref is not null and deleted_at is null;

create table private.restrofuel_links (
  restaurant_id uuid primary key references public.restaurants(id) on delete cascade,
  link_id uuid not null unique,
  server_url text not null check (server_url ~ '^https://[a-z0-9.-]+$' and length(server_url) <= 255),
  tenant_slug text not null check (tenant_slug ~ '^[a-z0-9-]{1,63}$'),
  secret_cipher text not null check (length(secret_cipher) <= 1000),
  license_state text not null check (license_state ~ '^[a-z_]{1,30}$'),
  license_checked_at timestamptz not null default now(),
  status text not null default 'ACTIVE' check (status in ('ACTIVE', 'DISCONNECTED')),
  linked_by uuid references auth.users(id) on delete set null,
  linked_at timestamptz not null default now(),
  last_synced_at timestamptz, last_applied_at timestamptz
);
create unique index restrofuel_links_active_slug_idx on private.restrofuel_links(tenant_slug) where status = 'ACTIVE';

create table private.restrofuel_snapshots (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  snapshot jsonb not null check (octet_length(snapshot::text) <= 2097152),
  summary jsonb not null,
  status text not null default 'PENDING' check (status in ('PENDING', 'APPLIED', 'DISMISSED')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz, resolved_by uuid references auth.users(id) on delete set null
);
create unique index restrofuel_snapshots_pending_idx on private.restrofuel_snapshots(restaurant_id) where status = 'PENDING';
create index restrofuel_snapshots_restaurant_idx on private.restrofuel_snapshots(restaurant_id, created_at desc);

alter table private.restrofuel_links enable row level security;
alter table private.restrofuel_snapshots enable row level security;
revoke all on private.restrofuel_links, private.restrofuel_snapshots from public, anon, authenticated;

-- Owner/manager connects a restaurant. A RestroFuel server has one active QR restaurant at a time.
create function public.save_restrofuel_link(p_restaurant_id uuid, p_link_id uuid, p_server_url text, p_tenant_slug text,
  p_secret_cipher text, p_license_state text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare restaurant public.restaurants;
begin
  restaurant := private.lock_menu(p_restaurant_id, true);
  update private.restrofuel_links set status = 'DISCONNECTED'
  where tenant_slug = p_tenant_slug and status = 'ACTIVE' and restaurant_id <> p_restaurant_id;
  delete from private.restrofuel_snapshots where restaurant_id = p_restaurant_id and status = 'PENDING';
  insert into private.restrofuel_links(restaurant_id, link_id, server_url, tenant_slug, secret_cipher, license_state, linked_by)
  values (p_restaurant_id, p_link_id, p_server_url, p_tenant_slug, p_secret_cipher, p_license_state, auth.uid())
  on conflict (restaurant_id) do update set link_id = excluded.link_id, server_url = excluded.server_url,
    tenant_slug = excluded.tenant_slug, secret_cipher = excluded.secret_cipher, license_state = excluded.license_state,
    license_checked_at = now(), status = 'ACTIVE', linked_by = excluded.linked_by, linked_at = now(),
    last_synced_at = null, last_applied_at = null;
  insert into public.audit_events(restaurant_id, actor_id, action, metadata)
  values (p_restaurant_id, auth.uid(), 'restrofuel.connect', jsonb_build_object('server', p_server_url));
  return jsonb_build_object('slug', restaurant.slug, 'previousSlug', restaurant.slug);
end;
$$;

-- What the dashboard shows: the link and the pending update. Never returns the secret.
create function public.get_restrofuel_sync(p_restaurant_id uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare link private.restrofuel_links; pending private.restrofuel_snapshots;
begin
  if not private.is_member(p_restaurant_id) then raise exception 'Not permitted' using errcode = '42501'; end if;
  select * into link from private.restrofuel_links where restaurant_id = p_restaurant_id;
  if not found then return jsonb_build_object('link', null, 'pending', null); end if;
  select * into pending from private.restrofuel_snapshots where restaurant_id = p_restaurant_id and status = 'PENDING';
  return jsonb_build_object(
    'link', jsonb_build_object('serverUrl', link.server_url, 'status', link.status, 'licenseState', link.license_state,
      'licenseCheckedAt', link.license_checked_at, 'linkedAt', link.linked_at, 'lastSyncedAt', link.last_synced_at,
      'lastAppliedAt', link.last_applied_at),
    'pending', case when pending.id is null then null else jsonb_build_object('id', pending.id, 'createdAt', pending.created_at,
      'summary', pending.summary, 'snapshot', pending.snapshot) end);
end;
$$;

-- Synced rows, deleted ones included, so an item the owner deleted is never re-created.
-- Members, or trusted server code (service key, no user).
create function public.get_restrofuel_menu_state(p_restaurant_id uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  if auth.uid() is not null and not private.is_member(p_restaurant_id) then raise exception 'Not permitted' using errcode = '42501'; end if;
  return jsonb_build_object(
    'categories', coalesce((select jsonb_agg(jsonb_build_object('id', c.id, 'ref', c.external_ref, 'base', c.external_base,
      'deleted', c.deleted_at is not null)) from public.menu_categories c
      where c.restaurant_id = p_restaurant_id and c.external_ref is not null), '[]'::jsonb),
    'items', coalesce((select jsonb_agg(jsonb_build_object('id', i.id, 'ref', i.external_ref, 'base', i.external_base,
      'deleted', i.deleted_at is not null)) from public.menu_items i
      where i.restaurant_id = p_restaurant_id and i.external_ref is not null), '[]'::jsonb));
end;
$$;

-- Service only: the link a signed request names.
create function public.get_restrofuel_link(p_link_id uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('restaurantId', restaurant_id, 'linkId', link_id, 'serverUrl', server_url, 'tenantSlug', tenant_slug,
    'secretCipher', secret_cipher, 'status', status)
  from private.restrofuel_links where link_id = p_link_id;
$$;

-- Service only: records a pull. A null snapshot means nothing changed; a new one replaces any pending update.
create function public.stage_restrofuel_snapshot(p_link_id uuid, p_license_state text, p_snapshot jsonb, p_summary jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare link private.restrofuel_links; staged uuid;
begin
  select * into link from private.restrofuel_links where link_id = p_link_id and status = 'ACTIVE' for update;
  if not found then raise exception 'Not connected' using errcode = 'P0002'; end if;
  update private.restrofuel_links set license_state = p_license_state, license_checked_at = now(), last_synced_at = now()
  where restaurant_id = link.restaurant_id;
  if p_snapshot is null then return jsonb_build_object('status', 'up_to_date'); end if;
  delete from private.restrofuel_snapshots where restaurant_id = link.restaurant_id and status = 'PENDING';
  insert into private.restrofuel_snapshots(restaurant_id, snapshot, summary) values (link.restaurant_id, p_snapshot, p_summary)
  returning id into staged;
  return jsonb_build_object('status', 'staged', 'id', staged);
end;
$$;

-- Service only: the restaurant server disconnected.
create function public.end_restrofuel_link(p_link_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare tenant uuid;
begin
  update private.restrofuel_links set status = 'DISCONNECTED' where link_id = p_link_id and status = 'ACTIVE' returning restaurant_id into tenant;
  if tenant is not null then
    delete from private.restrofuel_snapshots where restaurant_id = tenant and status = 'PENDING';
    insert into public.audit_events(restaurant_id, actor_id, action) values (tenant, null, 'restrofuel.disconnectedByServer');
  end if;
end;
$$;

-- Owner/manager disconnects. Returns what the app needs to tell the restaurant server.
create function public.disconnect_restrofuel(p_restaurant_id uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare restaurant public.restaurants; link private.restrofuel_links;
begin
  restaurant := private.lock_menu(p_restaurant_id, true);
  update private.restrofuel_links set status = 'DISCONNECTED' where restaurant_id = p_restaurant_id and status = 'ACTIVE' returning * into link;
  if link.link_id is null then raise exception 'No RestroFuel connection' using errcode = '23514'; end if;
  delete from private.restrofuel_snapshots where restaurant_id = p_restaurant_id and status = 'PENDING';
  insert into public.audit_events(restaurant_id, actor_id, action) values (p_restaurant_id, auth.uid(), 'restrofuel.disconnect');
  return jsonb_build_object('serverUrl', link.server_url, 'secretCipher', link.secret_cipher,
    'slug', restaurant.slug, 'previousSlug', restaurant.slug);
end;
$$;

create function public.dismiss_restrofuel_sync(p_restaurant_id uuid, p_snapshot_id uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare restaurant public.restaurants;
begin
  restaurant := private.lock_menu(p_restaurant_id, true);
  update private.restrofuel_snapshots set status = 'DISMISSED', resolved_at = now(), resolved_by = auth.uid()
  where id = p_snapshot_id and restaurant_id = p_restaurant_id and status = 'PENDING';
  if not found then raise exception 'This RestroFuel update was already handled. Refresh the page' using errcode = '23514'; end if;
  return jsonb_build_object('slug', restaurant.slug, 'previousSlug', restaurant.slug);
end;
$$;

-- Applies a reviewed update in one transaction. Every change goes through mutate_menu, so its
-- permissions, limits and audit apply; this only adds the RestroFuel refs and base values.
create function public.apply_restrofuel_sync(p_restaurant_id uuid, p_snapshot_id uuid, p_plan jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare restaurant public.restaurants; op jsonb; payload jsonb; receipt jsonb; target uuid; created jsonb := '{}'::jsonb;
begin
  restaurant := private.lock_menu(p_restaurant_id, true);
  perform 1 from private.restrofuel_links where restaurant_id = p_restaurant_id and status = 'ACTIVE';
  if not found then raise exception 'No RestroFuel connection' using errcode = '23514'; end if;
  perform 1 from private.restrofuel_snapshots where id = p_snapshot_id and restaurant_id = p_restaurant_id and status = 'PENDING' for update;
  if not found then raise exception 'This RestroFuel update was already handled. Refresh the page' using errcode = '23514'; end if;
  if jsonb_typeof(p_plan) is distinct from 'array' or jsonb_array_length(p_plan) > 5000 then
    raise exception 'Invalid sync plan' using errcode = '23514';
  end if;

  for op in select value from jsonb_array_elements(p_plan) loop
    payload := op->'payload';
    case op->>'op'
    when 'delete' then
      perform public.mutate_menu(p_restaurant_id, 'delete', payload);
    when 'category' then
      receipt := public.mutate_menu(p_restaurant_id, 'saveCategory', payload);
      target := (receipt->>'id')::uuid;
      update public.menu_categories set external_ref = op->>'ref', external_base = op->'base'
      where id = target and restaurant_id = p_restaurant_id;
      created := created || jsonb_build_object(op->>'ref', target);
    when 'item' then
      if not payload ? 'category_id' then
        payload := payload || jsonb_build_object('category_id', created->>(op->>'categoryRef'));
      end if;
      receipt := public.mutate_menu(p_restaurant_id, 'saveItem', payload);
      update public.menu_items set external_ref = op->>'ref', external_base = op->'base'
      where id = (receipt->>'id')::uuid and restaurant_id = p_restaurant_id;
    when 'visibility' then
      perform public.mutate_menu(p_restaurant_id, 'itemVisibility', payload);
      update public.menu_items set external_base = op->'base' where id = (payload->>'id')::uuid and restaurant_id = p_restaurant_id;
    when 'base' then
      if op->>'kind' = 'category' then
        update public.menu_categories set external_ref = op->>'ref', external_base = op->'base'
        where id = (op->>'id')::uuid and restaurant_id = p_restaurant_id and deleted_at is null;
      else
        update public.menu_items set external_ref = op->>'ref', external_base = op->'base'
        where id = (op->>'id')::uuid and restaurant_id = p_restaurant_id and deleted_at is null;
      end if;
      if not found then raise exception 'The menu changed. Refresh before applying' using errcode = '23514'; end if;
    when 'publish' then
      perform public.mutate_menu(p_restaurant_id, 'visibility', jsonb_build_object('published', true));
    else
      raise exception 'Invalid sync plan' using errcode = '23514';
    end case;
  end loop;

  update private.restrofuel_snapshots set status = 'APPLIED', resolved_at = now(), resolved_by = auth.uid() where id = p_snapshot_id;
  update private.restrofuel_links set last_applied_at = now() where restaurant_id = p_restaurant_id;
  insert into public.audit_events(restaurant_id, actor_id, action, metadata)
  values (p_restaurant_id, auth.uid(), 'restrofuel.apply', jsonb_build_object('changes', jsonb_array_length(p_plan)));
  select * into restaurant from public.restaurants where id = p_restaurant_id;
  return jsonb_build_object('slug', restaurant.slug, 'previousSlug', restaurant.slug);
end;
$$;

revoke all on function public.save_restrofuel_link(uuid, uuid, text, text, text, text), public.get_restrofuel_sync(uuid),
  public.get_restrofuel_menu_state(uuid), public.get_restrofuel_link(uuid), public.stage_restrofuel_snapshot(uuid, text, jsonb, jsonb),
  public.end_restrofuel_link(uuid), public.disconnect_restrofuel(uuid), public.dismiss_restrofuel_sync(uuid, uuid),
  public.apply_restrofuel_sync(uuid, uuid, jsonb) from public, anon, authenticated;
grant execute on function public.save_restrofuel_link(uuid, uuid, text, text, text, text), public.get_restrofuel_sync(uuid),
  public.get_restrofuel_menu_state(uuid), public.disconnect_restrofuel(uuid), public.dismiss_restrofuel_sync(uuid, uuid),
  public.apply_restrofuel_sync(uuid, uuid, jsonb) to authenticated;
