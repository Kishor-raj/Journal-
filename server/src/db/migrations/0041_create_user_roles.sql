CREATE TABLE user_roles (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, role_id)
);

CREATE INDEX idx_user_roles_user_id ON user_roles(user_id);

-- Preserve every existing account's current role when moving from the old
-- single-role model.
INSERT INTO user_roles (user_id, role_id)
SELECT id, role_id
FROM users
WHERE role_id IS NOT NULL
ON CONFLICT (user_id, role_id) DO NOTHING;

-- The seeded development account is intentionally a full workflow account so
-- the five portals can be exercised with one login.
INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id
FROM users u
CROSS JOIN roles r
WHERE u.email = 'admin@jar-journal.org'
  AND r.name IN ('admin', 'author', 'moderator', 'editor', 'reviewer')
ON CONFLICT (user_id, role_id) DO NOTHING;
