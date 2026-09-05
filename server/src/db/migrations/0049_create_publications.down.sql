DROP TRIGGER IF EXISTS update_publications_updated_at ON publications;
DROP INDEX IF EXISTS idx_publications_year;
DROP INDEX IF EXISTS idx_publications_manuscript;
DROP TABLE IF EXISTS publications;