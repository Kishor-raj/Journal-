-- Add reply_to_email to emails so the AI worker can distinguish "who should get the reply"
-- from the actual sender (from_email) when a message carries a Reply-To header
-- (e.g. Contact Form notifications where Reply-To is the visitor's address).
ALTER TABLE emails ADD COLUMN IF NOT EXISTS reply_to_email CITEXT;

CREATE INDEX IF NOT EXISTS idx_emails_reply_to_email ON emails (reply_to_email);