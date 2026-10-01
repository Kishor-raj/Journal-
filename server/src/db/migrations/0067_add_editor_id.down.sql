-- Migration Down: 0067_add_editor_id.down.sql

DROP INDEX IF EXISTS idx_users_editor_id;
DROP INDEX IF EXISTS idx_editorial_members_editor_id;
DROP INDEX IF EXISTS idx_editorial_applications_editor_id;

ALTER TABLE users DROP COLUMN IF EXISTS editor_id;
ALTER TABLE editorial_members DROP COLUMN IF EXISTS editor_id;
ALTER TABLE editorial_applications DROP COLUMN IF EXISTS editor_id;
ALTER TABLE editorial_appointments DROP COLUMN IF EXISTS editor_id;
