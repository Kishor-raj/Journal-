-- Contact inquiries table for the public contact form
CREATE TABLE IF NOT EXISTS contact_inquiries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  full_name VARCHAR(200) NOT NULL,
  email CITEXT NOT NULL,
  institution VARCHAR(300),
  country VARCHAR(100),
  subject VARCHAR(300) NOT NULL,
  category VARCHAR(50) NOT NULL,
  message TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'NEW',
  notification_sent BOOLEAN NOT NULL DEFAULT false,
  notification_error TEXT,
  honeypot VARCHAR(200),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Constraints
ALTER TABLE contact_inquiries
  ADD CONSTRAINT contact_inquiries_status_check
  CHECK (status IN ('NEW', 'READ', 'REPLIED', 'CLOSED'));

ALTER TABLE contact_inquiries
  ADD CONSTRAINT contact_inquiries_category_check
  CHECK (category IN (
    'Manuscript Submission',
    'Editorial Inquiry',
    'Peer Review',
    'Publication',
    'Technical Support',
    'General Inquiry',
    'Other'
  ));

-- Useful indexes
CREATE INDEX IF NOT EXISTS idx_contact_inquiries_status ON contact_inquiries (status);
CREATE INDEX IF NOT EXISTS idx_contact_inquiries_created_at ON contact_inquiries (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_contact_inquiries_email ON contact_inquiries (email);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_contact_inquiries_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_contact_inquiries_updated_at ON contact_inquiries;
CREATE TRIGGER update_contact_inquiries_updated_at
  BEFORE UPDATE ON contact_inquiries
  FOR EACH ROW EXECUTE FUNCTION update_contact_inquiries_updated_at();
