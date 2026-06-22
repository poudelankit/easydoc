-- EasyDocument Phase 3 communication foundation.
-- Scope: accepted-task rooms, text messages, read receipts, typing events, and attachment placeholders only.

ALTER TABLE file_metadata DROP CONSTRAINT IF EXISTS file_metadata_context_check;
ALTER TABLE file_metadata
  ADD CONSTRAINT file_metadata_context_check
  CHECK (context IN ('KYC','PROFILE','SYSTEM','TASK_SUPPORTING','CHAT_ATTACHMENT'));

CREATE TABLE IF NOT EXISTS communication_rooms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID NOT NULL UNIQUE REFERENCES document_tasks(id) ON DELETE CASCADE,
  customer_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  agent_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT communication_rooms_distinct_participants CHECK (customer_user_id <> agent_user_id)
);

CREATE INDEX IF NOT EXISTS idx_communication_rooms_customer
  ON communication_rooms(customer_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_communication_rooms_agent
  ON communication_rooms(agent_user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS communication_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id UUID NOT NULL REFERENCES communication_rooms(id) ON DELETE CASCADE,
  sender_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body TEXT NOT NULL CHECK (length(trim(body)) > 0),
  message_type VARCHAR(30) NOT NULL DEFAULT 'TEXT' CHECK (message_type IN ('TEXT')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_communication_messages_room_created
  ON communication_messages(room_id, created_at ASC);

CREATE TABLE IF NOT EXISTS communication_attachments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id UUID NOT NULL REFERENCES communication_rooms(id) ON DELETE CASCADE,
  uploaded_by_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  file_metadata_id UUID NOT NULL UNIQUE REFERENCES file_metadata(id) ON DELETE CASCADE,
  attachment_type VARCHAR(30) NOT NULL CHECK (attachment_type IN ('IMAGE','DOCUMENT','AUDIO','VIDEO')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_communication_attachments_room
  ON communication_attachments(room_id, created_at DESC);

CREATE TABLE IF NOT EXISTS communication_message_attachments (
  message_id UUID NOT NULL REFERENCES communication_messages(id) ON DELETE CASCADE,
  attachment_id UUID NOT NULL REFERENCES communication_attachments(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (message_id, attachment_id)
);

CREATE TABLE IF NOT EXISTS communication_message_reads (
  message_id UUID NOT NULL REFERENCES communication_messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  read_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (message_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_communication_message_reads_user
  ON communication_message_reads(user_id, read_at DESC);

DROP TRIGGER IF EXISTS trg_communication_rooms_updated_at ON communication_rooms;
CREATE TRIGGER trg_communication_rooms_updated_at
BEFORE UPDATE ON communication_rooms
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();
