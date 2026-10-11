ALTER TABLE users
  DROP COLUMN IF EXISTS cv_file_url,
  DROP COLUMN IF EXISTS cv_file_public_id,
  DROP COLUMN IF EXISTS cv_file_name,
  DROP COLUMN IF EXISTS cv_file_size,
  DROP COLUMN IF EXISTS cv_mime_type,
  DROP COLUMN IF EXISTS cv_updated_at;
