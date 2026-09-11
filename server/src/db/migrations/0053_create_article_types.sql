CREATE TABLE IF NOT EXISTS article_types (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(150) UNIQUE NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE article_types
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- Seed default article types
INSERT INTO article_types (name, sort_order) VALUES
  ('Original Research',    1),
  ('Review Article',       2),
  ('Case Study',           3),
  ('Short Communication',  4),
  ('Commentary',           5),
  ('Letter to Editor',     6),
  ('Book Review',          7),
  ('Technical Note',       8)
ON CONFLICT (name) DO NOTHING;
