-- Admin RLS policies for user_paints
-- These are additive — existing auth.uid() = user_id policies remain in place.

CREATE POLICY "Admins can read all user_paints"
  ON public.user_paints FOR SELECT TO authenticated
  USING ('admin' = ANY(public.get_user_roles(auth.uid())));

CREATE POLICY "Admins can insert into any user_paints"
  ON public.user_paints FOR INSERT TO authenticated
  WITH CHECK ('admin' = ANY(public.get_user_roles(auth.uid())));

CREATE POLICY "Admins can delete any user_paints"
  ON public.user_paints FOR DELETE TO authenticated
  USING ('admin' = ANY(public.get_user_roles(auth.uid())));
