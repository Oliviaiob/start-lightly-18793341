-- ── AI Workflow Engine v2 ─────────────────────────────────────────────────────
-- Adds: override_reason, locked_by_human, due_status, confidence_score, handover_to

ALTER TABLE workflow_states
  ADD COLUMN IF NOT EXISTS override_reason   text,
  ADD COLUMN IF NOT EXISTS locked_by_human   boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS due_status        text,        -- overdue | due_today | scheduled | no_action_needed
  ADD COLUMN IF NOT EXISTS confidence_score  numeric(5,2), -- 0.00–100.00 written by AI
  ADD COLUMN IF NOT EXISTS handover_to       text;        -- agent to formally pass ownership to
