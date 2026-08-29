CREATE TABLE user_identities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider VARCHAR(30) NOT NULL,
  provider_subject VARCHAR(255) UNIQUE NOT NULL,
  provider_email CITEXT,
  provider_name VARCHAR(255),
  access_token_encrypted TEXT,
  refresh_token_encrypted TEXT,
  token_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_user_identities_provider_subject ON user_identities(provider_subject);
