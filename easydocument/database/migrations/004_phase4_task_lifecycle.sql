-- EasyDocument Phase 4 task lifecycle foundation.
-- Scope: post-acceptance deal confirmation, progress tracking, expected completion date, and task timelines only.

ALTER TYPE task_status ADD VALUE IF NOT EXISTS 'DEAL_CONFIRMED' AFTER 'ACCEPTED';
ALTER TYPE task_status ADD VALUE IF NOT EXISTS 'IN_PROGRESS' AFTER 'DEAL_CONFIRMED';
ALTER TYPE task_status ADD VALUE IF NOT EXISTS 'DOCUMENT_REQUESTED' AFTER 'IN_PROGRESS';
ALTER TYPE task_status ADD VALUE IF NOT EXISTS 'VISITED_ORGANIZATION' AFTER 'DOCUMENT_REQUESTED';
ALTER TYPE task_status ADD VALUE IF NOT EXISTS 'DOCUMENT_COLLECTED' AFTER 'VISITED_ORGANIZATION';
ALTER TYPE task_status ADD VALUE IF NOT EXISTS 'READY_FOR_DELIVERY' AFTER 'DOCUMENT_COLLECTED';
ALTER TYPE task_status ADD VALUE IF NOT EXISTS 'DELIVERED' AFTER 'READY_FOR_DELIVERY';
ALTER TYPE task_status ADD VALUE IF NOT EXISTS 'COMPLETED' AFTER 'DELIVERED';
ALTER TYPE task_status ADD VALUE IF NOT EXISTS 'CANCELLED' AFTER 'COMPLETED';

ALTER TABLE document_tasks
  ADD COLUMN IF NOT EXISTS expected_completion_date DATE;

ALTER TABLE document_tasks DROP CONSTRAINT IF EXISTS document_tasks_acceptance_consistency;
ALTER TABLE document_tasks DROP CONSTRAINT IF EXISTS document_tasks_assignment_consistency;
ALTER TABLE document_tasks
  ADD CONSTRAINT document_tasks_assignment_consistency CHECK (
    (
      status = 'CREATED'
      AND assigned_agent_user_id IS NULL
      AND accepted_at IS NULL
    )
    OR
    (
      status = 'CANCELLED'
      AND (
        (assigned_agent_user_id IS NULL AND accepted_at IS NULL)
        OR
        (assigned_agent_user_id IS NOT NULL AND accepted_at IS NOT NULL)
      )
    )
    OR
    (
      status NOT IN ('CREATED','CANCELLED')
      AND assigned_agent_user_id IS NOT NULL
      AND accepted_at IS NOT NULL
    )
  );

CREATE TABLE IF NOT EXISTS task_status_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID NOT NULL REFERENCES document_tasks(id) ON DELETE CASCADE,
  actor_user_id UUID NOT NULL REFERENCES users(id),
  actor_role VARCHAR(30) NOT NULL,
  event_type VARCHAR(40) NOT NULL DEFAULT 'STATUS_CHANGE'
    CHECK (event_type IN ('STATUS_CHANGE','EXPECTED_DATE_UPDATED')),
  from_status task_status,
  to_status task_status NOT NULL,
  note TEXT,
  expected_completion_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_task_status_history_task_created
  ON task_status_history(task_id, created_at ASC);

CREATE INDEX IF NOT EXISTS idx_task_status_history_actor
  ON task_status_history(actor_user_id, created_at DESC);

INSERT INTO task_status_history (
  task_id,
  actor_user_id,
  actor_role,
  event_type,
  from_status,
  to_status,
  note,
  created_at
)
SELECT
  task.id,
  task.customer_user_id,
  'CUSTOMER',
  'STATUS_CHANGE',
  NULL,
  'CREATED',
  'Task created',
  task.created_at
FROM document_tasks task
WHERE NOT EXISTS (
  SELECT 1
  FROM task_status_history history
  WHERE history.task_id = task.id
    AND history.from_status IS NULL
    AND history.to_status = 'CREATED'
);

INSERT INTO task_status_history (
  task_id,
  actor_user_id,
  actor_role,
  event_type,
  from_status,
  to_status,
  note,
  created_at
)
SELECT
  task.id,
  task.assigned_agent_user_id,
  'AGENT',
  'STATUS_CHANGE',
  'CREATED',
  task.status,
  'Task accepted',
  COALESCE(task.accepted_at, task.updated_at)
FROM document_tasks task
WHERE task.status = 'ACCEPTED'
  AND task.assigned_agent_user_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM task_status_history history
    WHERE history.task_id = task.id
      AND history.from_status = 'CREATED'
      AND history.to_status = 'ACCEPTED'
  );
