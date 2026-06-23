-- EasyDocument Phase 7 dispute and admin mediation foundation.
-- Scope: task-linked disputes, participant-visible status/resolution, and admin-only mediation notes.

DO $$
BEGIN
  CREATE TYPE dispute_status AS ENUM (
    'OPEN',
    'UNDER_REVIEW',
    'CUSTOMER_ACTION_REQUIRED',
    'AGENT_ACTION_REQUIRED',
    'RESOLVED',
    'REJECTED',
    'CANCELLED'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS task_disputes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID NOT NULL REFERENCES document_tasks(id) ON DELETE CASCADE,
  customer_user_id UUID NOT NULL REFERENCES users(id),
  agent_user_id UUID NOT NULL REFERENCES users(id),
  room_id UUID NOT NULL REFERENCES communication_rooms(id),
  reason VARCHAR(160) NOT NULL,
  description TEXT NOT NULL,
  opened_by_user_id UUID NOT NULL REFERENCES users(id),
  opened_by_role VARCHAR(30) NOT NULL CHECK (opened_by_role IN ('CUSTOMER','AGENT')),
  status dispute_status NOT NULL DEFAULT 'OPEN',
  resolution_summary TEXT,
  resolved_by_admin_user_id UUID REFERENCES users(id),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT task_disputes_distinct_participants CHECK (customer_user_id <> agent_user_id)
);

CREATE INDEX IF NOT EXISTS idx_task_disputes_task_created
  ON task_disputes(task_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_task_disputes_status_created
  ON task_disputes(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_task_disputes_customer_created
  ON task_disputes(customer_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_task_disputes_agent_created
  ON task_disputes(agent_user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS dispute_status_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  dispute_id UUID NOT NULL REFERENCES task_disputes(id) ON DELETE CASCADE,
  actor_user_id UUID NOT NULL REFERENCES users(id),
  actor_role VARCHAR(30) NOT NULL,
  old_status dispute_status,
  new_status dispute_status NOT NULL,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dispute_status_history_dispute_created
  ON dispute_status_history(dispute_id, created_at ASC);

CREATE TABLE IF NOT EXISTS dispute_mediation_notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  dispute_id UUID NOT NULL REFERENCES task_disputes(id) ON DELETE CASCADE,
  admin_user_id UUID NOT NULL REFERENCES users(id),
  note TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dispute_mediation_notes_dispute_created
  ON dispute_mediation_notes(dispute_id, created_at DESC);

DROP TRIGGER IF EXISTS trg_task_disputes_updated_at ON task_disputes;
CREATE TRIGGER trg_task_disputes_updated_at
BEFORE UPDATE ON task_disputes
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();
