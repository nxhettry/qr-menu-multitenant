-- Phase 4C: curated photos that super admins attach to a dish, public from the start.
create unique index media_assets_curated_hash_idx on public.media_assets(sha256) where owner_restaurant_id is null;

create function public.admin_add_curated_photo(p_dish_id uuid, p_public_id text, p_version bigint, p_width integer, p_height integer, p_sha256 text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare asset public.media_assets;
begin
  perform private.assert_super_admin();
  if not exists (select 1 from public.dishes where id = p_dish_id) then raise exception 'Dish not found' using errcode = 'P0002'; end if;
  if p_public_id !~ ('^library/' || p_dish_id::text || '/[a-f0-9-]{36}$') then raise exception 'Invalid photo' using errcode = '23514'; end if;
  insert into public.media_assets(public_id, version, width, height, sha256, source, owner_restaurant_id, visibility, dish_id)
  values(p_public_id, p_version, p_width, p_height, p_sha256, 'CURATED', null, 'PUBLIC', p_dish_id)
  on conflict do nothing returning * into asset;
  if asset.id is null then return jsonb_build_object('duplicate', true); end if;
  insert into public.audit_events(restaurant_id, actor_id, action, metadata)
  values(null, auth.uid(), 'admin.photo.curated', jsonb_build_object('assetId', asset.id, 'dishId', p_dish_id));
  return jsonb_build_object('duplicate', false, 'id', asset.id);
end;
$$;

create function public.admin_list_dish_photos(p_dish_id uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  perform private.assert_super_admin();
  return coalesce((select jsonb_agg(jsonb_build_object('id', a.id, 'publicId', a.public_id, 'version', a.version, 'source', a.source) order by a.created_at, a.id)
    from public.media_assets a where a.dish_id = p_dish_id and a.visibility = 'PUBLIC'), '[]'::jsonb);
end;
$$;

-- Curated photos can be removed from the library the same way shared ones are.
create or replace function public.admin_review_photo(p_id uuid, p_decision text, p_dish_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare asset public.media_assets; dish uuid;
begin
  perform private.assert_super_admin();
  if p_decision not in ('APPROVE', 'REJECT') then raise exception 'Invalid decision' using errcode = '23514'; end if;
  select * into asset from public.media_assets where id = p_id and visibility in ('PENDING', 'PUBLIC', 'REJECTED') for update;
  if not found then raise exception 'Photo not found' using errcode = 'P0002'; end if;
  dish := coalesce(p_dish_id, asset.dish_id);
  if p_decision = 'APPROVE' and (dish is null or not exists (select 1 from public.dishes where id = dish and status = 'ACTIVE')) then
    raise exception 'Choose a dish for this photo' using errcode = '23514';
  end if;
  update public.media_assets set visibility = case when p_decision = 'APPROVE' then 'PUBLIC' else 'REJECTED' end,
    dish_id = case when p_decision = 'APPROVE' then dish else dish_id end
  where id = asset.id;
  insert into public.audit_events(restaurant_id, actor_id, action, metadata)
  values(asset.owner_restaurant_id, auth.uid(), 'admin.photo.' || lower(p_decision), jsonb_build_object('assetId', asset.id, 'dishId', dish));
end;
$$;

revoke all on function public.admin_add_curated_photo(uuid, text, bigint, integer, integer, text), public.admin_list_dish_photos(uuid) from public, anon, authenticated;
grant execute on function public.admin_add_curated_photo(uuid, text, bigint, integer, integer, text), public.admin_list_dish_photos(uuid) to authenticated;
