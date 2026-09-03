-- Email notifications ledger with idempotency/retry support
CREATE TABLE IF NOT EXISTS email_notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  journal_id UUID,
  manuscript_id UUID,
  recipient_user_id UUID,
  recipient_email CITEXT NOT NULL,
  template_key VARCHAR(100) NOT NULL,
  event_key VARCHAR(255) UNIQUE,
  related_event_id UUID,
  data JSONB,
  provider VARCHAR(50),
  provider_message_id VARCHAR(255),
  status VARCHAR(30) NOT NULL DEFAULT 'queued',
  attempt_count INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  queued_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  sent_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_email_notifications_manuscript ON email_notifications (manuscript_id);
CREATE INDEX IF NOT EXISTS idx_email_notifications_recipient_user ON email_notifications (recipient_user_id);
CREATE INDEX IF NOT EXISTS idx_email_notifications_status ON email_notifications (status);
CREATE INDEX IF NOT EXISTS idx_email_notifications_event_key ON email_notifications (event_key);

CREATE OR REPLACE FUNCTION update_email_notifications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_email_notifications_updated_at ON email_notifications;
CREATE TRIGGER update_email_notifications_updated_at
  BEFORE UPDATE ON email_notifications
  FOR EACH ROW EXECUTE FUNCTION update_email_notifications_updated_at();
