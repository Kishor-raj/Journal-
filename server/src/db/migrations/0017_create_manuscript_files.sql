CREATE TABLE manuscript_files (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  manuscript_id UUID NOT NULL REFERENCES manuscripts(id) ON DELETE CASCADE,
  version_id UUID NOT NULL REFERENCES manuscript_versions(id) ON DELETE CASCADE,
  file_type VARCHAR(50) NOT NULL,
  original_filename TEXT NOT NULL,
  storage_provider VARCHAR(30) DEFAULT 'cloudinary',
  public_id TEXT UNIQUE NOT NULL,
  resource_type VARCHAR(20) NOT NULL,
  format VARCHAR(20),
  mime_type VARCHAR(150),
  file_size_bytes BIGINT,
  sha256_checksum CHAR(64),
  uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
  uploaded_at TIMESTAMPTZ DEFAULT now(),
  is_accessible BOOLEAN DEFAULT false
);
CREATE INDEX idx_manuscript_files_public_id ON manuscript_files(public_id);
CREATE INDEX idx_manuscript_files_manuscript ON manuscript_files(manuscript_id);
