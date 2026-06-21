-- EasyDocument Phase 2 task marketplace foundation.
-- Scope: task creation, nearby discovery, and agent acceptance only.

DO $$
BEGIN
  CREATE TYPE task_status AS ENUM ('CREATED','ACCEPTED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE file_metadata DROP CONSTRAINT IF EXISTS file_metadata_context_check;
ALTER TABLE file_metadata
  ADD CONSTRAINT file_metadata_context_check
  CHECK (context IN ('KYC','PROFILE','SYSTEM','TASK_SUPPORTING'));

CREATE TABLE IF NOT EXISTS document_tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  assigned_agent_user_id UUID REFERENCES users(id),
  task_name VARCHAR(300) NOT NULL,
  document_type VARCHAR(120) NOT NULL,
  organization_name VARCHAR(160) NOT NULL,
  organization_address TEXT NOT NULL,
  organization_location GEOGRAPHY(POINT,4326) NOT NULL,
  request_description TEXT NOT NULL,
  status task_status NOT NULL DEFAULT 'CREATED',
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT document_tasks_acceptance_consistency CHECK (
    (status = 'CREATED' AND assigned_agent_user_id IS NULL AND accepted_at IS NULL)
    OR
    (status = 'ACCEPTED' AND assigned_agent_user_id IS NOT NULL AND accepted_at IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_document_tasks_customer
  ON document_tasks(customer_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_document_tasks_agent
  ON document_tasks(assigned_agent_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_document_tasks_status
  ON document_tasks(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_document_tasks_organization_location
  ON document_tasks USING GIST(organization_location);

CREATE TABLE IF NOT EXISTS task_supporting_files (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID NOT NULL REFERENCES document_tasks(id) ON DELETE CASCADE,
  file_metadata_id UUID NOT NULL REFERENCES file_metadata(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(task_id, file_metadata_id)
);

CREATE INDEX IF NOT EXISTS idx_task_supporting_files_task
  ON task_supporting_files(task_id);

DROP TRIGGER IF EXISTS trg_document_tasks_updated_at ON document_tasks;
CREATE TRIGGER trg_document_tasks_updated_at
BEFORE UPDATE ON document_tasks
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();
