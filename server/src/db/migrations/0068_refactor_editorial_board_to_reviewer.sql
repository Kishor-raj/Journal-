-- Migration: 0068_refactor_editorial_board_to_reviewer.sql

ALTER TABLE users ADD COLUMN IF NOT EXISTS reviewer_id VARCHAR(50) UNIQUE;
ALTER TABLE editorial_members ADD COLUMN IF NOT EXISTS reviewer_id VARCHAR(50);
ALTER TABLE editorial_applications ADD COLUMN IF NOT EXISTS reviewer_id VARCHAR(50);
ALTER TABLE editorial_appointments ADD COLUMN IF NOT EXISTS reviewer_id VARCHAR(50);

CREATE INDEX IF NOT EXISTS idx_users_reviewer_id ON users(reviewer_id);
CREATE INDEX IF NOT EXISTS idx_editorial_members_reviewer_id ON editorial_members(reviewer_id);
CREATE INDEX IF NOT EXISTS idx_editorial_applications_reviewer_id ON editorial_applications(reviewer_id);
CREATE INDEX IF NOT EXISTS idx_editorial_appointments_reviewer_id ON editorial_appointments(reviewer_id);

DO $$
DECLARE
  reviewer_role_id UUID;
  editor_role_id UUID;
  r RECORD;
BEGIN
  SELECT id INTO reviewer_role_id FROM roles WHERE name = 'reviewer' LIMIT 1;
  SELECT id INTO editor_role_id FROM roles WHERE name = 'editor' LIMIT 1;

  -- 1. Backfill reviewer_id from editor_id in editorial_members
  UPDATE editorial_members
  SET reviewer_id = editor_id
  WHERE (reviewer_id IS NULL OR reviewer_id = '') AND (editor_id IS NOT NULL AND editor_id != '');

  -- Update role_title to 'Reviewer' for approved members created through application workflow
  UPDATE editorial_members
  SET role_title = 'Reviewer'
  WHERE role_title NOT IN ('Editor-in-Chief', 'Editorial Leadership') AND role_title != 'Reviewer';

  -- 2. Backfill reviewer_id from editor_id in editorial_applications and appointments
  UPDATE editorial_applications
  SET reviewer_id = editor_id
  WHERE (reviewer_id IS NULL OR reviewer_id = '') AND (editor_id IS NOT NULL AND editor_id != '');

  UPDATE editorial_appointments
  SET reviewer_id = editor_id
  WHERE (reviewer_id IS NULL OR reviewer_id = '') AND (editor_id IS NOT NULL AND editor_id != '');

  -- 3. Backfill reviewer_id from editor_id in users
  UPDATE users
  SET reviewer_id = editor_id
  WHERE (reviewer_id IS NULL OR reviewer_id = '') AND (editor_id IS NOT NULL AND editor_id != '');

  -- 4. Re-assign editorial board users from 'editor' role to 'reviewer' role
  IF reviewer_role_id IS NOT NULL AND editor_role_id IS NOT NULL THEN
    FOR r IN
      SELECT DISTINCT u.id FROM users u
      WHERE u.role_id = editor_role_id
        AND (
          EXISTS (SELECT 1 FROM editorial_applications ea WHERE ea.user_id = u.id)
          OR EXISTS (SELECT 1 FROM editorial_members em WHERE em.user_id = u.id)
          OR EXISTS (SELECT 1 FROM editorial_appointments ap WHERE ap.user_id = u.id)
          OR EXISTS (SELECT 1 FROM editorial_role_grants rg WHERE rg.created_user_id = u.id)
        )
    LOOP
      UPDATE users SET role_id = reviewer_role_id, updated_at = now() WHERE id = r.id;
      
      -- Replace editor role with reviewer role in user_roles
      DELETE FROM user_roles WHERE user_id = r.id AND role_id = editor_role_id;
      INSERT INTO user_roles (user_id, role_id) VALUES (r.id, reviewer_role_id)
        ON CONFLICT (user_id, role_id) DO NOTHING;
    END LOOP;
  END IF;

  -- 5. Update editorial_role_grants role from 'editor' to 'reviewer'
  ALTER TABLE editorial_role_grants ALTER COLUMN role SET DEFAULT 'reviewer';
  UPDATE editorial_role_grants SET role = 'reviewer' WHERE role = 'editor';

  -- 6. Canonical reviewer invitation email template
  DELETE FROM email_templates t1
  WHERE t1.template_key = 'reviewer_invited'
    AND EXISTS (
      SELECT 1 FROM email_templates t2
      WHERE (t2.journal_id IS NOT DISTINCT FROM t1.journal_id)
        AND t2.template_key = 'reviewer_invitation'
    );

  UPDATE email_templates
  SET template_key = 'reviewer_invitation'
  WHERE template_key = 'reviewer_invited';

  -- Update editorial_application_approved template body
  UPDATE email_templates
  SET body_html = REPLACE(REPLACE(body_html, 'Your account has been granted Editor access.', 'Your account has been appointed as a Reviewer on the IJIDCR Editorial Board.'), 'Go to Editor Workspace', 'Go to Reviewer Workspace'),
      body_text = REPLACE(REPLACE(body_text, 'Your account has been granted Editor access. You may now log in to the Editor Workspace.', 'Your account has been appointed as a Reviewer on the IJIDCR Editorial Board. You may now log in to the Reviewer Workspace.'), 'Log in: {{login_url}}', 'Reviewer Workspace: {{login_url}}')
  WHERE template_key = 'editorial_application_approved';

  -- Update editorial_role_invitation template body
  UPDATE email_templates
  SET body_html = REPLACE(REPLACE(body_html, 'activate your Editor privileges', 'activate your Reviewer account'), 'Set Up Your Editor Account', 'Set Up Your Reviewer Account'),
      body_text = REPLACE(REPLACE(body_text, 'activate your Editor privileges', 'activate your Reviewer account'), 'activate your Editor privileges', 'activate your Reviewer account')
  WHERE template_key = 'editorial_role_invitation';
END $$;

-- 7. Drop human-facing editor_id columns and indexes
DROP INDEX IF EXISTS idx_users_editor_id;
DROP INDEX IF EXISTS idx_editorial_members_editor_id;
DROP INDEX IF EXISTS idx_editorial_applications_editor_id;

ALTER TABLE users DROP COLUMN IF EXISTS editor_id;
ALTER TABLE editorial_members DROP COLUMN IF EXISTS editor_id;
ALTER TABLE editorial_applications DROP COLUMN IF EXISTS editor_id;
ALTER TABLE editorial_appointments DROP COLUMN IF EXISTS editor_id;
