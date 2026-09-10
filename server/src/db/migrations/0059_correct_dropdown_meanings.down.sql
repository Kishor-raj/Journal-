UPDATE categories
SET is_active = name IN (
  'Machine Learning',
  'Computer Vision',
  'Natural Language Processing',
  'Software Engineering',
  'Cybersecurity',
  'Quantum Computing',
  'IoT / Edge Computing'
), updated_at = now();

DELETE FROM article_types
WHERE name IN ('Cybersecurity', 'Computer Vision', 'IoT', 'Blockchain');

INSERT INTO article_types (name, sort_order)
VALUES
  ('Original Research', 1),
  ('Review Article', 2),
  ('Case Study', 3),
  ('Short Communication', 4),
  ('Commentary', 5),
  ('Letter to Editor', 6),
  ('Book Review', 7),
  ('Technical Note', 8)
ON CONFLICT (name) DO UPDATE
SET is_active = true,
    sort_order = EXCLUDED.sort_order,
    updated_at = now();
