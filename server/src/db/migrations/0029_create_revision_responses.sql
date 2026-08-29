CREATE TABLE revision_responses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  revision_request_id UUID NOT NULL REFERENCES revision_requests(id) ON DELETE CASCADE,
  manuscript_version_id UUID NOT NULL REFERENCES manuscript_versions(id) ON DELETE CASCADE,
  submitted_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  cover_letter TEXT,
  response_summary TEXT,
  submitted_at TIMESTAMPTZ,
  status revision_response_status_enum DEFAULT 'draft'
);
CREATE INDEX idx_revision_responses_request ON revision_responses(revision_request_id);
