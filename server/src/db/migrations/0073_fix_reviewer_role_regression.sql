-- Migration: 0073_fix_reviewer_role_regression.sql
--
-- Incident: migration 0068_refactor_editorial_board_to_reviewer moved 14
-- editorial board members from the 'editor' role to 'reviewer' and renamed
-- editor_id -> reviewer_id. A later hotfix (commit 1a17b72, migration
-- 0068_restore_editor_role_schema) temporarily re-added editor_id and moved
-- those same 14 accounts back to 'editor' to match a reverted app deploy.
-- That hotfix commit was then dropped from main by a force-push, but its
-- effect on the live database was never rolled back, so the DB stayed on
-- 'editor' while the current (reviewer-based) application code was
-- redeployed. This migration restores the 14 accounts to 'reviewer' and
-- drops the now-unused editor_id columns, matching what the current app
-- code expects. reviewer_id is untouched throughout.

DROP INDEX IF EXISTS idx_users_editor_id;
DROP INDEX IF EXISTS idx_editorial_members_editor_id;
DROP INDEX IF EXISTS idx_editorial_applications_editor_id;

ALTER TABLE users DROP COLUMN IF EXISTS editor_id;
ALTER TABLE editorial_members DROP COLUMN IF EXISTS editor_id;
ALTER TABLE editorial_applications DROP COLUMN IF EXISTS editor_id;
ALTER TABLE editorial_appointments DROP COLUMN IF EXISTS editor_id;

DO $$
DECLARE
  editor_role_id UUID;
  reviewer_role_id UUID;
  affected_ids UUID[] := ARRAY[
    'bdb7f619-2438-4a0e-9a55-454513bf029e',
    '14dcccd4-b860-4d86-a57b-5ca4f31449fc',
    '4bf6d954-54fd-445b-b3c1-2b900fb68e80',
    '4d2f7268-030b-4951-be36-f4c3d09ab928',
    '1229323a-67c9-40a1-bb0d-b7c7a8811b54',
    '520eb184-eb74-4dde-bb9d-651f4d0459dc',
    '6a68a7c3-05d7-4bfb-8999-7ba1ed2bf71c',
    '740ca4c5-3fd5-45e5-ac8b-0aeac2a0f629',
    '88844c62-0f1a-4edd-89a7-6aa952fae802',
    'a60d0291-73cd-452b-9c04-2fd5e6c314ec',
    'afdee1a9-ff71-4ea4-a69b-a72d43ce775c',
    'bf93d0fe-2af1-4fdd-a417-e1f5cd166925',
    'd416a56a-173b-470f-bc53-1f65183b2896',
    'f51218dd-a205-47a8-9e3d-ad4ba08934e6'
  ];
BEGIN
  SELECT id INTO editor_role_id FROM roles WHERE name = 'editor' LIMIT 1;
  SELECT id INTO reviewer_role_id FROM roles WHERE name = 'reviewer' LIMIT 1;

  IF reviewer_role_id IS NOT NULL THEN
    UPDATE users
    SET role_id = reviewer_role_id, updated_at = now()
    WHERE id = ANY(affected_ids) AND (editor_role_id IS NULL OR role_id = editor_role_id);

    IF editor_role_id IS NOT NULL THEN
      DELETE FROM user_roles
      WHERE user_id = ANY(affected_ids) AND role_id = editor_role_id;
    END IF;

    INSERT INTO user_roles (user_id, role_id)
    SELECT u.id, reviewer_role_id
    FROM users u
    WHERE u.id = ANY(affected_ids)
    ON CONFLICT (user_id, role_id) DO NOTHING;
  END IF;
END $$;
