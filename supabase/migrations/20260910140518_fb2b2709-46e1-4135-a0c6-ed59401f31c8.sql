CREATE TABLE public.recyclers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  name text NOT NULL,
  location text,
  materials text[] NOT NULL DEFAULT '{}',
  rate_per_kg numeric(10,2),
  verified boolean NOT NULL DEFAULT false,
  verification_date date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.recyclers TO authenticated;
GRANT ALL ON public.recyclers TO service_role;
ALTER TABLE public.recyclers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Signed-in users can view recyclers"
  ON public.recyclers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Recyclers can create their own listing"
  ON public.recyclers FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Recyclers can update their own listing"
  ON public.recyclers FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_recyclers_updated_at BEFORE UPDATE ON public.recyclers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.owns_recycler(_recycler_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.recyclers r WHERE r.id = _recycler_id AND r.user_id = _user_id)
$$;

CREATE SEQUENCE public.receipt_seq START 1;

CREATE TABLE public.transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  collector_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  recycler_id uuid REFERENCES public.recyclers ON DELETE SET NULL,
  category text NOT NULL,
  weight_kg numeric(10,2) NOT NULL,
  condition text NOT NULL,
  indicative_price numeric(10,2),
  final_weight_kg numeric(10,2),
  final_price numeric(10,2),
  status text NOT NULL DEFAULT 'pending',
  handover_code text,
  otp_verified boolean NOT NULL DEFAULT false,
  payment_status text NOT NULL DEFAULT 'unpaid',
  payment_method text,
  payment_reference text,
  paid_at timestamptz,
  receipt_number text NOT NULL DEFAULT 'KC-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('public.receipt_seq')::text, 6, '0'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.transactions TO authenticated;
GRANT ALL ON public.transactions TO service_role;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Collectors can view their own pickups"
  ON public.transactions FOR SELECT TO authenticated USING (auth.uid() = collector_id);
CREATE POLICY "Recyclers can view pickups sent to them"
  ON public.transactions FOR SELECT TO authenticated USING (public.owns_recycler(recycler_id, auth.uid()));
CREATE POLICY "Collectors can create their own pickups"
  ON public.transactions FOR INSERT TO authenticated WITH CHECK (auth.uid() = collector_id);
CREATE POLICY "Collectors can update their pending pickups"
  ON public.transactions FOR UPDATE TO authenticated
  USING (auth.uid() = collector_id AND status IN ('pending','accepted'))
  WITH CHECK (auth.uid() = collector_id);
CREATE POLICY "Recyclers can update pickups sent to them"
  ON public.transactions FOR UPDATE TO authenticated
  USING (public.owns_recycler(recycler_id, auth.uid()))
  WITH CHECK (public.owns_recycler(recycler_id, auth.uid()));

CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

GRANT USAGE, SELECT ON SEQUENCE public.receipt_seq TO authenticated, service_role;