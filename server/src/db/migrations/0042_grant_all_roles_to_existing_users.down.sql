DELETE FROM user_roles ur
USING roles r
WHERE ur.role_id = r.id
  AND r.name IN ('admin', 'moderator', 'editor', 'reviewer');
