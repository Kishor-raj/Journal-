CREATE TABLE journals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  short_name VARCHAR(50),
  issn_print VARCHAR(20),
  issn_online VARCHAR(20),
  description TEXT,
  publisher_name VARCHAR(255),
  contact_email VARCHAR(255),
  website_url TEXT,
  logo_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
