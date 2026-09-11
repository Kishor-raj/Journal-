ALTER TABLE ai_email_processing ALTER COLUMN intent TYPE VARCHAR(100);
ALTER TABLE ai_email_processing ALTER COLUMN model_name TYPE VARCHAR(100);
ALTER TABLE ai_email_processing ALTER COLUMN prompt_version TYPE VARCHAR(50);
ALTER TABLE ai_email_processing ALTER COLUMN classification TYPE VARCHAR(50);
ALTER TABLE ai_email_replies ALTER COLUMN decision TYPE VARCHAR(30);
