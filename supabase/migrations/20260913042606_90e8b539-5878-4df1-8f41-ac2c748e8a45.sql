CREATE SEQUENCE IF NOT EXISTS public.listing_seq START 1000;
GRANT USAGE, SELECT ON SEQUENCE public.listing_seq TO authenticated, service_role;

ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS listing_code text,
  ADD COLUMN IF NOT EXISTS photo_url text,
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS quantity_note text,
  ADD COLUMN IF NOT EXISTS latitude double precision,
  ADD COLUMN IF NOT EXISTS longitude double precision,
  ADD COLUMN IF NOT EXISTS pickup_address text,
  ADD COLUMN IF NOT EXISTS selected_offer_id uuid,
  ADD COLUMN IF NOT EXISTS agreed_price_per_kg numeric(10,2),
  ADD COLUMN IF NOT EXISTS pickup_date date,
  ADD COLUMN IF NOT EXISTS handover_at timestamptz,
  ADD COLUMN IF NOT EXISTS handover_notes text,
  ADD COLUMN IF NOT EXISTS handover_photo_url text,
  ADD COLUMN IF NOT EXISTS recycler_confirmed_at timestamptz,
  ADD COLUMN IF NOT EXISTS completed_at timestamptz;

UPDATE public.transactions
SET listing_code = 'RW-' || lpad(nextval('public.listing_seq')::text, 4, '0')
WHERE listing_code IS NULL;

ALTER TABLE public.transactions
  ALTER COLUMN listing_code SET DEFAULT 'RW-' || lpad(nextval('public.listing_seq')::text, 4, '0');
ALTER TABLE public.transactions ALTER COLUMN listing_code SET NOT NULL;

UPDATE public.transactions SET status = CASE
  WHEN status = 'pending' AND recycler_id IS NULL THEN 'pending_recycler'
  WHEN status = 'pending' THEN 'recycler_selected'
  WHEN status = 'accepted' THEN 'pickup_scheduled'
  WHEN status = 'confirmed' THEN 'recycler_confirmed'
  ELSE status END;

ALTER TABLE public.transactions ALTER COLUMN status SET DEFAULT 'pending_recycler';

CREATE TABLE IF NOT EXISTS public.recycler_offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  waste_listing_id uuid NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
  recycler_id uuid NOT NULL REFERENCES public.recyclers(id) ON DELETE CASCADE,
  price_per_kg numeric(10,2) NOT NULL,
  total_price numeric(10,2) NOT NULL,
  pickup_date date,
  message text,
  status text NOT NULL DEFAULT 'offered',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (waste_listing_id, recycler_id)
);

GRANT SELECT, INSERT, UPDATE ON public.recycler_offers TO authenticated;
GRANT ALL ON public.recycler_offers TO service_role;
ALTER TABLE public.recycler_offers ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER update_recycler_offers_updated_at BEFORE UPDATE ON public.recycler_offers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION private.my_verified_recycler_ids(_user_id uuid)
RETURNS SETOF uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id FROM public.recyclers WHERE user_id = _user_id AND verified = true
$$;
REVOKE ALL ON FUNCTION private.my_verified_recycler_ids(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION private.my_verified_recycler_ids(uuid) TO authenticated, service_role;

CREATE POLICY "Recyclers can view their own offers" ON public.recycler_offers
  FOR SELECT TO authenticated
  USING (recycler_id IN (SELECT private.my_verified_recycler_ids(auth.uid())));
CREATE POLICY "Verified recyclers can create offers" ON public.recycler_offers
  FOR INSERT TO authenticated
  WITH CHECK (recycler_id IN (SELECT private.my_verified_recycler_ids(auth.uid())));
CREATE POLICY "Recyclers can update their own offers" ON public.recycler_offers
  FOR UPDATE TO authenticated
  USING (recycler_id IN (SELECT private.my_verified_recycler_ids(auth.uid())))
  WITH CHECK (recycler_id IN (SELECT private.my_verified_recycler_ids(auth.uid())));
CREATE POLICY "Collectors can view offers on their listings" ON public.recycler_offers
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.transactions t WHERE t.id = waste_listing_id AND t.collector_id = auth.uid()));
CREATE POLICY "Collectors can decide offers on their listings" ON public.recycler_offers
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.transactions t WHERE t.id = waste_listing_id AND t.collector_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.transactions t WHERE t.id = waste_listing_id AND t.collector_id = auth.uid()));
CREATE POLICY "Admins can monitor all offers" ON public.recycler_offers
  FOR SELECT TO authenticated USING (private.has_role(auth.uid(), 'admin'));

CREATE POLICY "Verified recyclers can view open listings" ON public.transactions
  FOR SELECT TO authenticated
  USING (
    recycler_id IS NULL
    AND status IN ('pending_recycler', 'offer_received')
    AND EXISTS (SELECT 1 FROM public.recyclers r WHERE r.user_id = auth.uid() AND r.verified = true)
  );

DROP POLICY IF EXISTS "Collectors can update their pending pickups" ON public.transactions;
CREATE POLICY "Collectors can update their own listings" ON public.transactions
  FOR UPDATE TO authenticated
  USING (auth.uid() = collector_id) WITH CHECK (auth.uid() = collector_id);

CREATE INDEX IF NOT EXISTS transactions_status_idx ON public.transactions (status);
CREATE INDEX IF NOT EXISTS recycler_offers_listing_idx ON public.recycler_offers (waste_listing_id);