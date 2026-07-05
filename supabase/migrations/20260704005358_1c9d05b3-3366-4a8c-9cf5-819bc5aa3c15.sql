
DROP POLICY IF EXISTS "Authenticated can insert charge rate settings" ON public.charge_rate_settings;
DROP POLICY IF EXISTS "Authenticated can update charge rate settings" ON public.charge_rate_settings;

CREATE POLICY "Admins can insert charge rate settings"
ON public.charge_rate_settings FOR INSERT TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update charge rate settings"
ON public.charge_rate_settings FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
