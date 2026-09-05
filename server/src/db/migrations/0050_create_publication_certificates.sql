CREATE TYPE certificate_status_enum AS ENUM ('pending', 'active', 'failed', 'revoked');

CREATE TABLE publication_certificates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  manuscript_id UUID NOT NULL REFERENCES manuscripts(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES manuscript_authors(id) ON DELETE CASCADE,
  certificate_number TEXT NOT NULL,
  verification_token TEXT NOT NULL UNIQUE,
  pdf_file_url TEXT,
  cloudinary_public_id TEXT,
  status certificate_status_enum NOT NULL DEFAULT 'pending',
  generated_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  revocation_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_certificate_manuscript_author UNIQUE (manuscript_id, author_id)
);
CREATE INDEX idx_publication_certificates_manuscript ON publication_certificates(manuscript_id);
CREATE INDEX idx_publication_certificates_author ON publication_certificates(author_id);
CREATE TRIGGER update_publication_certificates_updated_at
  BEFORE UPDATE ON publication_certificates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();