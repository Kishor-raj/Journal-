-- Migration 0071: Update journal branding details for IJIDCR
UPDATE journals
SET
  name = 'INTERNATIONAL JOURNAL OF INTELLIGENT DIGITAL COMPUTING RESEARCH (IJIDCR)',
  short_name = 'IJIDCR',
  publisher_name = 'ASGARD INTERNATIONAL RESEARCH PUBLICATION',
  website_url = 'https://ijidcr-asgard.in/',
  updated_at = NOW()
WHERE is_active = true OR short_name = 'JAR' OR short_name = 'IJIDCR';
