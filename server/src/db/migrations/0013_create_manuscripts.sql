CREATE TABLE manuscripts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  journal_id UUID NOT NULL REFERENCES journals(id) ON DELETE RESTRICT,
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
  submission_number VARCHAR(50) UNIQUE,
  title TEXT,
  abstract TEXT,
  keywords TEXT[],
  corresponding_author_id UUID REFERENCES users(id) ON DELETE RESTRICT,
  submitted_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  current_version_id UUID,
  current_status manuscript_status_enum DEFAULT 'draft',
  submitted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_manuscripts_submission_number ON manuscripts(submission_number);
CREATE INDEX idx_manuscripts_current_status ON manuscripts(current_status);
CREATE INDEX idx_manuscripts_submitted_by ON manuscripts(submitted_by);
