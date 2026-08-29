CREATE TABLE user_activity (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  activity_type VARCHAR(50) NOT NULL,
  entity_type VARCHAR(50),
  entity_id UUID,
  metadata JSONB,
  ip_address INET,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_user_activity_user_id ON user_activity(user_id);
