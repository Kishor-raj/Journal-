CREATE TABLE reviewer_expertise (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reviewer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  proficiency_level SMALLINT CHECK (proficiency_level >= 1 AND proficiency_level <= 5),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(reviewer_id, category_id)
);
CREATE INDEX idx_reviewer_expertise_category ON reviewer_expertise(category_id);
