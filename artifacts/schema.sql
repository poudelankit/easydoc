-- EasyDocument PostgreSQL Schema - Implementation Baseline
-- Target: PostgreSQL 15+, Nepal-only deployment, 10,000 active users
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TYPE user_role AS ENUM ('CUSTOMER','AGENT','ADMIN','OPS','FINANCE','SUPPORT');
CREATE TYPE user_status AS ENUM ('PENDING_OTP','ACTIVE','SUSPENDED','DELETED');
CREATE TYPE agent_status AS ENUM ('DRAFT','PENDING_VERIFICATION','VERIFIED','REJECTED','SUSPENDED');
CREATE TYPE task_status AS ENUM ('CREATED','BROADCASTED','ACCEPTED','NEGOTIATING','CONTRACT_PENDING','ACTIVE','IN_PROGRESS','SUBMITTED','DELIVERED','COMPLETED','CANCELLED','DISPUTED');
CREATE TYPE message_type AS ENUM ('TEXT','IMAGE','DOCUMENT','AUDIO','VIDEO','SYSTEM','CALL_LOG');
CREATE TYPE payment_method AS ENUM ('CASH','ESEWA','KHALTI','CONNECTIPS','BANK_TRANSFER','OTHER');
CREATE TYPE dispute_status AS ENUM ('OPEN','UNDER_REVIEW','WAITING_CUSTOMER','WAITING_AGENT','RESOLVED','CLOSED');

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    phone_number VARCHAR(20) NOT NULL UNIQUE,
    full_name VARCHAR(120) NOT NULL,
    address_text TEXT,
    role user_role NOT NULL DEFAULT 'CUSTOMER',
    status user_status NOT NULL DEFAULT 'PENDING_OTP',
    profile_photo_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_login_at TIMESTAMPTZ
);

CREATE TABLE otp_verifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    phone_number VARCHAR(20) NOT NULL,
    otp_hash TEXT NOT NULL,
    purpose VARCHAR(40) NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    consumed_at TIMESTAMPTZ,
    attempts INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_otp_phone_purpose ON otp_verifications(phone_number, purpose, expires_at DESC);

CREATE TABLE agent_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL UNIQUE REFERENCES users(id),
    citizenship_number VARCHAR(80) NOT NULL,
    citizenship_front_url TEXT NOT NULL,
    citizenship_back_url TEXT NOT NULL,
    selfie_url TEXT NOT NULL,
    permanent_address_text TEXT NOT NULL,
    permanent_location GEOGRAPHY(POINT,4326),
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
CREATE INDEX idx_agent_status_available ON agent_profiles(status, is_available);
CREATE INDEX idx_agent_current_location ON agent_profiles USING GIST(current_location);

CREATE TABLE agent_service_tags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id UUID NOT NULL REFERENCES agent_profiles(id) ON DELETE CASCADE,
    tag VARCHAR(80) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(agent_id, tag)
);

CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_code VARCHAR(80) NOT NULL UNIQUE,
    customer_id UUID NOT NULL REFERENCES users(id),
    assigned_agent_id UUID REFERENCES agent_profiles(id),
    document_name VARCHAR(120) NOT NULL,
    organization_name VARCHAR(160) NOT NULL,
    organization_address_text TEXT,
    organization_location GEOGRAPHY(POINT,4326),
    task_title VARCHAR(300) NOT NULL,
    description TEXT,
    status task_status NOT NULL DEFAULT 'CREATED',
    direct_payment_method payment_method,
    agreed_amount_paisa BIGINT,
    agent_expected_delivery_at TIMESTAMPTZ,
    customer_closed_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    cancellation_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_tasks_customer ON tasks(customer_id, created_at DESC);
CREATE INDEX idx_tasks_agent ON tasks(assigned_agent_id, created_at DESC);
CREATE INDEX idx_tasks_status ON tasks(status, created_at DESC);
CREATE INDEX idx_tasks_org_location ON tasks USING GIST(organization_location);

CREATE TABLE task_broadcasts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    agent_id UUID NOT NULL REFERENCES agent_profiles(id),
    distance_meters INT,
    ranking_score NUMERIC(8,2),
    sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    seen_at TIMESTAMPTZ,
    accepted_at TIMESTAMPTZ,
    declined_at TIMESTAMPTZ,
    UNIQUE(task_id, agent_id)
);
CREATE INDEX idx_task_broadcast_agent ON task_broadcasts(agent_id, sent_at DESC);

CREATE TABLE task_status_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    old_status task_status,
    new_status task_status NOT NULL,
    changed_by_user_id UUID REFERENCES users(id),
    note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_status_history_task ON task_status_history(task_id, created_at DESC);

CREATE TABLE chat_rooms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID NOT NULL UNIQUE REFERENCES tasks(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES users(id),
    agent_user_id UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    archived_at TIMESTAMPTZ
);

CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_id UUID NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES users(id),
    message_type message_type NOT NULL DEFAULT 'TEXT',
    body TEXT,
    attachment_url TEXT,
    attachment_mime VARCHAR(120),
    attachment_size_bytes BIGINT,
    client_message_id VARCHAR(120),
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);
CREATE INDEX idx_messages_room_time ON messages(room_id, created_at DESC);

CREATE TABLE call_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_id UUID NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
    initiated_by_user_id UUID NOT NULL REFERENCES users(id),
    call_type VARCHAR(20) NOT NULL CHECK (call_type IN ('AUDIO','VIDEO','EXTERNAL')),
    status VARCHAR(20) NOT NULL CHECK (status IN ('RINGING','ACCEPTED','MISSED','ENDED','FAILED')),
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ended_at TIMESTAMPTZ,
    duration_seconds INT
);

CREATE TABLE reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID NOT NULL UNIQUE REFERENCES tasks(id),
    customer_id UUID NOT NULL REFERENCES users(id),
    agent_id UUID NOT NULL REFERENCES agent_profiles(id),
    rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    review_text TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_reviews_agent ON reviews(agent_id, created_at DESC);

CREATE TABLE disputes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID NOT NULL REFERENCES tasks(id),
    opened_by_user_id UUID NOT NULL REFERENCES users(id),
    assigned_admin_id UUID REFERENCES users(id),
    status dispute_status NOT NULL DEFAULT 'OPEN',
    reason VARCHAR(120) NOT NULL,
    description TEXT,
    resolution_note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    closed_at TIMESTAMPTZ
);
CREATE INDEX idx_disputes_status ON disputes(status, created_at DESC);

CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(160) NOT NULL,
    body TEXT NOT NULL,
    data JSONB NOT NULL DEFAULT '{}',
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_notifications_user ON notifications(user_id, created_at DESC);

CREATE TABLE audit_logs (
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
CREATE INDEX idx_audit_entity ON audit_logs(entity_type, entity_id, created_at DESC);
CREATE INDEX idx_audit_actor ON audit_logs(actor_user_id, created_at DESC);
