CREATE TABLE user_role_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  old_role_id UUID REFERENCES roles(id) ON DELETE SET NULL,
  new_role_id UUID REFERENCES roles(id) ON DELETE SET NULL,
  changed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
