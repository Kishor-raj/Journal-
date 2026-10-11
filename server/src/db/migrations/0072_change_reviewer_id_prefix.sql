-- Migration: 0072_change_reviewer_id_prefix.sql
-- Rename existing reviewer IDs from AIRJ#### to AIRP####.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM users u
    WHERE u.reviewer_id ~ '^AIRJ[0-9]+$'
      AND EXISTS (
        SELECT 1
        FROM users existing
        WHERE existing.reviewer_id = 'AIRP' || SUBSTRING(u.reviewer_id FROM 5)
          AND existing.id <> u.id
      )
  ) THEN
    RAISE EXCEPTION 'Cannot rename reviewer IDs: an AIRP ID already exists for an AIRJ ID';
  END IF;
END $$;

-- Use a temporary prefix so the unique constraint on users.reviewer_id cannot
-- conflict while AIRJ values are being converted to AIRP values.
UPDATE users
SET reviewer_id = '__AIRP_MIGRATION__' || SUBSTRING(reviewer_id FROM 5)
WHERE reviewer_id ~ '^AIRJ[0-9]+$';

UPDATE editorial_members
SET reviewer_id = '__AIRP_MIGRATION__' || SUBSTRING(reviewer_id FROM 5)
WHERE reviewer_id ~ '^AIRJ[0-9]+$';

UPDATE editorial_applications
SET reviewer_id = '__AIRP_MIGRATION__' || SUBSTRING(reviewer_id FROM 5)
WHERE reviewer_id ~ '^AIRJ[0-9]+$';

UPDATE editorial_appointments
SET reviewer_id = '__AIRP_MIGRATION__' || SUBSTRING(reviewer_id FROM 5)
WHERE reviewer_id ~ '^AIRJ[0-9]+$';

UPDATE users
SET reviewer_id = 'AIRP' || SUBSTRING(reviewer_id FROM LENGTH('__AIRP_MIGRATION__') + 1)
WHERE LEFT(reviewer_id, LENGTH('__AIRP_MIGRATION__')) = '__AIRP_MIGRATION__';

UPDATE editorial_members
SET reviewer_id = 'AIRP' || SUBSTRING(reviewer_id FROM LENGTH('__AIRP_MIGRATION__') + 1)
WHERE LEFT(reviewer_id, LENGTH('__AIRP_MIGRATION__')) = '__AIRP_MIGRATION__';

UPDATE editorial_applications
SET reviewer_id = 'AIRP' || SUBSTRING(reviewer_id FROM LENGTH('__AIRP_MIGRATION__') + 1)
WHERE LEFT(reviewer_id, LENGTH('__AIRP_MIGRATION__')) = '__AIRP_MIGRATION__';

UPDATE editorial_appointments
SET reviewer_id = 'AIRP' || SUBSTRING(reviewer_id FROM LENGTH('__AIRP_MIGRATION__') + 1)
WHERE LEFT(reviewer_id, LENGTH('__AIRP_MIGRATION__')) = '__AIRP_MIGRATION__';
