CREATE TABLE password_reset_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash CHAR(64) UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  requested_ip INET,
  user_agent TEXT
);

CREATE INDEX idx_password_reset_tokens_user_id
  ON password_reset_tokens(user_id);

CREATE INDEX idx_password_reset_tokens_expires_at
  ON password_reset_tokens(expires_at);

CREATE INDEX idx_password_reset_tokens_token_hash
  ON password_reset_tokens(token_hash);
