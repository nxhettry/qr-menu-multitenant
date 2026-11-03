-- Minimal anonymous projection used to build sitemap.xml: slug and last change of live, non-deleted menus only.
create function public.list_published_menus(p_limit integer default 5000)
returns table (slug text, updated_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select r.slug, r.updated_at
  from public.restaurants r
  where r.status = 'PUBLISHED' and r.deleted_at is null
  order by r.updated_at desc
  limit least(greatest(coalesce(p_limit, 5000), 1), 5000);
$$;
revoke all on function public.list_published_menus(integer) from public;
grant execute on function public.list_published_menus(integer) to anon, authenticated;
comment on function public.list_published_menus(integer) is 'Anonymous-safe list of published menu addresses for sitemap generation.';
