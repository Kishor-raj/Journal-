CREATE TABLE publications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  manuscript_id UUID NOT NULL UNIQUE REFERENCES manuscripts(id) ON DELETE CASCADE,
  volume INTEGER NOT NULL DEFAULT 1,
  issue INTEGER NOT NULL DEFAULT 1,
  publication_year INTEGER NOT NULL,
  publication_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  doi TEXT,
  article_url TEXT,
  published_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  published_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_publications_manuscript ON publications(manuscript_id);
CREATE INDEX idx_publications_year ON publications(publication_year);
CREATE TRIGGER update_publications_updated_at
  BEFORE UPDATE ON publications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();