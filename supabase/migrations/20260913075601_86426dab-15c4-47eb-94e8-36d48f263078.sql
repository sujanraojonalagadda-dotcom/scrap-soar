CREATE OR REPLACE FUNCTION public.recyclers_nearby(_material text DEFAULT NULL)
RETURNS TABLE(
  id uuid, name text, materials text[], rate_per_kg numeric, verified boolean,
  city text, state text, location_updated_at timestamptz,
  latitude double precision, longitude double precision
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT r.id, r.name, r.materials, r.rate_per_kg, r.verified, r.city, r.state, r.location_updated_at,
         round(r.latitude::numeric, 2)::double precision,
         round(r.longitude::numeric, 2)::double precision
  FROM public.recyclers r
  WHERE auth.uid() IS NOT NULL
    AND r.location_sharing_enabled = true
    AND r.latitude IS NOT NULL
    AND r.longitude IS NOT NULL
    AND (_material IS NULL OR _material = ANY (r.materials));
$$;

REVOKE ALL ON FUNCTION public.recyclers_nearby(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.recyclers_nearby(text) TO authenticated;