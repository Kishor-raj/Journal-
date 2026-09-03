ALTER TABLE reviewer_invitations
  ADD COLUMN email_status VARCHAR(20) DEFAULT 'pending',
  ADD COLUMN email_sent_at TIMESTAMPTZ,
  ADD COLUMN email_message_id VARCHAR(255),
  ADD COLUMN email_error TEXT,
  ADD COLUMN resend_count INTEGER DEFAULT 0,
  ADD COLUMN last_resent_at TIMESTAMPTZ;

CREATE INDEX idx_reviewer_invitations_pending_expiry
  ON reviewer_invitations(expires_at)
  WHERE response IS NULL;
