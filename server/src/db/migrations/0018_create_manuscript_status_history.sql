CREATE TABLE manuscript_status_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  manuscript_id UUID NOT NULL REFERENCES manuscripts(id) ON DELETE CASCADE,
  from_status manuscript_status_enum,
  to_status manuscript_status_enum NOT NULL,
  changed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_manuscript_status_history_manuscript ON manuscript_status_history(manuscript_id);
