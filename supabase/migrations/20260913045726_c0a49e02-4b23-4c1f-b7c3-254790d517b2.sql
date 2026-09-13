REVOKE ALL ON FUNCTION public.recycler_exact_location(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.recycler_exact_location(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.recycler_exact_location(uuid) TO authenticated;