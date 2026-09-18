-- Remove multi-role testing assignments and enforce single canonical role per user.

-- 1. Ensure all users have a canonical role_id (default to author if NULL)
UPDATE users
SET role_id = (SELECT id FROM roles WHERE name = 'author' LIMIT 1)
WHERE role_id IS NULL;

-- 2. Remove all user_roles rows that do not match the user's canonical users.role_id
DELETE FROM user_roles ur
USING users u
WHERE ur.user_id = u.id
  AND ur.role_id <> u.role_id;

-- 3. Ensure each user has their canonical role in user_roles
INSERT INTO user_roles (user_id, role_id)
SELECT id, role_id
FROM users
WHERE role_id IS NOT NULL
ON CONFLICT (user_id, role_id) DO NOTHING;

-- 4. Align all active user_sessions to the user's canonical role
UPDATE user_sessions s
SET role_id = u.role_id
FROM users u
WHERE s.user_id = u.id
  AND (s.role_id IS NULL OR s.role_id <> u.role_id);
