-- 1. notifications
CREATE TABLE public.notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  transaction_id uuid REFERENCES public.transactions(id) ON DELETE CASCADE,
  type text NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, UPDATE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notifications"
  ON public.notifications FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can mark their own notifications read"
  ON public.notifications FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX notifications_user_idx ON public.notifications (user_id, created_at DESC);

-- 2. accepted_at
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS accepted_at timestamp with time zone;

-- 3. notification writer (bypasses RLS deliberately; only called from triggers)
CREATE OR REPLACE FUNCTION private.notify_user(
  _user_id uuid, _transaction_id uuid, _type text, _title text, _message text
) RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  INSERT INTO public.notifications (user_id, transaction_id, type, title, message)
  VALUES (_user_id, _transaction_id, _type, _title, _message);
$$;

REVOKE ALL ON FUNCTION private.notify_user(uuid, uuid, text, text, text) FROM PUBLIC, anon, authenticated;

-- 4. purchase request notifications
CREATE OR REPLACE FUNCTION private.notify_on_offer() RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_collector uuid;
  v_recycler_user uuid;
  v_org text;
  v_category text;
BEGIN
  SELECT t.collector_id, t.category INTO v_collector, v_category
  FROM public.transactions t WHERE t.id = NEW.waste_listing_id;
  SELECT r.user_id, r.name INTO v_recycler_user, v_org
  FROM public.recyclers r WHERE r.id = NEW.recycler_id;

  IF v_collector IS NOT NULL THEN
    PERFORM private.notify_user(
      v_collector, NEW.waste_listing_id, 'purchase_request',
      'New recycler request',
      coalesce(v_org, 'A recycler') || ' is interested in buying your ' || coalesce(v_category, 'waste') || '.'
    );
  END IF;
  IF v_recycler_user IS NOT NULL THEN
    PERFORM private.notify_user(
      v_recycler_user, NEW.waste_listing_id, 'purchase_request_sent',
      'Purchase request submitted',
      'Your purchase request has been sent to the collector.'
    );
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER offer_notifies AFTER INSERT ON public.recycler_offers
FOR EACH ROW EXECUTE FUNCTION private.notify_on_offer();

-- 5. lifecycle notifications
CREATE OR REPLACE FUNCTION private.notify_on_transaction_status() RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_recycler_user uuid;
  v_org text;
BEGIN
  IF NEW.status = OLD.status THEN RETURN NEW; END IF;

  IF NEW.recycler_id IS NOT NULL THEN
    SELECT r.user_id, r.name INTO v_recycler_user, v_org
    FROM public.recyclers r WHERE r.id = NEW.recycler_id;
  END IF;

  IF NEW.status = 'sale_accepted' THEN
    IF v_recycler_user IS NOT NULL THEN
      PERFORM private.notify_user(v_recycler_user, NEW.id, 'purchase_accepted',
        'Purchase accepted', 'Collector accepted your purchase request.');
    END IF;
    PERFORM private.notify_user(NEW.collector_id, NEW.id, 'sale_accepted',
      'Sale accepted', 'Your sale to ' || coalesce(v_org, 'the recycler') || ' has been accepted.');
  ELSIF NEW.status = 'pickup_scheduled' THEN
    PERFORM private.notify_user(NEW.collector_id, NEW.id, 'pickup_scheduled',
      'Pickup scheduled', 'Pickup has been scheduled for ' || NEW.listing_code || '.');
  ELSIF NEW.status = 'handed_over' THEN
    IF v_recycler_user IS NOT NULL THEN
      PERFORM private.notify_user(v_recycler_user, NEW.id, 'handover_confirmed',
        'Handover confirmed', 'Collector marked the waste as handed over.');
    END IF;
  ELSIF NEW.status = 'completed' THEN
    PERFORM private.notify_user(NEW.collector_id, NEW.id, 'completed',
      'Transaction completed', 'Transaction ' || NEW.receipt_number || ' has been completed.');
    IF v_recycler_user IS NOT NULL THEN
      PERFORM private.notify_user(v_recycler_user, NEW.id, 'completed',
        'Transaction completed', 'Transaction ' || NEW.receipt_number || ' has been completed.');
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER transaction_status_notifies AFTER UPDATE OF status ON public.transactions
FOR EACH ROW EXECUTE FUNCTION private.notify_on_transaction_status();

-- 6. record accepted_at
CREATE OR REPLACE FUNCTION private.stamp_accepted_at() RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'sale_accepted' AND OLD.status <> 'sale_accepted' AND NEW.accepted_at IS NULL THEN
    NEW.accepted_at := now();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER transaction_stamps_accepted BEFORE UPDATE OF status ON public.transactions
FOR EACH ROW EXECUTE FUNCTION private.stamp_accepted_at();

-- 7. guarded exact recycler location
CREATE OR REPLACE FUNCTION public.recycler_exact_location(_recycler_id uuid)
RETURNS TABLE (name text, address text, city text, state text, postal_code text, latitude double precision, longitude double precision)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT r.name, r.address, r.city, r.state, r.postal_code, r.latitude, r.longitude
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

GRANT EXECUTE ON FUNCTION public.recycler_exact_location(uuid) TO authenticated;