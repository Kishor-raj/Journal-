-- Submission counters table for generating sequential submission numbers
-- Format: IJIDCR-YY-NNNN (e.g., IJIDCR-26-0001)
-- One row per year, tracks the last used sequence number

CREATE TABLE IF NOT EXISTS submission_counters (
  id SERIAL PRIMARY KEY,
  year INTEGER NOT NULL UNIQUE,
  last_number INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Backfill existing submitted (non-draft) manuscripts that still carry a DRAFT-*
-- number with a proper sequential IJIDCR-YY-NNNN number.
-- Order by submitted_at ascending so the earliest submissions get the lowest numbers.
-- Uses a plpgsql block to guarantee uniqueness within the migration.

DO $$
DECLARE
  rec RECORD;
  sub_yr INTEGER;
  sub_yy TEXT;
  seq_no INTEGER;
  new_no TEXT;
BEGIN
  -- Ensure counter rows exist for each year present among submitted manuscripts
  FOR rec IN
    SELECT DISTINCT EXTRACT(YEAR FROM COALESCE(submitted_at, created_at))::int AS yr
    FROM manuscripts
    WHERE current_status <> 'draft'
      AND submission_number IS NOT NULL
      AND submission_number LIKE 'DRAFT-%'
  LOOP
    INSERT INTO submission_counters (year, last_number)
    VALUES (rec.yr, 0)
    ON CONFLICT (year) DO NOTHING;
  END LOOP;

  FOR rec IN
    SELECT id, EXTRACT(YEAR FROM COALESCE(submitted_at, created_at))::int AS yr
    FROM manuscripts
    WHERE current_status <> 'draft'
      AND submission_number IS NOT NULL
      AND submission_number LIKE 'DRAFT-%'
    ORDER BY COALESCE(submitted_at, created_at) ASC, id ASC
  LOOP
    UPDATE submission_counters
       SET last_number = last_number + 1
     WHERE year = rec.yr
     RETURNING last_number INTO seq_no;

    sub_yy := lpad((rec.yr % 100)::text, 2, '0');
    new_no := 'IJIDCR-' || sub_yy || '-' || lpad(seq_no::text, 4, '0');

    UPDATE manuscripts
       SET submission_number = new_no
     WHERE id = rec.id;
  END LOOP;
END $$;
