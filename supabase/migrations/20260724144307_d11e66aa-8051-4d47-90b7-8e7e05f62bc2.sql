
CREATE POLICY "Staff can read compliance docs"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'compliance-documents' AND EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid()
    AND role IN ('admin','management','recruiter') AND is_active = true
  )
);

CREATE POLICY "Staff can upload compliance docs"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'compliance-documents' AND EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid()
    AND role IN ('admin','management','recruiter') AND is_active = true
  )
);

CREATE POLICY "Staff can update compliance docs"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'compliance-documents' AND EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid()
    AND role IN ('admin','management','recruiter') AND is_active = true
  )
);

CREATE POLICY "Staff can delete compliance docs"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'compliance-documents' AND EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid()
    AND role IN ('admin','management','recruiter') AND is_active = true
  )
);
