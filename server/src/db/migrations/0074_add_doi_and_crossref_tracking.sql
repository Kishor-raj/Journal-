-- 0074_add_doi_and_crossref_tracking.sql
-- Migration to support automated Crossref DOI registration, tracking, and auditability.

-- 1. Create concurrency-safe PostgreSQL sequence for DOI numeric suffix
CREATE SEQUENCE IF NOT EXISTS doi_suffix_seq START WITH 1 INCREMENT BY 1 NO CYCLE;

-- 2. Alter publications table to add DOI tracking fields
ALTER TABLE publications
  ADD COLUMN IF NOT EXISTS doi_suffix TEXT,
  ADD COLUMN IF NOT EXISTS doi_status TEXT NOT NULL DEFAULT 'not_assigned'
    CHECK (doi_status IN ('not_assigned', 'reserved', 'submitted', 'registered', 'failed', 'test_success')),
  ADD COLUMN IF NOT EXISTS doi_environment TEXT NOT NULL DEFAULT 'test'
    CHECK (doi_environment IN ('test', 'production')),
  ADD COLUMN IF NOT EXISTS doi_batch_id TEXT,
  ADD COLUMN IF NOT EXISTS doi_submission_id TEXT,
  ADD COLUMN IF NOT EXISTS doi_deposit_filename TEXT,
  ADD COLUMN IF NOT EXISTS doi_submitted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS doi_registered_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS doi_last_attempt_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS doi_attempt_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS doi_error TEXT;

-- 2b. Deduplicate / normalize legacy DOIs before creating unique indexes.
-- Legacy placeholder values (such as test entries not matching standard DOI format '10.*')
-- or any duplicate DOIs are migrated to canonical sequential DOIs (10.68968/IJIDCR_#####).
DO $$
DECLARE
  pub RECORD;
  seq_val INTEGER;
  padded_suffix TEXT;
  full_doi TEXT;
BEGIN
  -- Backfill doi_suffix from any existing valid DOI
  UPDATE publications
  SET doi_suffix = substring(doi from '(?i)IJIDCR_[0-9]+')
  WHERE doi_suffix IS NULL
    AND doi ~* 'IJIDCR_[0-9]+';

  -- Resolve any invalid or duplicate DOIs
  FOR pub IN
    SELECT p.id, p.manuscript_id, p.doi
    FROM publications p
    WHERE p.doi IS NOT NULL
      AND (
        p.doi !~* '^10\.' -- not a valid DOI format
        OR LOWER(p.doi) IN (
          SELECT LOWER(doi)
          FROM publications
          WHERE doi IS NOT NULL
          GROUP BY LOWER(doi)
          HAVING COUNT(*) > 1
        )
      )
    ORDER BY p.published_at ASC, p.created_at ASC
  LOOP
    seq_val := nextval('doi_suffix_seq');
    padded_suffix := 'IJIDCR_' || lpad(seq_val::text, 5, '0');
    full_doi := '10.68968/' || padded_suffix;

    UPDATE publications
    SET doi = full_doi,
        doi_suffix = padded_suffix,
        doi_status = 'reserved'
    WHERE id = pub.id;
  END LOOP;
END $$;

-- 3. Case-insensitive unique indexes on DOI and DOI suffix
CREATE UNIQUE INDEX IF NOT EXISTS idx_publications_lower_doi
  ON publications(LOWER(doi))
  WHERE doi IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_publications_lower_doi_suffix
  ON publications(LOWER(doi_suffix))
  WHERE doi_suffix IS NOT NULL;

-- 4. Change publications.manuscript_id ON DELETE constraint from CASCADE to RESTRICT
-- to ensure published manuscripts and registered DOIs are never accidentally cascaded away.
ALTER TABLE publications DROP CONSTRAINT IF EXISTS publications_manuscript_id_fkey;
ALTER TABLE publications
  ADD CONSTRAINT publications_manuscript_id_fkey
  FOREIGN KEY (manuscript_id) REFERENCES manuscripts(id) ON DELETE RESTRICT;

-- 5. Synchronize sequence with existing publications if any suffix pattern already exists
DO $$
DECLARE
  max_num INTEGER := 0;
  r RECORD;
  extracted_num INTEGER;
BEGIN
  FOR r IN SELECT doi, doi_suffix FROM publications WHERE doi IS NOT NULL OR doi_suffix IS NOT NULL LOOP
    BEGIN
      IF r.doi_suffix ~* '^IJIDCR_[0-9]+$' THEN
        extracted_num := CAST(substring(r.doi_suffix from 8) AS INTEGER);
        IF extracted_num > max_num THEN
          max_num := extracted_num;
        END IF;
      ELSIF r.doi ~* 'IJIDCR_[0-9]+' THEN
        extracted_num := CAST(substring(substring(r.doi from '(?i)IJIDCR_[0-9]+') from 8) AS INTEGER);
        IF extracted_num > max_num THEN
          max_num := extracted_num;
        END IF;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END LOOP;

  IF max_num > 0 THEN
    PERFORM setval('doi_suffix_seq', max_num, true);
  END IF;
END $$;

-- 6. Create durable deposit jobs table for background queuing and worker safety
CREATE TABLE IF NOT EXISTS crossref_deposit_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  manuscript_id UUID NOT NULL REFERENCES manuscripts(id) ON DELETE RESTRICT,
  publication_id UUID NOT NULL REFERENCES publications(id) ON DELETE RESTRICT,
  doi TEXT NOT NULL,
  doi_suffix TEXT NOT NULL,
  environment TEXT NOT NULL DEFAULT 'test' CHECK (environment IN ('test', 'production')),
  batch_id TEXT NOT NULL,
  deposit_filename TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued'
    CHECK (status IN ('queued', 'submitting', 'submitted', 'verifying', 'completed', 'failed')),
  attempt_count INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 5,
  last_attempt_at TIMESTAMPTZ,
  next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  submitted_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  response_summary TEXT,
  error_message TEXT,
  xml_content TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crossref_jobs_status_next ON crossref_deposit_jobs(status, next_attempt_at);
CREATE INDEX IF NOT EXISTS idx_crossref_jobs_manuscript ON crossref_deposit_jobs(manuscript_id);
CREATE INDEX IF NOT EXISTS idx_crossref_jobs_publication ON crossref_deposit_jobs(publication_id);
CREATE INDEX IF NOT EXISTS idx_crossref_jobs_batch ON crossref_deposit_jobs(batch_id);

-- Partial unique index: prevent multiple active deposit jobs for the same publication.
-- Allows multiple completed/failed jobs (historical), but only one active job per publication.
CREATE UNIQUE INDEX IF NOT EXISTS idx_crossref_jobs_active_per_publication
  ON crossref_deposit_jobs (publication_id)
  WHERE status IN ('queued', 'submitting', 'submitted', 'verifying');

CREATE TRIGGER update_crossref_deposit_jobs_updated_at
  BEFORE UPDATE ON crossref_deposit_jobs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
