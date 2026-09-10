CREATE UNIQUE INDEX IF NOT EXISTS uq_manuscript_authors_user
  ON manuscript_authors (manuscript_id, user_id)
  WHERE user_id IS NOT NULL;
