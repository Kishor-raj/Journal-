CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  role_id UUID REFERENCES roles(id) ON DELETE RESTRICT,
  email CITEXT UNIQUE NOT NULL,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  display_name VARCHAR(200),
  phone VARCHAR(30),
  institution VARCHAR(255),
  department VARCHAR(255),
  country VARCHAR(100),
  bio TEXT,
  orcid_id VARCHAR(30),
  profile_image_url TEXT,
  is_email_verified BOOLEAN DEFAULT false,
  account_status account_status_enum DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role_id ON users(role_id);
