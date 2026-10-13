-- Rollback: 0072_change_reviewer_id_prefix.sql
-- Restore reviewer IDs from AIRP#### to AIRJ####.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM users u
    WHERE u.reviewer_id ~ '^AIRP[0-9]+$'
      AND EXISTS (
        SELECT 1
        FROM users existing
        WHERE existing.reviewer_id = 'AIRJ' || SUBSTRING(u.reviewer_id FROM 5)
          AND existing.id <> u.id
      )
  ) THEN
    RAISE EXCEPTION 'Cannot restore reviewer IDs: an AIRJ ID already exists for an AIRP ID';
  END IF;
END $$;

UPDATE users
SET reviewer_id = '__AIRJ_MIGRATION__' || SUBSTRING(reviewer_id FROM 5)
WHERE reviewer_id ~ '^AIRP[0-9]+$';

UPDATE editorial_members
SET reviewer_id = '__AIRJ_MIGRATION__' || SUBSTRING(reviewer_id FROM 5)
WHERE reviewer_id ~ '^AIRP[0-9]+$';

UPDATE editorial_applications
SET reviewer_id = '__AIRJ_MIGRATION__' || SUBSTRING(reviewer_id FROM 5)
WHERE reviewer_id ~ '^AIRP[0-9]+$';

UPDATE editorial_appointments
SET reviewer_id = '__AIRJ_MIGRATION__' || SUBSTRING(reviewer_id FROM 5)
WHERE reviewer_id ~ '^AIRP[0-9]+$';

UPDATE users
SET reviewer_id = 'AIRJ' || SUBSTRING(reviewer_id FROM LENGTH('__AIRJ_MIGRATION__') + 1)
WHERE LEFT(reviewer_id, LENGTH('__AIRJ_MIGRATION__')) = '__AIRJ_MIGRATION__';

UPDATE editorial_members
SET reviewer_id = 'AIRJ' || SUBSTRING(reviewer_id FROM LENGTH('__AIRJ_MIGRATION__') + 1)
WHERE LEFT(reviewer_id, LENGTH('__AIRJ_MIGRATION__')) = '__AIRJ_MIGRATION__';

UPDATE editorial_applications
SET reviewer_id = 'AIRJ' || SUBSTRING(reviewer_id FROM LENGTH('__AIRJ_MIGRATION__') + 1)
WHERE LEFT(reviewer_id, LENGTH('__AIRJ_MIGRATION__')) = '__AIRJ_MIGRATION__';

UPDATE editorial_appointments
SET reviewer_id = 'AIRJ' || SUBSTRING(reviewer_id FROM LENGTH('__AIRJ_MIGRATION__') + 1)
WHERE LEFT(reviewer_id, LENGTH('__AIRJ_MIGRATION__')) = '__AIRJ_MIGRATION__';
