CREATE TABLE revision_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  manuscript_id UUID NOT NULL REFERENCES manuscripts(id) ON DELETE CASCADE,
  editorial_decision_id UUID REFERENCES editorial_decisions(id) ON DELETE SET NULL,
  round_number INTEGER DEFAULT 1,
  request_type VARCHAR(30) NOT NULL,
  instructions TEXT,
  due_at TIMESTAMPTZ,
  requested_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_revision_requests_manuscript ON revision_requests(manuscript_id);
