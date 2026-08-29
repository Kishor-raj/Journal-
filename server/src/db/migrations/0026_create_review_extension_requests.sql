CREATE TABLE review_extension_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  assignment_id UUID NOT NULL REFERENCES reviewer_assignments(id) ON DELETE CASCADE,
  reviewer_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  requested_until TIMESTAMPTZ NOT NULL,
  reason TEXT,
  status extension_status_enum DEFAULT 'pending',
  decided_by UUID REFERENCES users(id) ON DELETE SET NULL,
  decided_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_review_extension_requests_assignment ON review_extension_requests(assignment_id);
