-- EasyDocument Phase 8 reviews, ratings, and agent reputation foundation.
-- Scope: one customer review per completed task and query-calculated reputation metrics.

CREATE TABLE IF NOT EXISTS task_reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  task_id UUID NOT NULL UNIQUE REFERENCES document_tasks(id) ON DELETE CASCADE,
  customer_user_id UUID NOT NULL REFERENCES users(id),
  agent_user_id UUID NOT NULL REFERENCES users(id),
  overall_rating SMALLINT NOT NULL CHECK (overall_rating BETWEEN 1 AND 5),
  communication_rating SMALLINT NOT NULL CHECK (communication_rating BETWEEN 1 AND 5),
  timeliness_rating SMALLINT NOT NULL CHECK (timeliness_rating BETWEEN 1 AND 5),
  professionalism_rating SMALLINT NOT NULL CHECK (professionalism_rating BETWEEN 1 AND 5),
  review_text TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT task_reviews_customer_agent_distinct CHECK (customer_user_id <> agent_user_id)
);

CREATE INDEX IF NOT EXISTS idx_task_reviews_customer_created
  ON task_reviews(customer_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_task_reviews_agent_created
  ON task_reviews(agent_user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_task_reviews_rating_created
  ON task_reviews(overall_rating, created_at DESC);

DROP TRIGGER IF EXISTS trg_task_reviews_updated_at ON task_reviews;
CREATE TRIGGER trg_task_reviews_updated_at
BEFORE UPDATE ON task_reviews
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();
