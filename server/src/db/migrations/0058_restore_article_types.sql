CREATE TABLE IF NOT EXISTS article_types (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(150) UNIQUE NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO article_types (name, sort_order) VALUES
  ('Original Research', 1),
  ('Review Article', 2),
  ('Case Study', 3),
  ('Short Communication', 4),
  ('Commentary', 5),
  ('Letter to Editor', 6),
  ('Book Review', 7),
  ('Technical Note', 8)
ON CONFLICT (name) DO NOTHING;
