DROP TRIGGER IF EXISTS update_ai_email_replies_updated_at ON ai_email_replies;
DROP FUNCTION IF EXISTS update_ai_email_replies_updated_at();
DROP TABLE IF EXISTS ai_email_replies;
DROP TABLE IF EXISTS ai_email_processing;
DROP TABLE IF EXISTS emails;
DROP TRIGGER IF EXISTS update_email_threads_updated_at ON email_threads;
DROP FUNCTION IF EXISTS update_email_threads_updated_at();
DROP TABLE IF EXISTS email_threads;
