-- Remove obsolete Gemini AI email configuration. Groq is the only AI provider now.
DELETE FROM ai_email_config
WHERE config_key = 'ai_gemini_model';