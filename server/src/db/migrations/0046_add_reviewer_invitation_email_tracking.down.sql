DROP INDEX IF EXISTS idx_reviewer_invitations_pending_expiry;

ALTER TABLE reviewer_invitations
  DROP COLUMN IF EXISTS email_status,
  DROP COLUMN IF EXISTS email_sent_at,
  DROP COLUMN IF EXISTS email_message_id,
  DROP COLUMN IF EXISTS email_error,
  DROP COLUMN IF EXISTS resend_count,
  DROP COLUMN IF EXISTS last_resent_at;
