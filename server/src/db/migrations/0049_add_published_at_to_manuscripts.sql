ALTER TABLE manuscripts ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_manuscripts_published_at ON manuscripts(published_at);