-- EasyDocument Phase 9 notification foundation.
-- Scope: stored in-app notifications with placeholder delivery channels for later SMS/push.

DO $$
BEGIN
  CREATE TYPE notification_type AS ENUM (
    'OTP_SENT',
    'AGENT_VERIFICATION_APPROVED',
    'AGENT_VERIFICATION_REJECTED',
    'TASK_CREATED',
    'TASK_ACCEPTED',
    'DEAL_CONFIRMED',
    'TASK_STATUS_UPDATED',
    'MESSAGE_RECEIVED',
    'ATTACHMENT_RECEIVED',
    'CALL_REQUESTED',
    'CALL_MISSED',
    'DISPUTE_OPENED',
    'DISPUTE_STATUS_UPDATED',
    'DISPUTE_RESOLVED',
    'REVIEW_RECEIVED'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE notification_delivery_channel AS ENUM (
    'IN_APP',
    'SMS_PLACEHOLDER',
    'PUSH_PLACEHOLDER'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  recipient_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  actor_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  type notification_type NOT NULL,
  delivery_channel notification_delivery_channel NOT NULL DEFAULT 'IN_APP',
  title VARCHAR(160) NOT NULL,
  body TEXT NOT NULL,
  related_task_id UUID REFERENCES document_tasks(id) ON DELETE SET NULL,
  related_dispute_id UUID REFERENCES task_disputes(id) ON DELETE SET NULL,
  related_review_id UUID REFERENCES task_reviews(id) ON DELETE SET NULL,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_recipient_created
  ON notifications(recipient_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_recipient_unread
  ON notifications(recipient_user_id, created_at DESC)
  WHERE read_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_notifications_type_created
  ON notifications(type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_task
  ON notifications(related_task_id, created_at DESC)
  WHERE related_task_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_notifications_dispute
  ON notifications(related_dispute_id, created_at DESC)
  WHERE related_dispute_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_notifications_review
  ON notifications(related_review_id, created_at DESC)
  WHERE related_review_id IS NOT NULL;
