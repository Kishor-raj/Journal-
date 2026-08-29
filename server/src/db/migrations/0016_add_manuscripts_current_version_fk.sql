ALTER TABLE manuscripts ADD CONSTRAINT fk_manuscripts_current_version
  FOREIGN KEY (current_version_id) REFERENCES manuscript_versions(id) ON DELETE SET NULL;
