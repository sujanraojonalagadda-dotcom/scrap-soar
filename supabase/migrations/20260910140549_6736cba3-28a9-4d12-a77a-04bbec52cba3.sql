DROP POLICY "Recyclers can view pickups sent to them" ON public.transactions;
DROP POLICY "Recyclers can update pickups sent to them" ON public.transactions;

CREATE POLICY "Recyclers can view pickups sent to them"
  ON public.transactions FOR SELECT TO authenticated
  USING (recycler_id IN (SELECT r.id FROM public.recyclers r WHERE r.user_id = auth.uid()));

CREATE POLICY "Recyclers can update pickups sent to them"
  ON public.transactions FOR UPDATE TO authenticated
  USING (recycler_id IN (SELECT r.id FROM public.recyclers r WHERE r.user_id = auth.uid()))
  WITH CHECK (recycler_id IN (SELECT r.id FROM public.recyclers r WHERE r.user_id = auth.uid()));

DROP FUNCTION IF EXISTS public.owns_recycler(uuid, uuid);