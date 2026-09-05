DROP INDEX IF EXISTS idx_manuscripts_published_at;
ALTER TABLE manuscripts DROP COLUMN IF EXISTS published_at;