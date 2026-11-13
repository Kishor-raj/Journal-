-- 0074_add_doi_and_crossref_tracking.down.sql
-- Down migration for DOI and Crossref tracking.
-- Safety guard: refuse to silently drop registered production DOIs.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM publications
    WHERE doi_status = 'registered' AND doi_environment = 'production'
  ) THEN
    RAISE EXCEPTION 'Rollback aborted: production registered DOIs exist in publications. Deleting registered DOIs is forbidden by journal policy.';
  END IF;
END $$;

DROP TRIGGER IF EXISTS update_crossref_deposit_jobs_updated_at ON crossref_deposit_jobs;
DROP TABLE IF EXISTS crossref_deposit_jobs;

DROP INDEX IF EXISTS idx_publications_lower_doi;
DROP INDEX IF EXISTS idx_publications_lower_doi_suffix;

ALTER TABLE publications DROP CONSTRAINT IF EXISTS publications_manuscript_id_fkey;
ALTER TABLE publications
  ADD CONSTRAINT publications_manuscript_id_fkey
  FOREIGN KEY (manuscript_id) REFERENCES manuscripts(id) ON DELETE CASCADE;

ALTER TABLE publications
  DROP COLUMN IF EXISTS doi_suffix,
  DROP COLUMN IF EXISTS doi_status,
  DROP COLUMN IF EXISTS doi_environment,
  DROP COLUMN IF EXISTS doi_batch_id,
  DROP COLUMN IF EXISTS doi_submission_id,
  DROP COLUMN IF EXISTS doi_deposit_filename,
  DROP COLUMN IF EXISTS doi_submitted_at,
  DROP COLUMN IF EXISTS doi_registered_at,
  DROP COLUMN IF EXISTS doi_last_attempt_at,
  DROP COLUMN IF EXISTS doi_attempt_count,
  DROP COLUMN IF EXISTS doi_error;

DROP SEQUENCE IF EXISTS doi_suffix_seq;
