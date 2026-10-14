-- Migration Down: 0073_fix_reviewer_role_regression.down.sql
-- Re-adds editor_id (backfilled from reviewer_id) and moves the same 14
-- accounts back to the 'editor' role. Only use this if the application is
-- rolled back to a build that expects users.editor_id and the 'editor'
-- role for editorial board members again.

ALTER TABLE users ADD COLUMN IF NOT EXISTS editor_id VARCHAR(50) UNIQUE;
ALTER TABLE editorial_members ADD COLUMN IF NOT EXISTS editor_id VARCHAR(50);
ALTER TABLE editorial_applications ADD COLUMN IF NOT EXISTS editor_id VARCHAR(50);
ALTER TABLE editorial_appointments ADD COLUMN IF NOT EXISTS editor_id VARCHAR(50);

CREATE INDEX IF NOT EXISTS idx_users_editor_id ON users(editor_id);
CREATE INDEX IF NOT EXISTS idx_editorial_members_editor_id ON editorial_members(editor_id);
CREATE INDEX IF NOT EXISTS idx_editorial_applications_editor_id ON editorial_applications(editor_id);

UPDATE users SET editor_id = reviewer_id WHERE editor_id IS NULL AND reviewer_id IS NOT NULL;
UPDATE editorial_members SET editor_id = reviewer_id WHERE editor_id IS NULL AND reviewer_id IS NOT NULL;
UPDATE editorial_applications SET editor_id = reviewer_id WHERE editor_id IS NULL AND reviewer_id IS NOT NULL;
UPDATE editorial_appointments SET editor_id = reviewer_id WHERE editor_id IS NULL AND reviewer_id IS NOT NULL;

DO $$
DECLARE
  reviewer_role_id UUID;
  editor_role_id UUID;
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
  SELECT id INTO reviewer_role_id FROM roles WHERE name = 'reviewer' LIMIT 1;
  SELECT id INTO editor_role_id FROM roles WHERE name = 'editor' LIMIT 1;

  UPDATE users
  SET role_id = editor_role_id, updated_at = now()
  WHERE id = ANY(affected_ids) AND role_id = reviewer_role_id;

  DELETE FROM user_roles
  WHERE user_id = ANY(affected_ids) AND role_id = reviewer_role_id;

  INSERT INTO user_roles (user_id, role_id)
  SELECT unnest(affected_ids), editor_role_id
  ON CONFLICT (user_id, role_id) DO NOTHING;
END $$;
