-- Email webhook events for incoming email notifications
CREATE TABLE IF NOT EXISTS email_webhook_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider VARCHAR(50) NOT NULL DEFAULT 'hostinger',
  event_id VARCHAR(255) NOT NULL,
  event_type VARCHAR(100) NOT NULL,
  payload JSONB NOT NULL,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ,
  status VARCHAR(30) NOT NULL DEFAULT 'pending',
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_email_webhook_events_event_id ON email_webhook_events (event_id);
CREATE INDEX IF NOT EXISTS idx_email_webhook_events_status ON email_webhook_events (status);
CREATE INDEX IF NOT EXISTS idx_email_webhook_events_received_at ON email_webhook_events (received_at);
CREATE INDEX IF NOT EXISTS idx_email_webhook_events_provider ON email_webhook_events (provider);

CREATE OR REPLACE FUNCTION update_email_webhook_events_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_email_webhook_events_updated_at ON email_webhook_events;
CREATE TRIGGER update_email_webhook_events_updated_at
  BEFORE UPDATE ON email_webhook_events
  FOR EACH ROW EXECUTE FUNCTION update_email_webhook_events_updated_at();
