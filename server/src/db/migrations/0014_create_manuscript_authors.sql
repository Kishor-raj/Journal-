CREATE TABLE manuscript_authors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  manuscript_id UUID NOT NULL REFERENCES manuscripts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  author_order SMALLINT NOT NULL,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  email CITEXT,
  institution VARCHAR(255),
  department VARCHAR(255),
  country VARCHAR(100),
  orcid_id VARCHAR(30),
  is_corresponding BOOLEAN DEFAULT false,
  contribution_roles TEXT[],
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_manuscript_authors_manuscript ON manuscript_authors(manuscript_id);
CREATE INDEX idx_manuscript_authors_user ON manuscript_authors(user_id);
