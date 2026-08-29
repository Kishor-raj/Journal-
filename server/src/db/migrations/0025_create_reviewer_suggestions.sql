CREATE TABLE reviewer_suggestions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  manuscript_id UUID NOT NULL REFERENCES manuscripts(id) ON DELETE CASCADE,
  suggested_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  reviewer_name VARCHAR(255) NOT NULL,
  reviewer_email CITEXT,
  institution VARCHAR(255),
  orcid_id VARCHAR(30),
  suggestion_type suggestion_type_enum NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_reviewer_suggestions_manuscript ON reviewer_suggestions(manuscript_id);
