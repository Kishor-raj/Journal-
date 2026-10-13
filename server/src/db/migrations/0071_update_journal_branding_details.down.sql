-- Migration 0071 Down: Revert journal branding details
UPDATE journals
SET
  name = 'Journal of Advanced Research',
  short_name = 'JAR',
  publisher_name = 'Academic Publishing House',
  website_url = NULL,
  updated_at = NOW()
WHERE is_active = true OR short_name = 'IJIDCR';
