ALTER TABLE user_sessions ADD COLUMN IF NOT EXISTS role_id UUID REFERENCES roles(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_user_sessions_role ON user_sessions(role_id);
