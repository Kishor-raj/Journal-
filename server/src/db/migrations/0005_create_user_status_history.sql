CREATE TABLE user_status_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  old_status account_status_enum,
  new_status account_status_enum NOT NULL,
  changed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
