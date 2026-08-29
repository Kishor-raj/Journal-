CREATE TABLE email_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  journal_id UUID NOT NULL REFERENCES journals(id) ON DELETE CASCADE,
  template_key VARCHAR(100) NOT NULL,
  subject VARCHAR(255) NOT NULL,
  body_html TEXT,
  body_text TEXT,
  variables_schema JSONB,
  is_active BOOLEAN DEFAULT true,
  updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(journal_id, template_key)
);
