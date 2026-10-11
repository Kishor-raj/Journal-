DROP INDEX IF EXISTS idx_publications_document_status;
ALTER TABLE publications
  DROP COLUMN IF EXISTS document_generated_at,
  DROP COLUMN IF EXISTS document_file_id,
  DROP COLUMN IF EXISTS document_error,
  DROP COLUMN IF EXISTS document_status;
