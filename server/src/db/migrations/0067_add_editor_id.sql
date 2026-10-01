-- Migration: 0067_add_editor_id.sql

ALTER TABLE users ADD COLUMN IF NOT EXISTS editor_id VARCHAR(50) UNIQUE;
ALTER TABLE editorial_members ADD COLUMN IF NOT EXISTS editor_id VARCHAR(50);
ALTER TABLE editorial_applications ADD COLUMN IF NOT EXISTS editor_id VARCHAR(50);
ALTER TABLE editorial_appointments ADD COLUMN IF NOT EXISTS editor_id VARCHAR(50);

CREATE INDEX IF NOT EXISTS idx_users_editor_id ON users(editor_id);
CREATE INDEX IF NOT EXISTS idx_editorial_members_editor_id ON editorial_members(editor_id);
CREATE INDEX IF NOT EXISTS idx_editorial_applications_editor_id ON editorial_applications(editor_id);

-- Backfill existing editorial members and users with editor role with AIRJ0001, AIRJ0002, etc.
DO $$
DECLARE
  r RECORD;
  next_num INT := 1;
  gen_id VARCHAR(50);
BEGIN
  -- 1. Backfill from editorial_members in display order
  FOR r IN SELECT id, user_id, application_id FROM editorial_members ORDER BY display_order ASC, created_at ASC LOOP
    gen_id := 'AIRJ' || LPAD(next_num::TEXT, 4, '0');
    
    UPDATE editorial_members SET editor_id = gen_id WHERE id = r.id AND (editor_id IS NULL OR editor_id = '');
    
    IF r.user_id IS NOT NULL THEN
      UPDATE users SET editor_id = gen_id WHERE id = r.user_id AND (editor_id IS NULL OR editor_id = '');
    END IF;
    
    IF r.application_id IS NOT NULL THEN
      UPDATE editorial_applications SET editor_id = gen_id WHERE id = r.application_id AND (editor_id IS NULL OR editor_id = '');
      UPDATE editorial_appointments SET editor_id = gen_id WHERE application_id = r.application_id AND (editor_id IS NULL OR editor_id = '');
    END IF;
    
    next_num := next_num + 1;
  END LOOP;

  -- 2. Backfill any remaining users with role = 'editor'
  FOR r IN 
    SELECT u.id FROM users u
    JOIN roles ro ON ro.id = u.role_id
    WHERE ro.name = 'editor' AND (u.editor_id IS NULL OR u.editor_id = '')
    ORDER BY u.created_at ASC 
  LOOP
    gen_id := 'AIRJ' || LPAD(next_num::TEXT, 4, '0');
    UPDATE users SET editor_id = gen_id WHERE id = r.id;
    next_num := next_num + 1;
  END LOOP;
END $$;
