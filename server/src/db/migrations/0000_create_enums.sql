CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "citext";

CREATE TYPE account_status_enum AS ENUM ('active', 'disabled', 'locked');
CREATE TYPE manuscript_status_enum AS ENUM ('draft', 'submitted', 'under_moderation', 'desk_rejected', 'editor_assignment', 'under_review', 'revision_requested', 'resubmitted', 'accepted', 'rejected', 'withdrawn', 'published');
CREATE TYPE moderator_decision_enum AS ENUM ('proceed', 'return', 'reject');
CREATE TYPE editorial_decision_enum AS ENUM ('accept', 'reject', 'minor_revision', 'major_revision', 'desk_reject');
CREATE TYPE review_recommendation_enum AS ENUM ('accept', 'minor_revision', 'major_revision', 'reject');
CREATE TYPE assignment_status_enum AS ENUM ('invited', 'accepted', 'declined', 'completed', 'expired', 'revoked');
CREATE TYPE invitation_response_enum AS ENUM ('accepted', 'declined', 'expired');
CREATE TYPE withdrawal_status_enum AS ENUM ('requested', 'approved', 'rejected');
CREATE TYPE extension_status_enum AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE suggestion_type_enum AS ENUM ('suggest', 'oppose');
CREATE TYPE revision_response_status_enum AS ENUM ('draft', 'submitted', 'reviewed');
