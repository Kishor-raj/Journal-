INSERT INTO categories (name, is_active)
SELECT name, true
FROM (VALUES
  ('Machine Learning'),
  ('Computer Vision'),
  ('Natural Language Processing'),
  ('Software Engineering'),
  ('Cybersecurity'),
  ('Quantum Computing'),
  ('IoT / Edge Computing')
) AS subject_categories(name)
ON CONFLICT (name) DO UPDATE
SET is_active = true,
    updated_at = now();
