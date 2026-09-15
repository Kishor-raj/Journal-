CREATE TABLE IF NOT EXISTS ai_email_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_key VARCHAR(100) NOT NULL UNIQUE,
  config_value JSONB NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_email_config_key ON ai_email_config (config_key) WHERE is_active = true;

COMMENT ON TABLE ai_email_config IS 'Runtime configuration for the AI email system';
COMMENT ON COLUMN ai_email_config.config_key IS 'Unique configuration key (e.g. ai_email_enabled, ai_auto_reply_confidence_threshold)';
COMMENT ON COLUMN ai_email_config.config_value IS 'JSONB value for the configuration option';
