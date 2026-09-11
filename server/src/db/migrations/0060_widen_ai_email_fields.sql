-- Widen ai_email_processing columns so long AI-generated intent sentences and model names don't trigger VARCHAR(100) overflow
ALTER TABLE ai_email_processing ALTER COLUMN intent TYPE TEXT;
ALTER TABLE ai_email_processing ALTER COLUMN model_name TYPE TEXT;
ALTER TABLE ai_email_processing ALTER COLUMN prompt_version TYPE TEXT;
ALTER TABLE ai_email_processing ALTER COLUMN classification TYPE TEXT;
ALTER TABLE ai_email_replies ALTER COLUMN decision TYPE TEXT;
