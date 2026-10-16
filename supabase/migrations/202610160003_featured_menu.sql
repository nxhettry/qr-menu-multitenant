alter table public.menu_items add column is_featured boolean not null default false;

create function private.guard_featured_item() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  if new.is_featured and new.deleted_at is null then
    perform 1 from public.restaurants where id=new.restaurant_id for update;
    if (select count(*) from public.menu_items where restaurant_id=new.restaurant_id and is_featured and deleted_at is null and id<>new.id)>=6 then
      raise exception 'Choose up to six specials for your banner' using errcode='23514';
    end if;
  end if;
  return new;
end;
$$;
revoke all on function private.guard_featured_item() from public,anon,authenticated;
create trigger guard_featured_item before insert or update on public.menu_items
for each row execute function private.guard_featured_item();

create or replace function public.mutate_menu(p_restaurant_id uuid,p_operation text,p_payload jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare restaurant public.restaurants; target uuid; parent uuid; variant jsonb; position integer;
  existing public.menu_items; ids uuid[]; expected uuid[]; previous_slug text; upload private.menu_uploads;
  asset_id text; image_version bigint; manage boolean;
begin
  if p_payload is null or jsonb_typeof(p_payload)<>'object' or octet_length(p_payload::text)>65536 then
    raise exception 'Invalid menu input' using errcode='23514';
  end if;
  manage := p_operation in ('settings','visibility') or
    (p_operation in ('reserveUpload','removeImage') and coalesce(p_payload->>'kind','')<>'item');
  restaurant := private.lock_menu(p_restaurant_id,manage);
  previous_slug := restaurant.slug;

  case p_operation
  when 'saveCategory' then
    target := nullif(p_payload->>'id','')::uuid;
    if target is null then
      if (select count(*) from public.menu_categories where restaurant_id=p_restaurant_id and deleted_at is null)>=100 then
        raise exception 'Category limit reached' using errcode='23514';
      end if;
      insert into public.menu_categories(restaurant_id,name,name_ne,is_visible,sort_order)
        values(p_restaurant_id,trim(p_payload->>'name'),nullif(trim(p_payload->>'name_ne'),''),(p_payload->>'is_visible')::boolean,
          coalesce((select max(sort_order)+1 from public.menu_categories where restaurant_id=p_restaurant_id),0)) returning id into target;
    else
      update public.menu_categories set name=trim(p_payload->>'name'),name_ne=nullif(trim(p_payload->>'name_ne'),''),is_visible=(p_payload->>'is_visible')::boolean
        where id=target and restaurant_id=p_restaurant_id and deleted_at is null;
      if not found then raise exception 'Category not found' using errcode='P0002'; end if;
    end if;
  when 'saveItem' then
    target := nullif(p_payload->>'id','')::uuid;
    parent := (p_payload->>'category_id')::uuid;
    if not exists(select 1 from public.menu_categories where id=parent and restaurant_id=p_restaurant_id and deleted_at is null) then
      raise exception 'Category not found' using errcode='P0002';
    end if;
    if jsonb_typeof(p_payload->'variants') is distinct from 'array' or jsonb_array_length(p_payload->'variants')>30 then
      raise exception 'Invalid variants' using errcode='23514';
    end if;
    if target is not null then
      select * into existing from public.menu_items where id=target and restaurant_id=p_restaurant_id and deleted_at is null;
      if not found then raise exception 'Item not found' using errcode='P0002'; end if;
      if existing.is_example_price and not coalesce((p_payload->>'confirm_prices')::boolean,false) then
        raise exception 'Confirm the example prices before saving' using errcode='23514';
      end if;
    else
      if (select count(*) from public.menu_items where restaurant_id=p_restaurant_id and deleted_at is null)>=1000 then
        raise exception 'Item limit reached' using errcode='23514';
      end if;
      insert into public.menu_items(restaurant_id,category_id,name,price_minor,sort_order)
        values(p_restaurant_id,parent,'New item',0,coalesce((select max(sort_order)+1 from public.menu_items where restaurant_id=p_restaurant_id and category_id=parent),0)) returning id into target;
    end if;
    delete from public.menu_item_variants where item_id=target and restaurant_id=p_restaurant_id;
    update public.menu_items set category_id=parent,name=trim(p_payload->>'name'),name_ne=nullif(trim(p_payload->>'name_ne'),''),
      description=nullif(trim(p_payload->>'description'),''),description_ne=nullif(trim(p_payload->>'description_ne'),''),
      uses_variants=jsonb_array_length(p_payload->'variants')>0,price_minor=(p_payload->>'price_minor')::integer,
      is_available=(p_payload->>'is_available')::boolean,diet=p_payload->>'diet',spice_level=(p_payload->>'spice_level')::smallint,is_example_price=false,
      is_featured=coalesce((p_payload->>'is_featured')::boolean,is_featured)
      where id=target and restaurant_id=p_restaurant_id;
    position := 0;
    for variant in select value from jsonb_array_elements(p_payload->'variants') loop
      insert into public.menu_item_variants(restaurant_id,item_id,name,name_ne,price_minor,is_available,sort_order)
        values(p_restaurant_id,target,trim(variant->>'name'),nullif(trim(variant->>'name_ne'),''),(variant->>'price_minor')::integer,(variant->>'is_available')::boolean,position);
      position := position+1;
    end loop;
  when 'delete' then
    target := (p_payload->>'id')::uuid;
    if p_payload->>'kind'='category' then
      if exists(select 1 from public.menu_items where category_id=target and restaurant_id=p_restaurant_id and deleted_at is null) then
        raise exception 'Move or remove the items in this category first' using errcode='23514';
      end if;
      update public.menu_categories set deleted_at=now() where id=target and restaurant_id=p_restaurant_id and deleted_at is null;
    elsif p_payload->>'kind'='item' then
      update public.menu_items set deleted_at=now() where id=target and restaurant_id=p_restaurant_id and deleted_at is null;
    else raise exception 'Invalid entry type' using errcode='23514'; end if;
    if not found then raise exception 'Menu entry not found' using errcode='P0002'; end if;
  when 'availability' then
    target := (p_payload->>'id')::uuid;
    update public.menu_items set is_available=(p_payload->>'available')::boolean where id=target and restaurant_id=p_restaurant_id and deleted_at is null;
    if not found then raise exception 'Item not found' using errcode='P0002'; end if;
  when 'reorder' then
    if jsonb_typeof(p_payload->'ids') is distinct from 'array' or jsonb_array_length(p_payload->'ids')>1000 then
      raise exception 'Invalid ordering' using errcode='23514';
    end if;
    select coalesce(array_agg(value::uuid order by value::uuid),'{}'::uuid[]) into ids from jsonb_array_elements_text(p_payload->'ids');
    if p_payload->>'kind'='category' then
      select coalesce(array_agg(id order by id),'{}'::uuid[]) into expected from public.menu_categories where restaurant_id=p_restaurant_id and deleted_at is null;
      if ids<>expected then raise exception 'The menu changed. Refresh before reordering' using errcode='23514'; end if;
      update public.menu_categories c set sort_order=entries.ordinality-1 from jsonb_array_elements_text(p_payload->'ids') with ordinality entries
        where c.id=entries.value::uuid and c.restaurant_id=p_restaurant_id;
    elsif p_payload->>'kind'='item' then
      parent := (p_payload->>'category_id')::uuid;
      if not exists(select 1 from public.menu_categories where id=parent and restaurant_id=p_restaurant_id and deleted_at is null) then
        raise exception 'Category not found' using errcode='P0002';
      end if;
      select coalesce(array_agg(id order by id),'{}'::uuid[]) into expected from public.menu_items where restaurant_id=p_restaurant_id and category_id=parent and deleted_at is null;
      if ids<>expected then raise exception 'The menu changed. Refresh before reordering' using errcode='23514'; end if;
      update public.menu_items i set sort_order=entries.ordinality-1 from jsonb_array_elements_text(p_payload->'ids') with ordinality entries
        where i.id=entries.value::uuid and i.restaurant_id=p_restaurant_id and i.category_id=parent;
    else raise exception 'Invalid entry type' using errcode='23514'; end if;
  when 'settings' then
    if jsonb_typeof(p_payload->'opening_hours') is distinct from 'object' or
      (select count(*) from jsonb_each(p_payload->'opening_hours'))>14 or
      exists(select 1 from jsonb_each(p_payload->'opening_hours') where length(key)>40 or jsonb_typeof(value)<>'string' or length(value#>>'{}')>100) then
      raise exception 'Invalid opening hours' using errcode='23514';
    end if;
    update public.restaurants set name=trim(p_payload->>'name'),slug=p_payload->>'slug',name_ne=nullif(trim(p_payload->>'name_ne'),''),
      description=nullif(trim(p_payload->>'description'),''),phone=nullif(trim(p_payload->>'phone'),''),address=nullif(trim(p_payload->>'address'),''),map_url=nullif(p_payload->>'map_url',''),
      theme_color=p_payload->>'theme_color',opening_hours=p_payload->'opening_hours',prices_include_vat=(p_payload->>'prices_include_vat')::boolean,
      vat_percent=(p_payload->>'vat_percent')::numeric,service_charge_percent=(p_payload->>'service_charge_percent')::numeric where id=p_restaurant_id;
  when 'visibility' then
    if (p_payload->>'published')::boolean then
      if not exists(select 1 from public.menu_items i join public.menu_categories c on (c.id,c.restaurant_id)=(i.category_id,i.restaurant_id)
        where i.restaurant_id=p_restaurant_id and i.deleted_at is null and c.deleted_at is null and c.is_visible) then
        raise exception 'Add an item to a visible category before publishing' using errcode='23514';
      end if;
      if exists(select 1 from public.menu_items where restaurant_id=p_restaurant_id and deleted_at is null and is_example_price) then
        raise exception 'Confirm every example price before publishing' using errcode='23514';
      end if;
      update public.restaurants set status='PUBLISHED',published_at=coalesce(published_at,now()) where id=p_restaurant_id;
    elsif (p_payload->>'published')::boolean=false then
      update public.restaurants set status='DRAFT' where id=p_restaurant_id;
    else raise exception 'Invalid publication status' using errcode='23514'; end if;
  when 'reserveUpload' then
    if p_payload->>'kind' not in ('logo','cover','item') then raise exception 'Invalid image target' using errcode='23514'; end if;
    target := nullif(p_payload->>'item_id','')::uuid;
    if p_payload->>'kind'='item' and not exists(select 1 from public.menu_items where id=target and restaurant_id=p_restaurant_id and deleted_at is null) then
      raise exception 'Item not found' using errcode='P0002';
    end if;
    if (select count(*) from private.menu_uploads where restaurant_id=p_restaurant_id and created_at>now()-interval '24 hours')>=20 then
      raise exception 'Daily image upload limit reached. Try again tomorrow' using errcode='23514';
    end if;
    insert into private.menu_uploads(restaurant_id,actor_id,kind,item_id) values(p_restaurant_id,auth.uid(),p_payload->>'kind',target) returning * into upload;
    return jsonb_build_object('slug',restaurant.slug,'previousSlug',previous_slug,'uploadId',upload.id,'publicId','qrmenu/'||p_restaurant_id::text||'/'||upload.id::text);
  when 'attachImage' then
    select * into upload from private.menu_uploads where id=(p_payload->>'upload_id')::uuid and restaurant_id=p_restaurant_id and actor_id=auth.uid()
      and attached_at is null and created_at>now()-interval '10 minutes' for update;
    if not found then raise exception 'Upload expired or not found' using errcode='P0002'; end if;
    if upload.kind<>'item' and not private.can_edit(p_restaurant_id,array['OWNER','MANAGER']) then raise exception 'Editing is not permitted' using errcode='42501'; end if;
    asset_id := 'qrmenu/'||p_restaurant_id::text||'/'||upload.id::text;
    image_version := (p_payload->>'version')::bigint;
    if image_version is null or image_version<=0 then raise exception 'Invalid image version' using errcode='23514'; end if;
    if upload.kind='item' then
      update public.menu_items set image_public_id=asset_id,image_version=image_version where id=upload.item_id and restaurant_id=p_restaurant_id and deleted_at is null;
      if not found then raise exception 'Item not found' using errcode='P0002'; end if;
    elsif upload.kind='logo' then update public.restaurants set logo_public_id=asset_id,logo_version=image_version where id=p_restaurant_id;
    else update public.restaurants set cover_public_id=asset_id,cover_version=image_version where id=p_restaurant_id; end if;
    update private.menu_uploads set attached_at=now() where id=upload.id;
  when 'removeImage' then
    if p_payload->>'kind'='item' then
      update public.menu_items set image_public_id=null,image_version=null where id=(p_payload->>'item_id')::uuid and restaurant_id=p_restaurant_id and deleted_at is null;
      if not found then raise exception 'Item not found' using errcode='P0002'; end if;
    elsif p_payload->>'kind'='logo' then update public.restaurants set logo_public_id=null,logo_version=null where id=p_restaurant_id;
    elsif p_payload->>'kind'='cover' then update public.restaurants set cover_public_id=null,cover_version=null where id=p_restaurant_id;
    else raise exception 'Invalid image target' using errcode='23514'; end if;
  else raise exception 'Unknown menu operation' using errcode='23514';
  end case;
  update public.restaurants set updated_at=now() where id=p_restaurant_id returning * into restaurant;
  insert into public.audit_events(restaurant_id,actor_id,action) values(p_restaurant_id,auth.uid(),'menu.'||p_operation);
  return jsonb_build_object('id',target,'slug',restaurant.slug,'previousSlug',previous_slug);
end;
$$;

create or replace function public.get_public_menu(p_slug text) returns jsonb
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
        'imagePublicId',i.image_public_id,'imageVersion',i.image_version,'isAvailable',i.is_available,'isFeatured',i.is_featured,
        'diet',i.diet,'spiceLevel',i.spice_level,'variants',coalesce((select jsonb_agg(
          jsonb_build_object('id',v.id,'name',v.name,'nameNe',v.name_ne,'priceMinor',v.price_minor,'isAvailable',v.is_available)
          order by v.sort_order,v.id) from public.menu_item_variants v where v.item_id=i.id and v.restaurant_id=r.id),'[]'::jsonb))
        order by i.sort_order,i.id) from public.menu_items i where i.category_id=c.id and i.restaurant_id=r.id and i.deleted_at is null),'[]'::jsonb))
      order by c.sort_order,c.id) from public.menu_categories c where c.restaurant_id=r.id and c.is_visible and c.deleted_at is null),'[]'::jsonb))
end from public.restaurants r where r.slug=p_slug and r.deleted_at is null;
$$;
