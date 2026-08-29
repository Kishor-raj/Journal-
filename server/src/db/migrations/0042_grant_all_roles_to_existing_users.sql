-- This installation uses one account to exercise every editorial workflow.
-- Upgrade all existing accounts so the role switcher exposes all five portals.
INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id
FROM users u
CROSS JOIN roles r
WHERE r.name IN ('admin', 'author', 'moderator', 'editor', 'reviewer')
ON CONFLICT (user_id, role_id) DO NOTHING;
