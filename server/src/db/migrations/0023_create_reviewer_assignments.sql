CREATE TABLE reviewer_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  manuscript_id UUID NOT NULL REFERENCES manuscripts(id) ON DELETE CASCADE,
  reviewer_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  editor_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  round_number INTEGER DEFAULT 1,
  assignment_status assignment_status_enum DEFAULT 'invited',
  assigned_at TIMESTAMPTZ DEFAULT now(),
  accepted_at TIMESTAMPTZ,
  due_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);
CREATE INDEX idx_reviewer_assignments_manuscript ON reviewer_assignments(manuscript_id);
CREATE INDEX idx_reviewer_assignments_reviewer ON reviewer_assignments(reviewer_id);
CREATE INDEX idx_reviewer_assignments_status ON reviewer_assignments(assignment_status);
