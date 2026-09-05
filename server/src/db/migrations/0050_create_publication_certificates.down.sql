DROP TRIGGER IF EXISTS update_publication_certificates_updated_at ON publication_certificates;
DROP INDEX IF EXISTS idx_publication_certificates_author;
DROP INDEX IF EXISTS idx_publication_certificates_manuscript;
DROP TABLE IF EXISTS publication_certificates;
DROP TYPE IF EXISTS certificate_status_enum;