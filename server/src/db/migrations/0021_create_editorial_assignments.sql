CREATE TABLE editorial_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  manuscript_id UUID NOT NULL REFERENCES manuscripts(id) ON DELETE CASCADE,
  editor_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  assigned_by UUID REFERENCES users(id) ON DELETE SET NULL,
  assignment_status assignment_status_enum DEFAULT 'invited',
  assigned_at TIMESTAMPTZ DEFAULT now(),
  accepted_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  notes TEXT
);
CREATE INDEX idx_editorial_assignments_manuscript ON editorial_assignments(manuscript_id);
CREATE INDEX idx_editorial_assignments_editor ON editorial_assignments(editor_id);
