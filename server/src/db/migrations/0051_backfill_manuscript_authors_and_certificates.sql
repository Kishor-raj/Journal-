-- Migration: 0051_backfill_manuscript_authors_and_certificates.sql
-- Backfill manuscript_authors missing user_id and first/last names from users table

-- 1. Sync manuscript_authors with existing users by email
UPDATE manuscript_authors ma
SET user_id = COALESCE(ma.user_id, u.id),
    first_name = COALESCE(NULLIF(TRIM(ma.first_name), ''), NULLIF(TRIM(ma.first_name), 'Author'), u.first_name),
    last_name = COALESCE(NULLIF(TRIM(ma.last_name), ''), u.last_name),
    institution = COALESCE(NULLIF(TRIM(ma.institution), ''), u.institution),
    department = COALESCE(NULLIF(TRIM(ma.department), ''), u.department),
    country = COALESCE(NULLIF(TRIM(ma.country), ''), u.country),
    orcid_id = COALESCE(ma.orcid_id, u.orcid_id)
FROM users u
WHERE ma.user_id = u.id OR (ma.user_id IS NULL AND LOWER(TRIM(ma.email)) = LOWER(TRIM(u.email)));

-- 2. Insert primary author for any manuscripts that have 0 authors
INSERT INTO manuscript_authors (manuscript_id, user_id, author_order, first_name, last_name, email, institution, department, country, orcid_id, is_corresponding)
SELECT m.id, u.id, 1, COALESCE(NULLIF(TRIM(u.first_name), ''), 'Author'), COALESCE(u.last_name, ''), u.email, u.institution, u.department, u.country, u.orcid_id, true
FROM manuscripts m
JOIN users u ON u.id = m.submitted_by
WHERE NOT EXISTS (
  SELECT 1 FROM manuscript_authors ma WHERE ma.manuscript_id = m.id
);

-- 3. For single-author manuscripts where author has generic Author name, sync with submitter
UPDATE manuscript_authors ma
SET user_id = COALESCE(ma.user_id, u.id),
    first_name = COALESCE(NULLIF(TRIM(u.first_name), ''), ma.first_name),
    last_name = COALESCE(NULLIF(TRIM(u.last_name), ''), ma.last_name)
FROM manuscripts m
JOIN users u ON u.id = m.submitted_by
WHERE ma.manuscript_id = m.id
  AND (ma.first_name IS NULL OR TRIM(ma.first_name) = '' OR LOWER(TRIM(ma.first_name)) = 'author')
  AND (SELECT COUNT(*) FROM manuscript_authors sub_ma WHERE sub_ma.manuscript_id = ma.manuscript_id) = 1;
