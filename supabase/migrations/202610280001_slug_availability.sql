-- Lets a signed-in owner check a menu address before creating a restaurant.
-- Current and historical addresses share private.slug_reservations, so both count as taken.
create function public.slug_available(p_slug text) returns boolean
language sql stable security definer set search_path = '' as $$
  select p_slug ~ '^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$'
    and not (p_slug = any(array['dashboard','login','register','api','q','admin','settings','pricing','about','help','terms','privacy','setup','auth','onboarding','forgot-password','reset-password','robots','sitemap','www','momo-house']))
    and not exists(select 1 from private.slug_reservations where slug = p_slug);
$$;
revoke all on function public.slug_available(text) from public, anon;
grant execute on function public.slug_available(text) to authenticated;
