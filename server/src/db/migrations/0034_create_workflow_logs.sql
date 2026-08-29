CREATE TABLE workflow_logs (
  id BIGSERIAL PRIMARY KEY,
  manuscript_id UUID REFERENCES manuscripts(id) ON DELETE SET NULL,
  workflow_name VARCHAR(100) NOT NULL,
  event_name VARCHAR(100) NOT NULL,
  source VARCHAR(100),
  status VARCHAR(50),
  payload JSONB,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_workflow_logs_manuscript ON workflow_logs(manuscript_id);
CREATE INDEX idx_workflow_logs_created_at ON workflow_logs(created_at);
