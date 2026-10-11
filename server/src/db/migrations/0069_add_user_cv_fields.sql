ALTER TABLE users
  ADD COLUMN IF NOT EXISTS cv_file_url TEXT,
  ADD COLUMN IF NOT EXISTS cv_file_public_id TEXT,
  ADD COLUMN IF NOT EXISTS cv_file_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS cv_file_size INTEGER,
  ADD COLUMN IF NOT EXISTS cv_mime_type VARCHAR(100) DEFAULT 'application/pdf',
  ADD COLUMN IF NOT EXISTS cv_updated_at TIMESTAMPTZ;

-- Backfill from existing editorial applications for users who already applied
UPDATE users u
SET
  cv_file_url = COALESCE(u.cv_file_url, ea.cv_file_url),
  cv_file_public_id = COALESCE(u.cv_file_public_id, ea.cv_file_public_id),
  cv_file_name = COALESCE(u.cv_file_name, ea.cv_file_name),
  cv_file_size = COALESCE(u.cv_file_size, ea.cv_file_size),
  cv_mime_type = COALESCE(u.cv_mime_type, ea.cv_mime_type, 'application/pdf'),
  cv_updated_at = COALESCE(u.cv_updated_at, ea.updated_at, ea.created_at)
FROM (
  SELECT DISTINCT ON (email) email, user_id, cv_file_url, cv_file_public_id, cv_file_name, cv_file_size, cv_mime_type, updated_at, created_at
  FROM editorial_applications
  WHERE cv_file_url IS NOT NULL
  ORDER BY email, created_at DESC
) ea
WHERE (u.id = ea.user_id OR LOWER(u.email::text) = LOWER(ea.email::text))
  AND u.cv_file_url IS NULL;
