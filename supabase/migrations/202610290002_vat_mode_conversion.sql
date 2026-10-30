-- Restaurant-level VAT: switch between "prices I enter include VAT" and "exclude VAT",
-- optionally converting every stored price so that guests keep paying the same amount.

-- Converts a stored price between VAT modes, rounded half-up to whole rupees.
-- Mirrors convertVatPrice() in src/lib/menu/vat.ts.
create function private.convert_vat_price(p_minor integer, p_vat numeric, p_to_inclusive boolean)
returns integer language plpgsql immutable set search_path='' as $$
declare rate bigint := 10000 + round(p_vat*100)::bigint; numerator bigint; denominator bigint; converted bigint;
begin
  if p_minor=0 then return 0; end if;
  if p_to_inclusive then numerator := p_minor::bigint*rate; denominator := 1000000;
  else numerator := p_minor::bigint*10000; denominator := rate*100; end if;
  converted := ((2*numerator+denominator)/(2*denominator))*100;
  if converted>1000000000 then
    raise exception 'A converted price would exceed the maximum' using errcode='23514';
  end if;
  return converted::integer;
end;
$$;
revoke all on function private.convert_vat_price(integer,numeric,boolean) from public,anon,authenticated;

create function private.convert_addon_groups(p_details jsonb, p_vat numeric, p_to_inclusive boolean)
returns jsonb language sql immutable set search_path='' as $$
select jsonb_set(p_details,'{addon_groups}',coalesce((
  select jsonb_agg(jsonb_set(g.value,'{options}',coalesce((
    select jsonb_agg(jsonb_set(o.value,'{price_minor}',to_jsonb(private.convert_vat_price((o.value->>'price_minor')::integer,p_vat,p_to_inclusive))) order by o.position)
    from jsonb_array_elements(g.value->'options') with ordinality o(value,position)),'[]'::jsonb)) order by g.position)
  from jsonb_array_elements(p_details->'addon_groups') with ordinality g(value,position)),'[]'::jsonb));
$$;
revoke all on function private.convert_addon_groups(jsonb,numeric,boolean) from public,anon,authenticated;

create function private.convert_menu_vat_mode(p_restaurant_id uuid, p_include_vat boolean, p_convert boolean)
returns jsonb language plpgsql security definer set search_path='' as $$
declare restaurant public.restaurants;
begin
  if p_include_vat is null or p_convert is null then raise exception 'Invalid VAT mode' using errcode='23514'; end if;
  restaurant := private.lock_menu(p_restaurant_id,true);
  if restaurant.prices_include_vat is distinct from p_include_vat then
    if p_convert then
      update public.menu_items set price_minor=private.convert_vat_price(price_minor,restaurant.vat_percent,p_include_vat)
        where restaurant_id=p_restaurant_id and deleted_at is null and price_minor>0;
      update public.menu_item_variants v set price_minor=private.convert_vat_price(v.price_minor,restaurant.vat_percent,p_include_vat)
        from public.menu_items i where v.restaurant_id=p_restaurant_id and i.id=v.item_id and i.restaurant_id=v.restaurant_id
          and i.deleted_at is null and v.price_minor>0;
      update public.menu_items set details=private.convert_addon_groups(details,restaurant.vat_percent,p_include_vat)
        where restaurant_id=p_restaurant_id and deleted_at is null and jsonb_typeof(details->'addon_groups')='array' and jsonb_array_length(details->'addon_groups')>0;
    end if;
    update public.restaurants set prices_include_vat=p_include_vat,updated_at=now() where id=p_restaurant_id;
    insert into public.audit_events(restaurant_id,actor_id,action,metadata) values(p_restaurant_id,auth.uid(),'menu.changeVatMode',
      jsonb_build_object('prices_include_vat',p_include_vat,'converted',p_convert,'vat_percent',restaurant.vat_percent));
  end if;
  return jsonb_build_object('slug',restaurant.slug,'previousSlug',restaurant.slug);
end;
$$;
revoke all on function private.convert_menu_vat_mode(uuid,boolean,boolean) from public,anon,authenticated;

create function public.change_vat_mode(p_restaurant_id uuid, p_include_vat boolean, p_convert boolean)
returns jsonb language sql security definer set search_path='' as $$
select private.convert_menu_vat_mode(p_restaurant_id,p_include_vat,p_convert);
$$;
revoke all on function public.change_vat_mode(uuid,boolean,boolean) from public,anon;
grant execute on function public.change_vat_mode(uuid,boolean,boolean) to authenticated;
