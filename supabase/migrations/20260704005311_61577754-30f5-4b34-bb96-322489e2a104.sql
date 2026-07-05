
DROP POLICY IF EXISTS "Authenticated users can manage client branches" ON public.client_branches;
DROP POLICY IF EXISTS "Authenticated can manage shortlist" ON public.shift_shortlist;
DROP POLICY IF EXISTS "authenticated_read" ON public.shift_shortlist;
DROP POLICY IF EXISTS "authenticated_insert" ON public.shift_shortlist;
DROP POLICY IF EXISTS "authenticated_update" ON public.shift_shortlist;
DROP POLICY IF EXISTS "authenticated_delete" ON public.shift_shortlist;

CREATE POLICY "Staff can manage client branches"
ON public.client_branches FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND role IN ('admin', 'management', 'recruiter')
      AND is_active = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND role IN ('admin', 'management', 'recruiter')
      AND is_active = true
  )
);

CREATE POLICY "Staff can manage shortlist"
ON public.shift_shortlist FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND role IN ('admin', 'management', 'recruiter')
      AND is_active = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND role IN ('admin', 'management', 'recruiter')
      AND is_active = true
  )
);
