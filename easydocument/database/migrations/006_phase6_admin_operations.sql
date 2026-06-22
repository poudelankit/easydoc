-- EasyDocument Phase 6 admin operations foundation.
-- Scope: agent verification decisions and admin read models only.

ALTER TABLE agent_profiles
  ADD COLUMN IF NOT EXISTS verification_decision VARCHAR(20)
    CHECK (verification_decision IN ('APPROVED','REJECTED')),
  ADD COLUMN IF NOT EXISTS verification_decided_by_user_id UUID REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS verification_decided_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS verification_rejection_reason TEXT;

CREATE INDEX IF NOT EXISTS idx_agent_profiles_verification_queue
  ON agent_profiles(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_agent_profiles_verification_decision
  ON agent_profiles(verification_decision, verification_decided_at DESC);
