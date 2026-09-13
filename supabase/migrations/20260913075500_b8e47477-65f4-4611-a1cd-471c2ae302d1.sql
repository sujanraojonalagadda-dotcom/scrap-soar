-- 1) Storage access rules for the private waste-photos bucket
CREATE POLICY "Users upload photos in their own folder"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'waste-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users manage their own photos"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'waste-photos' AND (storage.foldername(name))[1] = auth.uid()::text)
WITH CHECK (bucket_id = 'waste-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users delete their own photos"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'waste-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Photos readable by owner, transaction parties and admins"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'waste-photos'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR private.has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.transactions t
      WHERE (t.photo_url = storage.objects.name OR t.handover_photo_url = storage.objects.name)
        AND (
          t.collector_id = auth.uid()
          OR t.recycler_id IN (SELECT r.id FROM public.recyclers r WHERE r.user_id = auth.uid())
        )
    )
  )
);

-- 2) Hide sensitive recycler columns from ordinary signed-in users
REVOKE SELECT ON public.recyclers FROM authenticated;
GRANT SELECT (
  id, user_id, name, location, materials, rate_per_kg, verified, verification_date,
  verification_status, operating_area, description, business_hours, city, state,
  location_sharing_enabled, location_updated_at, created_at, updated_at
) ON public.recyclers TO authenticated;
GRANT INSERT, UPDATE ON public.recyclers TO authenticated;

-- Private details released only to the owner, an admin, or a collector with an accepted sale
CREATE OR REPLACE FUNCTION public.recycler_private_details(_recycler_id uuid)
RETURNS TABLE(
  contact_person text, contact_phone text, registration_number text, verification_note text,
  address text, postal_code text, latitude double precision, longitude double precision
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT r.contact_person, r.contact_phone, r.registration_number, r.verification_note,
         r.address, r.postal_code, r.latitude, r.longitude
  FROM public.recyclers r
  WHERE r.id = _recycler_id
    AND (
      r.user_id = auth.uid()
      OR private.has_role(auth.uid(), 'admin'::app_role)
      OR EXISTS (
        SELECT 1 FROM public.transactions t
        WHERE t.recycler_id = r.id
          AND t.collector_id = auth.uid()
          AND t.status IN ('sale_accepted','pickup_scheduled','handed_over','recycler_confirmed','completed')
      )
    );
$$;

REVOKE ALL ON FUNCTION public.recycler_private_details(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.recycler_private_details(uuid) TO authenticated;

-- Admin-only full recycler listing for the admin dashboard
CREATE OR REPLACE FUNCTION public.admin_recyclers()
RETURNS SETOF public.recyclers
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT r.* FROM public.recyclers r
  WHERE private.has_role(auth.uid(), 'admin'::app_role)
  ORDER BY r.created_at DESC;
$$;

REVOKE ALL ON FUNCTION public.admin_recyclers() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_recyclers() TO authenticated;

-- 3) Tighten the existing exact-location function
REVOKE ALL ON FUNCTION public.recycler_exact_location(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.recycler_exact_location(uuid) TO authenticated;