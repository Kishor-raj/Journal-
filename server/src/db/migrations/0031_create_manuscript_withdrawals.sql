CREATE TABLE manuscript_withdrawals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  manuscript_id UUID NOT NULL REFERENCES manuscripts(id) ON DELETE CASCADE,
  requested_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  reason TEXT NOT NULL,
  status withdrawal_status_enum DEFAULT 'requested',
  decided_by UUID REFERENCES users(id) ON DELETE SET NULL,
  decision_notes TEXT,
  requested_at TIMESTAMPTZ DEFAULT now(),
  decided_at TIMESTAMPTZ
);
CREATE INDEX idx_manuscript_withdrawals_manuscript ON manuscript_withdrawals(manuscript_id);
