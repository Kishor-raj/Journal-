DELETE FROM categories
WHERE name IN (
  'Machine Learning',
  'Computer Vision',
  'Natural Language Processing',
  'Software Engineering',
  'Cybersecurity',
  'Quantum Computing',
  'IoT / Edge Computing'
)
AND NOT EXISTS (
  SELECT 1 FROM manuscripts WHERE manuscripts.category_id = categories.id
);
