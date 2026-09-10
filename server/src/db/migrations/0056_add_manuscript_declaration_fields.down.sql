ALTER TABLE manuscripts
  DROP COLUMN IF EXISTS data_availability,
  DROP COLUMN IF EXISTS acknowledgements,
  DROP COLUMN IF EXISTS funding,
  DROP COLUMN IF EXISTS ethics_approval,
  DROP COLUMN IF EXISTS conflict_of_interest;
