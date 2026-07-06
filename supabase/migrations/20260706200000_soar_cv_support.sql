-- Drop the document_type check constraint so we can use "soar_cv" as a type
-- (constraint may already be dropped — use IF EXISTS equivalent via DO block)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'candidate_documents_document_type_check'
      AND table_name = 'candidate_documents'
  ) THEN
    ALTER TABLE public.candidate_documents
      DROP CONSTRAINT candidate_documents_document_type_check;
  END IF;
END $$;

-- Ensure cv_soar_url column exists on candidates (it should already, but safety check)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'candidates' AND column_name = 'cv_soar_url'
  ) THEN
    ALTER TABLE public.candidates ADD COLUMN cv_soar_url text;
  END IF;
END $$;
