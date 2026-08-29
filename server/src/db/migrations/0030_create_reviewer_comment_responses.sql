CREATE TABLE reviewer_comment_responses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  revision_response_id UUID NOT NULL REFERENCES revision_responses(id) ON DELETE CASCADE,
  review_id UUID NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
  comment_reference TEXT,
  author_response TEXT NOT NULL,
  change_reference TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_reviewer_comment_responses_revision ON reviewer_comment_responses(revision_response_id);
