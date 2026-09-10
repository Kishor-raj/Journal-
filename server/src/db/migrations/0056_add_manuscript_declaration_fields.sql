ALTER TABLE manuscripts
  ADD COLUMN IF NOT EXISTS conflict_of_interest TEXT,
  ADD COLUMN IF NOT EXISTS ethics_approval TEXT,
  ADD COLUMN IF NOT EXISTS funding TEXT,
  ADD COLUMN IF NOT EXISTS acknowledgements TEXT,
  ADD COLUMN IF NOT EXISTS data_availability TEXT;
