CREATE TABLE moderator_checks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  manuscript_id UUID NOT NULL REFERENCES manuscripts(id) ON DELETE CASCADE,
  moderator_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  checklist JSONB,
  plagiarism_score NUMERIC(5,2),
  ethics_check_status VARCHAR(50),
  files_valid BOOLEAN,
  decision moderator_decision_enum,
  notes TEXT,
  checked_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_moderator_checks_manuscript ON moderator_checks(manuscript_id);
