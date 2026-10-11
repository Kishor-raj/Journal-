-- Migration Down: 0068_refactor_editorial_board_to_reviewer.down.sql

ALTER TABLE users ADD COLUMN IF NOT EXISTS editor_id VARCHAR(50) UNIQUE;
ALTER TABLE editorial_members ADD COLUMN IF NOT EXISTS editor_id VARCHAR(50);
ALTER TABLE editorial_applications ADD COLUMN IF NOT EXISTS editor_id VARCHAR(50);
ALTER TABLE editorial_appointments ADD COLUMN IF NOT EXISTS editor_id VARCHAR(50);

CREATE INDEX IF NOT EXISTS idx_users_editor_id ON users(editor_id);
CREATE INDEX IF NOT EXISTS idx_editorial_members_editor_id ON editorial_members(editor_id);
CREATE INDEX IF NOT EXISTS idx_editorial_applications_editor_id ON editorial_applications(editor_id);

UPDATE users SET editor_id = reviewer_id WHERE reviewer_id IS NOT NULL;
UPDATE editorial_members SET editor_id = reviewer_id WHERE reviewer_id IS NOT NULL;
UPDATE editorial_applications SET editor_id = reviewer_id WHERE reviewer_id IS NOT NULL;
UPDATE editorial_appointments SET editor_id = reviewer_id WHERE reviewer_id IS NOT NULL;

DROP INDEX IF EXISTS idx_users_reviewer_id;
DROP INDEX IF EXISTS idx_editorial_members_reviewer_id;
DROP INDEX IF EXISTS idx_editorial_applications_reviewer_id;
DROP INDEX IF EXISTS idx_editorial_appointments_reviewer_id;

ALTER TABLE users DROP COLUMN IF EXISTS reviewer_id;
ALTER TABLE editorial_members DROP COLUMN IF EXISTS reviewer_id;
ALTER TABLE editorial_applications DROP COLUMN IF EXISTS reviewer_id;
ALTER TABLE editorial_appointments DROP COLUMN IF EXISTS reviewer_id;
