CREATE TABLE security_logs (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  event_type VARCHAR(100) NOT NULL,
  severity VARCHAR(20) DEFAULT 'info',
  ip_address INET,
  user_agent TEXT,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_security_logs_user ON security_logs(user_id);
CREATE INDEX idx_security_logs_severity ON security_logs(severity);
CREATE INDEX idx_security_logs_created_at ON security_logs(created_at);
