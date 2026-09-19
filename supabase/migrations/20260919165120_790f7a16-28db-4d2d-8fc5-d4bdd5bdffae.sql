-- Remove all anonymous access to recyclers (no anon SELECT policy exists, so nothing breaks)
REVOKE ALL ON public.recyclers FROM anon;

-- Security-definer helpers must be callable only by signed-in users; each does its own authorisation check
REVOKE ALL ON FUNCTION public.admin_recyclers() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.recycler_exact_location(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.recycler_private_details(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.recyclers_nearby(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.admin_recyclers() TO authenticated;
GRANT EXECUTE ON FUNCTION public.recycler_exact_location(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.recycler_private_details(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.recyclers_nearby(text) TO authenticated;