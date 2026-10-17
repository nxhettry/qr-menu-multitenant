alter table public.menu_categories add column parent_id uuid;
alter table public.menu_categories add constraint category_parent_tenant_fk
  foreign key(parent_id,restaurant_id) references public.menu_categories(id,restaurant_id);
create index category_parent_idx on public.menu_categories(restaurant_id,parent_id);
alter table public.menu_items add column is_visible boolean not null default true;
alter table public.menu_items add column details jsonb not null default '{}'::jsonb;
alter table public.restaurants add column hidden_fields jsonb not null default '[]'::jsonb;

create function private.valid_hidden_fields(value jsonb) returns boolean
language sql immutable set search_path='' as $$
  select case when jsonb_typeof(value)='array' then jsonb_array_length(value)<=11 and not exists(
    select 1 from jsonb_array_elements(value) f where jsonb_typeof(f)<>'string' or f#>>'{}' not in
    ('photos','description','nepali','diet','spice','preparation','calories','tags','badges','allergens','addons')) else false end;
$$;

create function private.valid_item_details(value jsonb) returns boolean
language plpgsql immutable set search_path='' as $$
declare entry jsonb; grp jsonb; opt jsonb; field text;
begin
  if jsonb_typeof(value)<>'object' or octet_length(value::text)>32768 then return false; end if;
  if not private.valid_hidden_fields(coalesce(value->'hidden_fields','[]'::jsonb)) then return false; end if;
  foreach field in array array['is_popular','is_new'] loop
    if value ? field and jsonb_typeof(value->field)<>'boolean' then return false; end if;
  end loop;
  foreach field in array array['tags','allergens'] loop
    if value ? field then
      if jsonb_typeof(value->field)<>'array' or jsonb_array_length(value->field)>(case when field='tags' then 10 else 20 end) then return false; end if;
      for entry in select * from jsonb_array_elements(value->field) loop
        if jsonb_typeof(entry)<>'string' or length(trim(entry#>>'{}')) not between 1 and 60 then return false; end if;
      end loop;
    end if;
  end loop;
  if value ? 'allergen_notes' and value->'allergen_notes'<>'null'::jsonb and
    (jsonb_typeof(value->'allergen_notes')<>'string' or length(value->>'allergen_notes')>500) then return false; end if;
  foreach field in array array['preparation_minutes','calories'] loop
    if value ? field and value->field<>'null'::jsonb then
      if jsonb_typeof(value->field)<>'number' or (value->>field)!~'^\d+$' or
        (value->>field)::numeric not between (case when field='calories' then 0 else 1 end) and (case when field='calories' then 100000 else 1440 end) then return false; end if;
    end if;
  end loop;
  if value ? 'addon_groups' then
    if jsonb_typeof(value->'addon_groups')<>'array' or jsonb_array_length(value->'addon_groups')>10 then return false; end if;
    for grp in select * from jsonb_array_elements(value->'addon_groups') loop
      if jsonb_typeof(grp)<>'object' or jsonb_typeof(grp->'name') is distinct from 'string' or length(trim(grp->>'name')) not between 1 and 60 or
        jsonb_typeof(grp->'options') is distinct from 'array' then return false; end if;
      if jsonb_array_length(grp->'options') not between 1 and 20 or
        jsonb_typeof(grp->'min_select') is distinct from 'number' or jsonb_typeof(grp->'max_select') is distinct from 'number' or
        (grp->>'min_select')!~'^\d+$' or (grp->>'max_select')!~'^\d+$' or
        (grp->>'min_select')::int not between 0 and (grp->>'max_select')::int or
        (grp->>'max_select')::int not between 1 and jsonb_array_length(grp->'options') then return false; end if;
      for opt in select * from jsonb_array_elements(grp->'options') loop
        if jsonb_typeof(opt)<>'object' or jsonb_typeof(opt->'name') is distinct from 'string' or length(trim(opt->>'name')) not between 1 and 60 or
          jsonb_typeof(opt->'price_minor') is distinct from 'number' or (opt->>'price_minor')!~'^\d+$' or
          (opt->>'price_minor')::numeric not between 0 and 1000000000 or jsonb_typeof(opt->'is_available') is distinct from 'boolean' then return false; end if;
      end loop;
    end loop;
  end if;
  return true;
exception when others then return false;
end;
$$;
revoke all on function private.valid_hidden_fields(jsonb),private.valid_item_details(jsonb) from public,anon;
grant execute on function private.valid_hidden_fields(jsonb),private.valid_item_details(jsonb) to authenticated;
alter table public.menu_items add constraint valid_item_details check(private.valid_item_details(details));
alter table public.restaurants add constraint valid_display_settings check(private.valid_hidden_fields(hidden_fields));

create function private.guard_category_parent() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  perform 1 from public.restaurants where id=new.restaurant_id for update;
  if new.parent_id is not null and (new.parent_id=new.id or not exists(
    select 1 from public.menu_categories where id=new.parent_id and restaurant_id=new.restaurant_id and parent_id is null and deleted_at is null
  ) or exists(select 1 from public.menu_categories where parent_id=new.id and restaurant_id=new.restaurant_id and deleted_at is null)) then
    raise exception 'Use a top-level category as the parent' using errcode='23514';
  end if;
  if new.deleted_at is not null and exists(select 1 from public.menu_categories where parent_id=new.id and restaurant_id=new.restaurant_id and deleted_at is null) then
    raise exception 'Remove or move subcategories first' using errcode='23514';
  end if;
  return new;
end;
$$;
revoke all on function private.guard_category_parent() from public,anon,authenticated;
create trigger guard_category_parent before insert or update on public.menu_categories for each row execute function private.guard_category_parent();

create table private.menu_import_receipts (
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  request_id uuid not null, fingerprint text not null, created_at timestamptz not null default now(),
  primary key(restaurant_id,request_id)
);
alter table private.menu_import_receipts enable row level security;
revoke all on private.menu_import_receipts from public,anon,authenticated;

alter function public.mutate_menu(uuid,text,jsonb) set schema private;
alter function private.mutate_menu(uuid,text,jsonb) rename to mutate_menu_base;
revoke all on function private.mutate_menu_base(uuid,text,jsonb) from public,anon,authenticated;

create function public.mutate_menu(p_restaurant_id uuid,p_operation text,p_payload jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare restaurant public.restaurants; receipt jsonb; entry jsonb; base_payload jsonb; chosen_category uuid; child_id uuid;
  target uuid; import_request_id uuid; fingerprint text; previous_fingerprint text;
begin
  if p_payload is null or jsonb_typeof(p_payload)<>'object' or octet_length(p_payload::text)>524288 then
    raise exception 'Invalid menu input' using errcode='23514';
  end if;
  restaurant := private.lock_menu(p_restaurant_id,p_operation in ('settings','visibility','displaySettings'));
  if p_operation='importItems' then
    if jsonb_typeof(p_payload->'items') is distinct from 'array' or jsonb_array_length(p_payload->'items') not between 1 and 200 then
      raise exception 'Invalid import' using errcode='23514';
    end if;
    import_request_id := (p_payload->>'request_id')::uuid;
    fingerprint := md5((p_payload->'items')::text);
    select r.fingerprint into previous_fingerprint from private.menu_import_receipts r where r.restaurant_id=p_restaurant_id and r.request_id=import_request_id;
    if found then
      if fingerprint<>previous_fingerprint then raise exception 'Import request changed. Choose the file again' using errcode='23514'; end if;
      return jsonb_build_object('slug',restaurant.slug,'previousSlug',restaurant.slug);
    end if;
    for entry in select * from jsonb_array_elements(p_payload->'items') loop
      if length(trim(coalesce(entry->>'category',''))) not between 1 and 100 or length(coalesce(entry->>'subcategory',''))>100 or
        jsonb_typeof(entry->'item') is distinct from 'object' then raise exception 'Invalid import' using errcode='23514'; end if;
      select id into chosen_category from public.menu_categories where restaurant_id=p_restaurant_id and parent_id is null and deleted_at is null and lower(trim(name))=lower(trim(entry->>'category')) order by sort_order,id limit 1;
      if chosen_category is null then
        receipt := public.mutate_menu(p_restaurant_id,'saveCategory',jsonb_build_object('name',trim(entry->>'category'),'name_ne',null,'is_visible',true,'parent_id',null));
        chosen_category := (receipt->>'id')::uuid;
      end if;
      if trim(coalesce(entry->>'subcategory',''))<>'' then
        select id into child_id from public.menu_categories where restaurant_id=p_restaurant_id and parent_id=chosen_category and deleted_at is null and lower(trim(name))=lower(trim(entry->>'subcategory')) order by sort_order,id limit 1;
        if child_id is null then
          receipt := public.mutate_menu(p_restaurant_id,'saveCategory',jsonb_build_object('name',trim(entry->>'subcategory'),'name_ne',null,'is_visible',true,'parent_id',chosen_category));
          child_id := (receipt->>'id')::uuid;
        end if;
        chosen_category := child_id;
      end if;
      if exists(select 1 from public.menu_items where restaurant_id=p_restaurant_id and category_id=chosen_category and deleted_at is null and lower(trim(name))=lower(trim(entry->'item'->>'name'))) then
        raise exception 'An item with this category and name already exists' using errcode='23514';
      end if;
      receipt := public.mutate_menu(p_restaurant_id,'saveItem',((entry->'item')-'id')||jsonb_build_object('category_id',chosen_category));
    end loop;
    insert into private.menu_import_receipts values(p_restaurant_id,import_request_id,fingerprint,now());
    insert into public.audit_events(restaurant_id,actor_id,action,metadata) values(p_restaurant_id,auth.uid(),'menu.importItems',jsonb_build_object('count',jsonb_array_length(p_payload->'items')));
  elsif p_operation='displaySettings' then
    if not private.valid_hidden_fields(p_payload->'hidden_fields') then raise exception 'Invalid display settings' using errcode='23514'; end if;
    update public.restaurants set hidden_fields=p_payload->'hidden_fields',updated_at=now() where id=p_restaurant_id;
  elsif p_operation='itemVisibility' then
    update public.menu_items set is_visible=(p_payload->>'visible')::boolean where id=(p_payload->>'id')::uuid and restaurant_id=p_restaurant_id and deleted_at is null;
    if not found then raise exception 'Item not found' using errcode='P0002'; end if;
  else
    if p_operation='visibility' and (p_payload->>'published')::boolean and not exists(
      select 1 from public.menu_items i join public.menu_categories c on (c.id,c.restaurant_id)=(i.category_id,i.restaurant_id)
      left join public.menu_categories parent on (parent.id,parent.restaurant_id)=(c.parent_id,c.restaurant_id)
      where i.restaurant_id=p_restaurant_id and i.deleted_at is null and i.is_visible and c.deleted_at is null and c.is_visible
        and (c.parent_id is null or (parent.is_visible and parent.deleted_at is null))
    ) then raise exception 'Add a visible item before publishing' using errcode='23514'; end if;
    base_payload := p_payload;
    receipt := private.mutate_menu_base(p_restaurant_id,p_operation,base_payload);
    target := (receipt->>'id')::uuid;
    if p_operation='saveCategory' and p_payload ? 'parent_id' then
      update public.menu_categories set parent_id=(p_payload->>'parent_id')::uuid where id=target and restaurant_id=p_restaurant_id;
    elsif p_operation='saveItem' then
      update public.menu_items set is_visible=coalesce((p_payload->>'is_visible')::boolean,is_visible),details=coalesce(p_payload->'details',details)
        where id=target and restaurant_id=p_restaurant_id;
    end if;
    return receipt;
  end if;
  return jsonb_build_object('slug',restaurant.slug,'previousSlug',restaurant.slug);
end;
$$;
revoke all on function public.mutate_menu(uuid,text,jsonb) from public,anon;
grant execute on function public.mutate_menu(uuid,text,jsonb) to authenticated;

create function private.public_item(i public.menu_items, hidden jsonb, subcategory text) returns jsonb
language sql stable set search_path='' as $$
select jsonb_build_object('id',i.id,'name',i.name,'nameNe',case when hidden ? 'nepali' then null else i.name_ne end,
  'subcategory',subcategory,'description',case when hidden ? 'description' then null else i.description end,
  'descriptionNe',case when hidden ? 'description' or hidden ? 'nepali' then null else i.description_ne end,
  'priceMinor',i.price_minor,'imagePublicId',case when hidden ? 'photos' then null else i.image_public_id end,
  'imageVersion',case when hidden ? 'photos' then null else i.image_version end,
  'isAvailable',i.is_available,'isFeatured',i.is_featured,
  'diet',case when hidden ? 'diet' then null else i.diet end,'spiceLevel',case when hidden ? 'spice' then null else i.spice_level end,
  'details',jsonb_build_object('hidden_fields',hidden,
    'is_popular',case when hidden ? 'badges' then false else coalesce((i.details->>'is_popular')::boolean,false) end,
    'is_new',case when hidden ? 'badges' then false else coalesce((i.details->>'is_new')::boolean,false) end,
    'tags',case when hidden ? 'tags' then '[]'::jsonb else coalesce(i.details->'tags','[]'::jsonb) end,
    'allergens',case when hidden ? 'allergens' then '[]'::jsonb else coalesce(i.details->'allergens','[]'::jsonb) end,
    'allergen_notes',case when hidden ? 'allergens' then null else i.details->>'allergen_notes' end,
    'preparation_minutes',case when hidden ? 'preparation' then null else i.details->'preparation_minutes' end,
    'calories',case when hidden ? 'calories' then null else i.details->'calories' end,
    'addon_groups',case when hidden ? 'addons' then '[]'::jsonb else coalesce(i.details->'addon_groups','[]'::jsonb) end),
  'variants',coalesce((select jsonb_agg(jsonb_build_object('id',v.id,'name',v.name,'nameNe',case when hidden ? 'nepali' then null else v.name_ne end,
    'priceMinor',v.price_minor,'isAvailable',v.is_available) order by v.sort_order,v.id)
    from public.menu_item_variants v where v.item_id=i.id and v.restaurant_id=i.restaurant_id),'[]'::jsonb));
$$;
revoke all on function private.public_item(public.menu_items,jsonb,text) from public,anon,authenticated;

create or replace function public.get_public_menu(p_slug text) returns jsonb
language sql stable security definer set search_path='' as $$
select case when r.status<>'PUBLISHED' then jsonb_build_object('status','UNAVAILABLE') else
jsonb_build_object('id',r.id,'slug',r.slug,'shortCode',r.short_code,'name',r.name,'nameNe',case when r.hidden_fields ? 'nepali' then null else r.name_ne end,
  'description',r.description,'address',r.address,'phone',r.phone,'mapUrl',r.map_url,'themeColor',r.theme_color,
  'logoPublicId',r.logo_public_id,'logoVersion',r.logo_version,'coverPublicId',r.cover_public_id,'coverVersion',r.cover_version,'openingHours',r.opening_hours,
  'currency',r.currency,'pricesIncludeVat',r.prices_include_vat,'vatPercent',r.vat_percent,'serviceChargePercent',r.service_charge_percent,'updatedAt',r.updated_at,'status',r.status,
  'categories',coalesce((select jsonb_agg(jsonb_build_object('id',c.id,'name',c.name,'nameNe',case when r.hidden_fields ? 'nepali' then null else c.name_ne end,
    'items',coalesce((select jsonb_agg(private.public_item(i,
      (select coalesce(jsonb_agg(distinct f),'[]'::jsonb) from jsonb_array_elements(r.hidden_fields||coalesce(i.details->'hidden_fields','[]'::jsonb)) f),
      case when leaf.parent_id is not null then leaf.name else null end) order by leaf.sort_order,i.sort_order,i.id)
      from public.menu_items i join public.menu_categories leaf on (leaf.id,leaf.restaurant_id)=(i.category_id,i.restaurant_id)
      where i.restaurant_id=r.id and (leaf.id=c.id or leaf.parent_id=c.id) and leaf.is_visible and leaf.deleted_at is null and i.is_visible and i.deleted_at is null),'[]'::jsonb))
    order by c.sort_order,c.id) from public.menu_categories c where c.restaurant_id=r.id and c.parent_id is null and c.is_visible and c.deleted_at is null),'[]'::jsonb))
end from public.restaurants r where r.slug=p_slug and r.deleted_at is null;
$$;
