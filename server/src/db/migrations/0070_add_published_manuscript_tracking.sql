ALTER TABLE publications
  ADD COLUMN IF NOT EXISTS document_status VARCHAR(30) DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS document_error TEXT,
  ADD COLUMN IF NOT EXISTS document_file_id UUID REFERENCES manuscript_files(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS document_generated_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_publications_document_status ON publications(document_status);
