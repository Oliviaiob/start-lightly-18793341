
-- Tighten RLS to staff (admin) only for internal tables, and preserve candidate self-access where applicable.

-- BANK DETAILS: staff only
DROP POLICY IF EXISTS "Authenticated users can view bank details" ON public.bank_details;
DROP POLICY IF EXISTS "Authenticated users can manage bank details" ON public.bank_details;
DROP POLICY IF EXISTS authenticated_read ON public.bank_details;
DROP POLICY IF EXISTS authenticated_insert ON public.bank_details;
DROP POLICY IF EXISTS authenticated_update ON public.bank_details;
DROP POLICY IF EXISTS authenticated_delete ON public.bank_details;
CREATE POLICY staff_all ON public.bank_details FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- CANDIDATES: staff full access; owning candidate can view/update own record
DROP POLICY IF EXISTS authenticated_read ON public.candidates;
DROP POLICY IF EXISTS authenticated_insert ON public.candidates;
DROP POLICY IF EXISTS authenticated_update ON public.candidates;
DROP POLICY IF EXISTS authenticated_delete ON public.candidates;
CREATE POLICY staff_all ON public.candidates FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY candidate_read_own ON public.candidates FOR SELECT TO authenticated
  USING (candidate_user_id = auth.uid());
CREATE POLICY candidate_update_own ON public.candidates FOR UPDATE TO authenticated
  USING (candidate_user_id = auth.uid()) WITH CHECK (candidate_user_id = auth.uid());

-- CANDIDATE NOTES: staff only
DROP POLICY IF EXISTS "Authenticated can view candidate notes" ON public.candidate_notes;
DROP POLICY IF EXISTS "Authenticated can insert candidate notes" ON public.candidate_notes;
DROP POLICY IF EXISTS "Authenticated can update candidate notes" ON public.candidate_notes;
DROP POLICY IF EXISTS "Authenticated can delete candidate notes" ON public.candidate_notes;
CREATE POLICY staff_all ON public.candidate_notes FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- REFERENCES: staff only (owning candidate self-access preserved elsewhere if needed)
DROP POLICY IF EXISTS authenticated_read ON public.references;
DROP POLICY IF EXISTS authenticated_insert ON public.references;
DROP POLICY IF EXISTS authenticated_update ON public.references;
DROP POLICY IF EXISTS authenticated_delete ON public.references;
CREATE POLICY staff_all ON public.references FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- CLIENTS + CLIENT BRANCHES: staff only
DROP POLICY IF EXISTS authenticated_read ON public.clients;
DROP POLICY IF EXISTS authenticated_insert ON public.clients;
DROP POLICY IF EXISTS authenticated_update ON public.clients;
DROP POLICY IF EXISTS authenticated_delete ON public.clients;
CREATE POLICY staff_all ON public.clients FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS authenticated_read ON public.client_branches;
DROP POLICY IF EXISTS authenticated_insert ON public.client_branches;
DROP POLICY IF EXISTS authenticated_update ON public.client_branches;
DROP POLICY IF EXISTS authenticated_delete ON public.client_branches;
CREATE POLICY staff_all ON public.client_branches FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- PROFILES: users can read/update own; staff can read all
DROP POLICY IF EXISTS profiles_select_authenticated ON public.profiles;
CREATE POLICY profiles_select_own_or_staff ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- OPERATIONAL TABLES: staff only
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['bookings','jobs','placements','temp_shifts','job_pipeline','interview_details','compliance_checklists','activity_log','permissions','charge_rate_settings','email_templates']
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS authenticated_read ON public.%I', t);
    EXECUTE format('DROP POLICY IF EXISTS authenticated_insert ON public.%I', t);
    EXECUTE format('DROP POLICY IF EXISTS authenticated_update ON public.%I', t);
    EXECUTE format('DROP POLICY IF EXISTS authenticated_delete ON public.%I', t);
    EXECUTE format('DROP POLICY IF EXISTS "Authenticated can manage %s" ON public.%I', t, t);
    EXECUTE format('CREATE POLICY staff_all ON public.%I FOR ALL TO authenticated USING (public.has_role(auth.uid(), ''admin'')) WITH CHECK (public.has_role(auth.uid(), ''admin''))', t);
  END LOOP;
END $$;

-- TIMESHEETS: staff read/write all; owning candidate keeps its existing candidates_own_timesheets policy
DROP POLICY IF EXISTS authenticated_read ON public.timesheets;
DROP POLICY IF EXISTS authenticated_insert ON public.timesheets;
DROP POLICY IF EXISTS authenticated_update ON public.timesheets;
DROP POLICY IF EXISTS authenticated_delete ON public.timesheets;
CREATE POLICY staff_all ON public.timesheets FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- STORAGE documents bucket: restrict broad authenticated access; keep owner-scoped and staff access
DROP POLICY IF EXISTS "Authenticated can read documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can upload documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can update documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can delete documents" ON storage.objects;
DROP POLICY IF EXISTS authenticated_read_documents ON storage.objects;
DROP POLICY IF EXISTS authenticated_upload_documents ON storage.objects;
DROP POLICY IF EXISTS authenticated_update_documents ON storage.objects;

CREATE POLICY staff_read_documents ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'documents' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY staff_upload_documents ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'documents' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY staff_update_documents ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'documents' AND public.has_role(auth.uid(), 'admin'))
  WITH CHECK (bucket_id = 'documents' AND public.has_role(auth.uid(), 'admin'));
