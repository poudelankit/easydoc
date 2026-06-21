-- EasyDocument Phase 1 foundation schema.
-- Source of truth: Enterprise Implementation Package v1 auth/profile/KYC requirements.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS postgis;

DO $$
BEGIN
  CREATE TYPE user_role AS ENUM ('CUSTOMER','AGENT','ADMIN','OPS','FINANCE','SUPPORT');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE user_status AS ENUM ('PENDING_OTP','ACTIVE','SUSPENDED','DELETED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  CREATE TYPE agent_status AS ENUM ('DRAFT','PENDING_VERIFICATION','VERIFIED','REJECTED','SUSPENDED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  phone_number VARCHAR(20) NOT NULL UNIQUE,
  full_name VARCHAR(120) NOT NULL DEFAULT '',
  address_text TEXT,
  role user_role NOT NULL DEFAULT 'CUSTOMER',
  status user_status NOT NULL DEFAULT 'PENDING_OTP',
  profile_photo_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_login_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS otp_verifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  phone_number VARCHAR(20) NOT NULL,
  otp_hash TEXT NOT NULL,
  purpose VARCHAR(40) NOT NULL CHECK (purpose IN ('REGISTER','LOGIN','RESET')),
  expires_at TIMESTAMPTZ NOT NULL,
  consumed_at TIMESTAMPTZ,
  attempts INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_otp_phone_purpose
  ON otp_verifications(phone_number, purpose, expires_at DESC);

CREATE TABLE IF NOT EXISTS refresh_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  jti UUID NOT NULL UNIQUE,
  token_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  replaced_by_session_id UUID REFERENCES refresh_sessions(id),
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_refresh_sessions_user_active
  ON refresh_sessions(user_id, expires_at DESC)
  WHERE revoked_at IS NULL;

CREATE TABLE IF NOT EXISTS file_metadata (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  uploaded_by_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  context VARCHAR(40) NOT NULL CHECK (context IN ('KYC','PROFILE','SYSTEM')),
  object_key TEXT NOT NULL UNIQUE,
  original_filename TEXT,
  mime_type VARCHAR(120) NOT NULL,
  size_bytes BIGINT NOT NULL CHECK (size_bytes > 0),
  status VARCHAR(30) NOT NULL DEFAULT 'PLACEHOLDER' CHECK (status IN ('PLACEHOLDER','UPLOADED','REJECTED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_file_metadata_owner_context
  ON file_metadata(uploaded_by_user_id, context, created_at DESC);

CREATE TABLE IF NOT EXISTS agent_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  citizenship_number VARCHAR(80) NOT NULL,
  citizenship_front_url TEXT NOT NULL,
  citizenship_back_url TEXT NOT NULL,
  selfie_url TEXT NOT NULL,
  permanent_address_text TEXT NOT NULL,
  permanent_location GEOGRAPHY(POINT,4326) NOT NULL,
  current_location GEOGRAPHY(POINT,4326),
  status agent_status NOT NULL DEFAULT 'PENDING_VERIFICATION',
  verification_notes TEXT,
  average_rating NUMERIC(3,2) NOT NULL DEFAULT 0,
  completed_task_count INT NOT NULL DEFAULT 0,
  cancelled_task_count INT NOT NULL DEFAULT 0,
  is_available BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_status_available
  ON agent_profiles(status, is_available);

CREATE INDEX IF NOT EXISTS idx_agent_current_location
  ON agent_profiles USING GIST(current_location);

CREATE INDEX IF NOT EXISTS idx_agent_permanent_location
  ON agent_profiles USING GIST(permanent_location);

CREATE TABLE IF NOT EXISTS agent_service_tags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id UUID NOT NULL REFERENCES agent_profiles(id) ON DELETE CASCADE,
  tag VARCHAR(80) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(agent_id, tag)
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  actor_user_id UUID REFERENCES users(id),
  action VARCHAR(120) NOT NULL,
  entity_type VARCHAR(80) NOT NULL,
  entity_id UUID,
  ip_address INET,
  user_agent TEXT,
  before_data JSONB,
  after_data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_entity
  ON audit_logs(entity_type, entity_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_actor
  ON audit_logs(actor_user_id, created_at DESC);

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_users_updated_at ON users;
CREATE TRIGGER trg_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_file_metadata_updated_at ON file_metadata;
CREATE TRIGGER trg_file_metadata_updated_at
BEFORE UPDATE ON file_metadata
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_agent_profiles_updated_at ON agent_profiles;
CREATE TRIGGER trg_agent_profiles_updated_at
BEFORE UPDATE ON agent_profiles
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();
