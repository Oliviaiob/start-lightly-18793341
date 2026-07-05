-- SOAR CRM — Demo seed data
-- Run this in your Supabase SQL editor (ltpsljknjenpomsxixlx)
-- Safe to run multiple times (uses INSERT ... ON CONFLICT DO NOTHING)

-- ── Clients ──────────────────────────────────────────────────────────────────

INSERT INTO public.clients (id, company_name, client_type, contact_name, contact_email, contact_phone, address, postcode, status, tob_signed, tob_signed_date, perm_fee_percentage, temp_rate_per_hour, notes, last_activity_date)
VALUES
  (
    'a1000000-0000-0000-0000-000000000001',
    'Little Stars Nursery',
    'nursery',
    'Sarah Mitchell',
    'sarah@littlestars.co.uk',
    '020 7946 0101',
    '14 Blossom Lane',
    'NW3 2PQ',
    'active',
    true,
    '2026-01-15',
    15.0,
    12.50,
    'Long-standing client. Prefers Level 3+ candidates. Two rooms — Baby and Toddler.',
    CURRENT_DATE
  ),
  (
    'a1000000-0000-0000-0000-000000000002',
    'Stanmore Primary School',
    'school',
    'James Hargreaves',
    'j.hargreaves@stanmore.sch.uk',
    '020 8954 1122',
    '82 Church Road',
    'HA7 4AA',
    'active',
    true,
    '2026-03-01',
    12.5,
    13.00,
    'Needs cover staff for TA roles and breakfast/after-school club. Good payer.',
    CURRENT_DATE
  ),
  (
    'a1000000-0000-0000-0000-000000000003',
    'The Anderson Family',
    'private_family',
    'Claire Anderson',
    'claire.anderson@gmail.com',
    '07700 900321',
    '9 The Grove',
    'W5 3LN',
    'prospect',
    false,
    NULL,
    20.0,
    NULL,
    'Looking for a live-out nanny, 3 days per week. Two children aged 2 and 5. ToB sent, awaiting signature.',
    CURRENT_DATE
  )
ON CONFLICT (id) DO NOTHING;

-- ── Client branches ───────────────────────────────────────────────────────────

INSERT INTO public.client_branches (id, client_id, branch_name, location, postcode)
VALUES
  ('b1000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001', 'Main Nursery', 'Hampstead', 'NW3 2PQ'),
  ('b1000000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000002', 'Main School', 'Stanmore', 'HA7 4AA')
ON CONFLICT (id) DO NOTHING;

-- ── Jobs ─────────────────────────────────────────────────────────────────────

INSERT INTO public.jobs (id, client_id, title, qualification_required, salary_min, salary_max, location_postcode, description, status, posted_at)
VALUES
  (
    'c1000000-0000-0000-0000-000000000001',
    'a1000000-0000-0000-0000-000000000001',
    'Room Leader — Toddler Room',
    'level_3',
    26000,
    29000,
    'NW3 2PQ',
    'Little Stars Nursery are looking for an experienced Level 3 Room Leader to lead their Toddler Room (18 months – 3 years). The successful candidate will plan and deliver the EYFS curriculum, mentor junior staff, and build strong relationships with parents.',
    'live',
    NOW() - INTERVAL '3 days'
  ),
  (
    'c1000000-0000-0000-0000-000000000002',
    'a1000000-0000-0000-0000-000000000001',
    'Nursery Practitioner — Level 2',
    'level_2',
    22000,
    24500,
    'NW3 2PQ',
    'Seeking a qualified Level 2 Nursery Practitioner to join the Baby Room team at Little Stars. Full-time, permanent position. Strong knowledge of EYFS and a passion for early years education required.',
    'interviewing',
    NOW() - INTERVAL '10 days'
  ),
  (
    'c1000000-0000-0000-0000-000000000003',
    'a1000000-0000-0000-0000-000000000002',
    'Teaching Assistant — KS1',
    'level_2',
    19500,
    22000,
    'HA7 4AA',
    'Stanmore Primary School require a KS1 Teaching Assistant to support children aged 5–7 in the classroom. Experience with SEN provision is desirable. Term-time only, 30 hours per week.',
    'live',
    NOW() - INTERVAL '5 days'
  )
ON CONFLICT (id) DO NOTHING;

-- ── Job pipeline entries (needed for interviews) ──────────────────────────────

-- Link Sophie Bramley (perm) to Room Leader job
INSERT INTO public.job_pipeline (id, job_id, candidate_id, stage)
SELECT
  'd1000000-0000-0000-0000-000000000001',
  'c1000000-0000-0000-0000-000000000001',
  c.id,
  'interview_arranged'
FROM public.candidates c
WHERE c.first_name = 'Sophie' AND c.last_name = 'Bramley'
LIMIT 1
ON CONFLICT (id) DO NOTHING;

-- Link Edward Prideaux (temp) to Teaching Assistant job
INSERT INTO public.job_pipeline (id, job_id, candidate_id, stage)
SELECT
  'd1000000-0000-0000-0000-000000000002',
  'c1000000-0000-0000-0000-000000000003',
  c.id,
  'interview_arranged'
FROM public.candidates c
WHERE c.first_name = 'Edward' AND c.last_name = 'Prideaux'
LIMIT 1
ON CONFLICT (id) DO NOTHING;

-- ── Demo interviews ───────────────────────────────────────────────────────────

INSERT INTO public.interview_details (id, pipeline_id, interview_date, interview_time, interview_type, interviewer_name, location, notes, outcome)
VALUES
  (
    'e1000000-0000-0000-0000-000000000001',
    'd1000000-0000-0000-0000-000000000001',
    (CURRENT_DATE + INTERVAL '3 days')::date,
    '10:30',
    'in_person',
    'Sarah Mitchell',
    '14 Blossom Lane, NW3 2PQ',
    'Panel interview with Sarah and deputy. Candidate to bring portfolio and DBS certificate.',
    NULL
  ),
  (
    'e1000000-0000-0000-0000-000000000002',
    'd1000000-0000-0000-0000-000000000002',
    (CURRENT_DATE - INTERVAL '5 days')::date,
    '14:00',
    'phone',
    'James Hargreaves',
    NULL,
    'First-stage phone interview for TA role. Ask about SEN experience.',
    'successful'
  )
ON CONFLICT (id) DO NOTHING;
