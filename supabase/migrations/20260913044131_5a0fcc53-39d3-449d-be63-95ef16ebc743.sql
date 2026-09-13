ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS asking_price numeric(10,2);

UPDATE public.transactions SET status = CASE status
  WHEN 'pending_recycler' THEN 'available_for_purchase'
  WHEN 'offer_received' THEN 'purchase_requested'
  WHEN 'recycler_selected' THEN 'sale_accepted'
  ELSE status END;
ALTER TABLE public.transactions ALTER COLUMN status SET DEFAULT 'available_for_purchase';

UPDATE public.recycler_offers SET status = CASE status
  WHEN 'offered' THEN 'requested'
  WHEN 'declined' THEN 'rejected'
  ELSE status END;
ALTER TABLE public.recycler_offers ALTER COLUMN status SET DEFAULT 'requested';

CREATE OR REPLACE FUNCTION private.bump_listing_on_offer()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.transactions
  SET status = 'purchase_requested'
  WHERE id = NEW.waste_listing_id AND status = 'available_for_purchase';
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION private.bump_listing_on_offer() FROM public, anon, authenticated;

DROP POLICY IF EXISTS "Verified recyclers can view open listings" ON public.transactions;
CREATE POLICY "Verified recyclers can view open listings" ON public.transactions
  FOR SELECT TO authenticated
  USING (
    recycler_id IS NULL
    AND status IN ('available_for_purchase', 'purchase_requested')
    AND EXISTS (SELECT 1 FROM public.recyclers r WHERE r.user_id = auth.uid() AND r.verified = true)
  );

DROP POLICY IF EXISTS "Recyclers can update pickups sent to them" ON public.transactions;
CREATE POLICY "Recyclers can update pickups sent to them" ON public.transactions
  FOR UPDATE TO authenticated
  USING (recycler_id IN (SELECT r.id FROM public.recyclers r WHERE r.user_id = auth.uid()))
  WITH CHECK (
    recycler_id IN (SELECT r.id FROM public.recyclers r WHERE r.user_id = auth.uid())
    OR (recycler_id IS NULL AND status = 'available_for_purchase')
  );