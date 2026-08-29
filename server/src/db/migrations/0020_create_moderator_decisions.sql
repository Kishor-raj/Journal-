CREATE TABLE moderator_decisions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  manuscript_id UUID NOT NULL REFERENCES manuscripts(id) ON DELETE CASCADE,
  moderator_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  decision moderator_decision_enum NOT NULL,
  reason TEXT,
  notes_to_author TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_moderator_decisions_manuscript ON moderator_decisions(manuscript_id);
