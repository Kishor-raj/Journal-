ALTER TABLE emails DROP COLUMN IF EXISTS reply_to_email;
DROP INDEX IF EXISTS idx_emails_reply_to_email;