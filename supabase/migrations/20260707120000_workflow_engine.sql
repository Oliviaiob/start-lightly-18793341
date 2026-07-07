-- ── AI Workflow Engine ────────────────────────────────────────────────────────
-- Universal workflow state layer for all CRM entities.
-- One row per (entity_type, entity_id, item_key).
-- Shared across all AI agents: Sophie, Mia, Grace, Sammie, Lilly.

CREATE TABLE IF NOT EXISTS workflow_states (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type      text NOT NULL,          -- candidate | client | job | placement | interview | compliance_item
  entity_id        uuid NOT NULL,
  item_key         text NOT NULL DEFAULT '', -- sub-item key, e.g. 'proof_of_id'; empty for top-level records
  assigned_agent   text,                    -- sophie | mia | grace | sammie | lilly
  current_status   text NOT NULL DEFAULT 'pending',
  next_action      text,
  waiting_on       text,                    -- Candidate | Referee | Manager | Client | Sophie | System | etc.
  priority         integer NOT NULL DEFAULT 5, -- 1 = critical, 5 = normal, 9 = low
  last_activity_at timestamptz,
  last_activity_desc text,
  next_followup_at timestamptz,
  ai_recommendation text,
  created_at       timestamptz DEFAULT now(),
  updated_at       timestamptz DEFAULT now(),
  UNIQUE (entity_type, entity_id, item_key)
);

CREATE TABLE IF NOT EXISTS workflow_activity (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type  text NOT NULL,
  entity_id    uuid NOT NULL,
  item_key     text NOT NULL DEFAULT '',
  description  text NOT NULL,
  source       text NOT NULL DEFAULT 'system', -- system | ai | recruiter
  agent        text,                           -- which AI agent or recruiter name
  created_at   timestamptz DEFAULT now()
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_workflow_states_entity ON workflow_states (entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_workflow_activity_entity ON workflow_activity (entity_type, entity_id, item_key, created_at DESC);

-- RLS
ALTER TABLE workflow_states ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_workflow_states" ON workflow_states FOR ALL TO authenticated USING (true) WITH CHECK (true);

ALTER TABLE workflow_activity ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth_workflow_activity" ON workflow_activity FOR ALL TO authenticated USING (true) WITH CHECK (true);
