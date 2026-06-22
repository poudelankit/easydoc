-- EasyDocument Phase 5 call foundation.
-- Scope: call session metadata, call status history, and Socket.IO WebRTC signaling support only.

DO $$
BEGIN
  CREATE TYPE call_type AS ENUM ('AUDIO','VIDEO');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE call_status AS ENUM (
    'REQUESTED',
    'RINGING',
    'ACCEPTED',
    'DECLINED',
    'MISSED',
    'ENDED',
    'FAILED'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS call_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID NOT NULL REFERENCES document_tasks(id) ON DELETE CASCADE,
  room_id UUID NOT NULL REFERENCES communication_rooms(id) ON DELETE CASCADE,
  initiated_by_user_id UUID NOT NULL REFERENCES users(id),
  call_type call_type NOT NULL,
  status call_status NOT NULL DEFAULT 'REQUESTED',
  started_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_call_sessions_task_created
  ON call_sessions(task_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_call_sessions_status
  ON call_sessions(status, created_at DESC);

CREATE TABLE IF NOT EXISTS call_status_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  call_session_id UUID NOT NULL REFERENCES call_sessions(id) ON DELETE CASCADE,
  task_id UUID NOT NULL REFERENCES document_tasks(id) ON DELETE CASCADE,
  actor_user_id UUID NOT NULL REFERENCES users(id),
  actor_role VARCHAR(30) NOT NULL,
  from_status call_status,
  to_status call_status NOT NULL,
  note TEXT,
  signaling_event VARCHAR(80),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_call_status_history_call_created
  ON call_status_history(call_session_id, created_at ASC);

CREATE INDEX IF NOT EXISTS idx_call_status_history_task_created
  ON call_status_history(task_id, created_at ASC);

DROP TRIGGER IF EXISTS trg_call_sessions_updated_at ON call_sessions;
CREATE TRIGGER trg_call_sessions_updated_at
BEFORE UPDATE ON call_sessions
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();
