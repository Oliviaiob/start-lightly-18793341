-- Allow authenticated users full access to candidate_documents
CREATE POLICY "Authenticated users can insert candidate_documents"
  ON public.candidate_documents FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can select candidate_documents"
  ON public.candidate_documents FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can update candidate_documents"
  ON public.candidate_documents FOR UPDATE TO authenticated
  USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated users can delete candidate_documents"
  ON public.candidate_documents FOR DELETE TO authenticated
  USING (true);
