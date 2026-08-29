CREATE TABLE editorial_decisions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  manuscript_id UUID NOT NULL REFERENCES manuscripts(id) ON DELETE CASCADE,
  editor_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  decision editorial_decision_enum NOT NULL,
  decision_round INTEGER DEFAULT 1,
  comments_to_author TEXT,
  internal_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_editorial_decisions_manuscript ON editorial_decisions(manuscript_id);
