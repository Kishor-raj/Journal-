CREATE TABLE reviewer_invitations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  manuscript_id UUID NOT NULL REFERENCES manuscripts(id) ON DELETE CASCADE,
  reviewer_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  assignment_id UUID REFERENCES reviewer_assignments(id) ON DELETE SET NULL,
  token_hash CHAR(64) UNIQUE NOT NULL,
  sent_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  responded_at TIMESTAMPTZ,
  response invitation_response_enum,
  suggested_reviewer_name VARCHAR(255),
  suggested_reviewer_email CITEXT,
  suggested_reviewer_institution VARCHAR(255),
  suggestion_reason TEXT
);
CREATE INDEX idx_reviewer_invitations_manuscript ON reviewer_invitations(manuscript_id);
CREATE INDEX idx_reviewer_invitations_reviewer ON reviewer_invitations(reviewer_id);
