ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS latitude double precision,
  ADD COLUMN IF NOT EXISTS longitude double precision,
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS state text,
  ADD COLUMN IF NOT EXISTS postal_code text,
  ADD COLUMN IF NOT EXISTS location_updated_at timestamptz,
  ADD COLUMN IF NOT EXISTS location_sharing_enabled boolean NOT NULL DEFAULT false;

ALTER TABLE public.recyclers
  ADD COLUMN IF NOT EXISTS latitude double precision,
  ADD COLUMN IF NOT EXISTS longitude double precision,
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS city text,
  ADD COLUMN IF NOT EXISTS state text,
  ADD COLUMN IF NOT EXISTS postal_code text,
  ADD COLUMN IF NOT EXISTS location_updated_at timestamptz,
  ADD COLUMN IF NOT EXISTS location_sharing_enabled boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS profiles_location_idx ON public.profiles (latitude, longitude);
CREATE INDEX IF NOT EXISTS recyclers_location_idx ON public.recyclers (latitude, longitude);

-- Recyclers can view collectors who opted into location sharing
CREATE POLICY "Recyclers can view collectors who share location"
ON public.profiles FOR SELECT TO authenticated
USING (
  location_sharing_enabled = true
  AND EXISTS (SELECT 1 FROM public.recyclers r WHERE r.user_id = auth.uid())
);