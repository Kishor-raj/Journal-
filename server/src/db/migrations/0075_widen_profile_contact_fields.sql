-- 0075_widen_profile_contact_fields.sql
-- Widen contact/identity columns so international phone numbers and full
-- ORCID URLs (https://orcid.org/0000-0002-1825-0097) fit without overflow.

ALTER TABLE users
  ALTER COLUMN phone TYPE VARCHAR(50),
  ALTER COLUMN orcid_id TYPE VARCHAR(100);

ALTER TABLE editorial_applications
  ALTER COLUMN phone TYPE VARCHAR(50),
  ALTER COLUMN orcid_id TYPE VARCHAR(100);

ALTER TABLE manuscript_authors
  ALTER COLUMN orcid_id TYPE VARCHAR(100);

ALTER TABLE reviewer_suggestions
  ALTER COLUMN orcid_id TYPE VARCHAR(100);
