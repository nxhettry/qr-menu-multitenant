-- Phase 4C: super-admin review queue for photos that restaurants offered to the shared library.
create function public.admin_list_photo_reviews(p_status text, p_page integer, p_page_size integer) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare size integer := least(greatest(coalesce(p_page_size, 20), 1), 50);
  skip integer := (greatest(coalesce(p_page, 1), 1) - 1) * size; result jsonb;
begin
  perform private.assert_super_admin();
  with matched as (
    select a.*, r.name as restaurant_name, r.slug as restaurant_slug, d.name as dish_name
    from public.media_assets a
    left join public.restaurants r on r.id = a.owner_restaurant_id
    left join public.dishes d on d.id = a.dish_id
    where a.source = 'USER' and a.visibility in ('PENDING', 'PUBLIC', 'REJECTED') and (p_status is null or a.visibility = p_status)
  ), page as (select * from matched order by created_at desc, id limit size offset skip)
  select jsonb_build_object('total', (select count(*) from matched), 'rows', coalesce((select jsonb_agg(jsonb_build_object(
    'id', p.id, 'publicId', p.public_id, 'version', p.version, 'visibility', p.visibility,
    'restaurantId', p.owner_restaurant_id, 'restaurantName', p.restaurant_name, 'restaurantSlug', p.restaurant_slug,
    'dishId', p.dish_id, 'dishName', p.dish_name, 'createdAt', p.created_at) order by p.created_at desc, p.id) from page p), '[]'::jsonb))
  into result;
  return result;
end;
$$;

-- decision: APPROVE publishes the photo for the given (or already linked) dish, REJECT hides it from the library.
create function public.admin_review_photo(p_id uuid, p_decision text, p_dish_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare asset public.media_assets; dish uuid;
begin
  perform private.assert_super_admin();
  if p_decision not in ('APPROVE', 'REJECT') then raise exception 'Invalid decision' using errcode = '23514'; end if;
  select * into asset from public.media_assets where id = p_id and source = 'USER' and visibility in ('PENDING', 'PUBLIC', 'REJECTED') for update;
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

revoke all on function public.admin_list_photo_reviews(text, integer, integer), public.admin_review_photo(uuid, text, uuid) from public, anon, authenticated;
grant execute on function public.admin_list_photo_reviews(text, integer, integer), public.admin_review_photo(uuid, text, uuid) to authenticated;
