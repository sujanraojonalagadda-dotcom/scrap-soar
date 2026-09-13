DROP TRIGGER IF EXISTS offer_bumps_listing ON public.recycler_offers;
DROP FUNCTION IF EXISTS public.bump_listing_on_offer();

CREATE OR REPLACE FUNCTION private.bump_listing_on_offer()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.transactions
  SET status = 'offer_received'
  WHERE id = NEW.waste_listing_id AND status = 'pending_recycler';
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION private.bump_listing_on_offer() FROM public, anon, authenticated;

CREATE TRIGGER offer_bumps_listing AFTER INSERT ON public.recycler_offers
  FOR EACH ROW EXECUTE FUNCTION private.bump_listing_on_offer();