CREATE TABLE submission_guidelines (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  journal_id UUID NOT NULL REFERENCES journals(id) ON DELETE CASCADE,
  version INTEGER NOT NULL DEFAULT 1,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  is_published BOOLEAN DEFAULT false,
  published_at TIMESTAMPTZ,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
