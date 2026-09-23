ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS data jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE OR REPLACE FUNCTION private.notify_user(
  _user_id uuid, _transaction_id uuid, _type text, _title text, _message text, _data jsonb DEFAULT '{}'::jsonb
) RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  INSERT INTO public.notifications (user_id, transaction_id, type, title, message, data)
  VALUES (_user_id, _transaction_id, _type, _title, _message, coalesce(_data, '{}'::jsonb));
$$;

REVOKE ALL ON FUNCTION private.notify_user(uuid, uuid, text, text, text, jsonb) FROM PUBLIC, anon, authenticated;

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
      coalesce(v_org, 'A recycler') || ' is interested in buying your ' || coalesce(v_category, 'waste') || '.',
      jsonb_strip_nulls(jsonb_build_object('org', v_org, 'category', v_category))
    );
  END IF;
  IF v_recycler_user IS NOT NULL THEN
    PERFORM private.notify_user(
      v_recycler_user, NEW.waste_listing_id, 'purchase_request_sent',
      'Purchase request submitted',
      'Your purchase request has been sent to the collector.',
      '{}'::jsonb
    );
  END IF;
  RETURN NEW;
END;
$$;

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
        'Purchase accepted', 'Collector accepted your purchase request.', '{}'::jsonb);
    END IF;
    PERFORM private.notify_user(NEW.collector_id, NEW.id, 'sale_accepted',
      'Sale accepted', 'Your sale to ' || coalesce(v_org, 'the recycler') || ' has been accepted.',
      jsonb_strip_nulls(jsonb_build_object('org', v_org)));
  ELSIF NEW.status = 'pickup_scheduled' THEN
    PERFORM private.notify_user(NEW.collector_id, NEW.id, 'pickup_scheduled',
      'Pickup scheduled', 'Pickup has been scheduled for ' || NEW.listing_code || '.',
      jsonb_strip_nulls(jsonb_build_object('code', NEW.listing_code)));
  ELSIF NEW.status = 'handed_over' THEN
    IF v_recycler_user IS NOT NULL THEN
      PERFORM private.notify_user(v_recycler_user, NEW.id, 'handover_confirmed',
        'Handover confirmed', 'Collector marked the waste as handed over.', '{}'::jsonb);
    END IF;
  ELSIF NEW.status = 'completed' THEN
    PERFORM private.notify_user(NEW.collector_id, NEW.id, 'completed',
      'Transaction completed', 'Transaction ' || NEW.receipt_number || ' has been completed.',
      jsonb_strip_nulls(jsonb_build_object('receipt', NEW.receipt_number)));
    IF v_recycler_user IS NOT NULL THEN
      PERFORM private.notify_user(v_recycler_user, NEW.id, 'completed',
        'Transaction completed', 'Transaction ' || NEW.receipt_number || ' has been completed.',
        jsonb_strip_nulls(jsonb_build_object('receipt', NEW.receipt_number)));
    END IF;
  END IF;
  RETURN NEW;
END;
$$;