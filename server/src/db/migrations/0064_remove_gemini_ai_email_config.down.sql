-- Rollback migration: 0064_remove_gemini_ai_email_config.down.sql
-- Re-insert the Gemini model config row if the rollback is ever requested.
INSERT INTO ai_email_config (config_key, config_value, is_active)
VALUES ('ai_gemini_model', '"gemini-3.6-flash"'::jsonb, true)
ON CONFLICT (config_key) DO NOTHING;