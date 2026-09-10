-- Article Type is the technical subject area; Subject / Category is the
-- manuscript format used by the journal.

INSERT INTO categories (name, is_active)
SELECT name, true
FROM (VALUES
  ('Original Research'),
  ('Review Article'),
  ('Case Study'),
  ('Short Communication'),
  ('Commentary'),
  ('Letter to Editor'),
  ('Book Review'),
  ('Technical Note')
) AS subject_categories(name)
ON CONFLICT (name) DO UPDATE
SET is_active = true,
    updated_at = now();

UPDATE categories
SET is_active = false,
    updated_at = now()
WHERE name NOT IN (
  'Original Research',
  'Review Article',
  'Case Study',
  'Short Communication',
  'Commentary',
  'Letter to Editor',
  'Book Review',
  'Technical Note'
);

DELETE FROM article_types
WHERE name IN (
  'Original Research',
  'Review Article',
  'Case Study',
  'Short Communication',
  'Commentary',
  'Letter to Editor',
  'Book Review',
  'Technical Note'
);

INSERT INTO article_types (name, sort_order)
VALUES
  ('Cybersecurity', 1),
  ('Computer Vision', 2),
  ('IoT', 3),
  ('Blockchain', 4)
ON CONFLICT (name) DO UPDATE
SET is_active = true,
    sort_order = EXCLUDED.sort_order,
    updated_at = now();
