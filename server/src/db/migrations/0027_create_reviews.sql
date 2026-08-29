CREATE TABLE reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  assignment_id UUID NOT NULL REFERENCES reviewer_assignments(id) ON DELETE CASCADE,
  reviewer_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  manuscript_id UUID NOT NULL REFERENCES manuscripts(id) ON DELETE CASCADE,
  round_number INTEGER DEFAULT 1,
  recommendation review_recommendation_enum,
  public_comments TEXT,
  confidential_comments TEXT,
  score JSONB,
  submitted_at TIMESTAMPTZ,
  is_complete BOOLEAN DEFAULT false
);
CREATE INDEX idx_reviews_manuscript ON reviews(manuscript_id);
CREATE INDEX idx_reviews_assignment ON reviews(assignment_id);
