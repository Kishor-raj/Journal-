CREATE TABLE manuscript_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  manuscript_id UUID NOT NULL REFERENCES manuscripts(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL DEFAULT 1,
  version_type VARCHAR(30) NOT NULL DEFAULT 'initial',
  title TEXT,
  abstract TEXT,
  submitted_by UUID REFERENCES users(id) ON DELETE SET NULL,
  submitted_at TIMESTAMPTZ,
  is_current BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(manuscript_id, version_number)
);
CREATE INDEX idx_manuscript_versions_manuscript ON manuscript_versions(manuscript_id);
