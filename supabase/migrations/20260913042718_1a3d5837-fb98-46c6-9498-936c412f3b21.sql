CREATE OR REPLACE FUNCTION public.bump_listing_on_offer()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.transactions
  SET status = 'offer_received'
  WHERE id = NEW.waste_listing_id AND status = 'pending_recycler';
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS offer_bumps_listing ON public.recycler_offers;
CREATE TRIGGER offer_bumps_listing AFTER INSERT ON public.recycler_offers
  FOR EACH ROW EXECUTE FUNCTION public.bump_listing_on_offer();

DROP POLICY IF EXISTS "Recyclers can update pickups sent to them" ON public.transactions;
CREATE POLICY "Recyclers can update pickups sent to them" ON public.transactions
  FOR UPDATE TO authenticated
  USING (recycler_id IN (SELECT r.id FROM public.recyclers r WHERE r.user_id = auth.uid()))
  WITH CHECK (
    recycler_id IN (SELECT r.id FROM public.recyclers r WHERE r.user_id = auth.uid())
    OR (recycler_id IS NULL AND status = 'pending_recycler')
  );