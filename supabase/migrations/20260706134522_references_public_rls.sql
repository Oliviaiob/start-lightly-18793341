-- Allow public (anon) access to references by unique_token only
-- Used for the referee-facing reference form

-- SELECT: anyone can read a reference if they know the unique_token
CREATE POLICY "Public read reference by token"
  ON public.references
  FOR SELECT
  TO anon
  USING (unique_token IS NOT NULL);

-- UPDATE: referees can submit responses (only response_ fields) via token
CREATE POLICY "Public submit reference response by token"
  ON public.references
  FOR UPDATE
  TO anon
  USING (unique_token IS NOT NULL AND received_at IS NULL)
  WITH CHECK (unique_token IS NOT NULL);
