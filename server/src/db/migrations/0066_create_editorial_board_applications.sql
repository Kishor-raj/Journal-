-- Migration: 0066_create_editorial_board_applications.sql

CREATE TABLE IF NOT EXISTS editorial_applications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  application_number VARCHAR(50) UNIQUE NOT NULL,
  email CITEXT NOT NULL,
  full_name VARCHAR(200) NOT NULL,
  academic_title VARCHAR(50),
  designation VARCHAR(200) NOT NULL,
  department VARCHAR(200) NOT NULL,
  institution VARCHAR(255) NOT NULL,
  country VARCHAR(100) NOT NULL,
  phone VARCHAR(30),
  profile_image_url TEXT,
  profile_image_public_id TEXT,
  orcid_id VARCHAR(50),
  google_scholar_url TEXT,
  google_scholar_h_index INTEGER DEFAULT 0,
  scopus_id VARCHAR(100),
  scopus_url TEXT,
  wos_researcher_id VARCHAR(100),
  wos_profile_url TEXT,
  highest_qualification VARCHAR(100) NOT NULL,
  specialization VARCHAR(255) NOT NULL,
  university VARCHAR(255) NOT NULL,
  year_of_completion INTEGER NOT NULL,
  phd_title TEXT,
  primary_research_area VARCHAR(255) NOT NULL,
  secondary_research_areas TEXT[] DEFAULT '{}',
  research_keywords TEXT[] NOT NULL DEFAULT '{}',
  preferred_editorial_section VARCHAR(100) NOT NULL,
  total_journal_publications INTEGER DEFAULT 0,
  total_conference_publications INTEGER DEFAULT 0,
  book_chapters_count INTEGER DEFAULT 0,
  patents_count INTEGER DEFAULT 0,
  has_previous_editorial_experience BOOLEAN DEFAULT false,
  editorial_experiences JSONB DEFAULT '[]'::jsonb,
  preferred_role VARCHAR(100) NOT NULL,
  review_capacity VARCHAR(100),
  preferred_review_period VARCHAR(50),
  availability VARCHAR(50) DEFAULT 'Available',
  cv_file_url TEXT NOT NULL,
  cv_file_public_id TEXT,
  cv_file_name VARCHAR(255),
  cv_file_size INTEGER,
  cv_mime_type VARCHAR(100) DEFAULT 'application/pdf',
  supporting_documents JSONB DEFAULT '[]'::jsonb,
  statement_of_interest TEXT,
  contribution_statement TEXT,
  declaration_confidentiality BOOLEAN NOT NULL DEFAULT false,
  declaration_conflict_of_interest BOOLEAN NOT NULL DEFAULT false,
  declaration_ethics BOOLEAN NOT NULL DEFAULT false,
  declaration_accuracy BOOLEAN NOT NULL DEFAULT false,
  declaration_editorial_policy BOOLEAN NOT NULL DEFAULT false,
  declaration_terms_accepted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  status VARCHAR(50) NOT NULL DEFAULT 'SUBMITTED',
  verification_status JSONB DEFAULT '{"email_verified": false, "institution_verified": false, "orcid_verified": false, "cv_verified": false, "experience_verified": false}'::jsonb,
  verification_notes TEXT,
  admin_remarks TEXT,
  clarification_request TEXT,
  clarification_response TEXT,
  clarification_requested_at TIMESTAMPTZ,
  clarification_responded_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  decision_reason TEXT,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_editorial_applications_email ON editorial_applications(email);
CREATE INDEX IF NOT EXISTS idx_editorial_applications_status ON editorial_applications(status);
CREATE INDEX IF NOT EXISTS idx_editorial_applications_number ON editorial_applications(application_number);
CREATE INDEX IF NOT EXISTS idx_editorial_applications_created_at ON editorial_applications(created_at);

-- Role grants for approved applicants who do not yet have user accounts
CREATE TABLE IF NOT EXISTS editorial_role_grants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  application_id UUID NOT NULL REFERENCES editorial_applications(id) ON DELETE CASCADE,
  email CITEXT NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'editor',
  status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
  invitation_token_hash VARCHAR(255) UNIQUE NOT NULL,
  token_expires_at TIMESTAMPTZ NOT NULL,
  granted_at TIMESTAMPTZ DEFAULT now(),
  used_at TIMESTAMPTZ,
  created_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_editorial_role_grants_email ON editorial_role_grants(email);
CREATE INDEX IF NOT EXISTS idx_editorial_role_grants_token_hash ON editorial_role_grants(invitation_token_hash);
CREATE INDEX IF NOT EXISTS idx_editorial_role_grants_status ON editorial_role_grants(status);

-- Appointments table
CREATE TABLE IF NOT EXISTS editorial_appointments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  application_id UUID REFERENCES editorial_applications(id) ON DELETE SET NULL,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  position VARCHAR(100) NOT NULL,
  section VARCHAR(100),
  appointment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  term_start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  term_end_date DATE,
  status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
  appointment_letter_url TEXT,
  verification_token VARCHAR(100) UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_editorial_appointments_user_id ON editorial_appointments(user_id);
CREATE INDEX IF NOT EXISTS idx_editorial_appointments_status ON editorial_appointments(status);

-- Public Editorial Board members table
CREATE TABLE IF NOT EXISTS editorial_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  appointment_id UUID REFERENCES editorial_appointments(id) ON DELETE SET NULL,
  application_id UUID REFERENCES editorial_applications(id) ON DELETE SET NULL,
  name VARCHAR(200) NOT NULL,
  academic_title VARCHAR(50),
  designation VARCHAR(200),
  department VARCHAR(200),
  institution VARCHAR(255),
  country VARCHAR(100),
  role_title VARCHAR(100) NOT NULL,
  editorial_section VARCHAR(100),
  research_areas TEXT[] DEFAULT '{}',
  profile_image_url TEXT,
  profile_image_public_id TEXT,
  orcid TEXT,
  google_scholar TEXT,
  scopus TEXT,
  wos TEXT,
  profile_link TEXT,
  display_order INTEGER DEFAULT 0,
  is_published BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_editorial_members_published ON editorial_members(is_published);
CREATE INDEX IF NOT EXISTS idx_editorial_members_order ON editorial_members(display_order);

-- Insert email templates for editorial board workflow
INSERT INTO email_templates (journal_id, template_key, subject, body_html, body_text)
SELECT id, 'editorial_application_received',
  'IJIDCR Editorial Board Application Received — {{application_number}}',
  '<p>Dear {{applicant_name}},</p><p>Thank you for your application to join the Editorial Board of the <strong>International Journal of Intelligent Digital Computing Research (IJIDCR)</strong>.</p><p><strong>Application Reference:</strong> {{application_number}}<br/><strong>Submitted On:</strong> {{submitted_at}}<br/><strong>Preferred Role:</strong> {{preferred_role}}<br/><strong>Section:</strong> {{preferred_section}}<br/><strong>Status:</strong> Submitted (Under Review)</p><p>Our editorial administration team will review your credentials and verify your academic profile. You will receive updates via email as your application progresses.</p><p>You can track the status of your application at any time using the link below:</p><p><a href="{{status_url}}" style="background:#1f3b4d;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block">Track Application Status</a></p><p>Thank you for your interest in contributing to IJIDCR.</p><p>Warm regards,<br/>IJIDCR Editorial Office<br/>Asgard Research Publication</p>',
  'Dear {{applicant_name}},\n\nThank you for your application to join the Editorial Board of the International Journal of Intelligent Digital Computing Research (IJIDCR).\n\nApplication Reference: {{application_number}}\nSubmitted On: {{submitted_at}}\nPreferred Role: {{preferred_role}}\nSection: {{preferred_section}}\nStatus: Submitted (Under Review)\n\nOur editorial administration team will review your credentials and verify your academic profile. You will receive updates via email as your application progresses.\n\nTrack your application status: {{status_url}}\n\nThank you for your interest in contributing to IJIDCR.\n\nWarm regards,\nIJIDCR Editorial Office\nAsgard Research Publication'
FROM journals WHERE short_name = 'JAR'
ON CONFLICT (journal_id, template_key) DO NOTHING;

INSERT INTO email_templates (journal_id, template_key, subject, body_html, body_text)
SELECT id, 'editorial_application_admin_alert',
  'New Editorial Board Application — {{applicant_name}} ({{application_number}})',
  '<p>A new Editorial Board application has been received for IJIDCR.</p><p><strong>Applicant Name:</strong> {{applicant_name}}<br/><strong>Email:</strong> {{applicant_email}}<br/><strong>Institution:</strong> {{institution}}<br/><strong>Designation:</strong> {{designation}}<br/><strong>Country:</strong> {{country}}<br/><strong>Preferred Role:</strong> {{preferred_role}}<br/><strong>Preferred Section:</strong> {{preferred_section}}<br/><strong>Primary Research Area:</strong> {{primary_research_area}}<br/><strong>Application Number:</strong> {{application_number}}<br/><strong>Application Date:</strong> {{submitted_at}}</p><p><a href="{{admin_review_url}}" style="background:#1f3b4d;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block">Review Application in Admin Dashboard</a></p>',
  'A new Editorial Board application has been received for IJIDCR.\n\nApplicant Name: {{applicant_name}}\nEmail: {{applicant_email}}\nInstitution: {{institution}}\nDesignation: {{designation}}\nCountry: {{country}}\nPreferred Role: {{preferred_role}}\nPreferred Section: {{preferred_section}}\nPrimary Research Area: {{primary_research_area}}\nApplication Number: {{application_number}}\nApplication Date: {{submitted_at}}\n\nReview application: {{admin_review_url}}'
FROM journals WHERE short_name = 'JAR'
ON CONFLICT (journal_id, template_key) DO NOTHING;

INSERT INTO email_templates (journal_id, template_key, subject, body_html, body_text)
SELECT id, 'editorial_application_clarification',
  'Clarification Requested for Your IJIDCR Editorial Board Application — {{application_number}}',
  '<p>Dear {{applicant_name}},</p><p>Thank you for your application to join the IJIDCR Editorial Board (Ref: <strong>{{application_number}}</strong>).</p><p>During the verification process, our editorial administration team requested the following clarification:</p><blockquote style="border-left:4px solid #C4A24C;padding-left:16px;color:#333;margin:16px 0;">{{clarification_request}}</blockquote><p>Please click the button below to submit your response and provide any additional details required:</p><p><a href="{{response_url}}" style="background:#1f3b4d;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block">Respond to Clarification Request</a></p><p>Thank you for your cooperation.</p><p>Warm regards,<br/>IJIDCR Editorial Office</p>',
  'Dear {{applicant_name}},\n\nThank you for your application to join the IJIDCR Editorial Board (Ref: {{application_number}}).\n\nDuring the verification process, our editorial administration team requested the following clarification:\n\n{{clarification_request}}\n\nPlease submit your response here: {{response_url}}\n\nThank you for your cooperation.\n\nWarm regards,\nIJIDCR Editorial Office'
FROM journals WHERE short_name = 'JAR'
ON CONFLICT (journal_id, template_key) DO NOTHING;

INSERT INTO email_templates (journal_id, template_key, subject, body_html, body_text)
SELECT id, 'editorial_application_approved',
  'Congratulations! Your IJIDCR Editorial Board Application Has Been Approved — {{application_number}}',
  '<p>Dear {{applicant_name}},</p><p>We are delighted to inform you that your application to join the Editorial Board of the <strong>International Journal of Intelligent Digital Computing Research (IJIDCR)</strong> has been <strong>APPROVED</strong>.</p><p><strong>Appointment Position:</strong> {{position}}<br/><strong>Editorial Section:</strong> {{section}}<br/><strong>Appointment Date:</strong> {{appointment_date}}<br/><strong>Term Start:</strong> {{term_start_date}}</p><p>Your account has been granted Editor access. You may now log in to the Editor Workspace to oversee manuscript screening, reviewer assignments, and editorial decisions.</p><p><a href="{{login_url}}" style="background:#1f3b4d;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block">Go to Editor Workspace</a></p><p>Welcome to the IJIDCR Editorial Board!</p><p>Warm regards,<br/>Editor-in-Chief &amp; Editorial Office<br/>International Journal of Intelligent Digital Computing Research</p>',
  'Dear {{applicant_name}},\n\nWe are delighted to inform you that your application to join the Editorial Board of the International Journal of Intelligent Digital Computing Research (IJIDCR) has been APPROVED.\n\nAppointment Position: {{position}}\nEditorial Section: {{section}}\nAppointment Date: {{appointment_date}}\nTerm Start: {{term_start_date}}\n\nYour account has been granted Editor access. You may now log in to the Editor Workspace.\n\nLog in: {{login_url}}\n\nWelcome to the IJIDCR Editorial Board!\n\nWarm regards,\nEditor-in-Chief & Editorial Office\nIJIDCR'
FROM journals WHERE short_name = 'JAR'
ON CONFLICT (journal_id, template_key) DO NOTHING;

INSERT INTO email_templates (journal_id, template_key, subject, body_html, body_text)
SELECT id, 'editorial_role_invitation',
  'IJIDCR Editorial Board Application Approved — Create Your Account',
  '<p>Dear {{applicant_name}},</p><p>Congratulations! Your application to join the Editorial Board of the <strong>International Journal of Intelligent Digital Computing Research (IJIDCR)</strong> has been <strong>APPROVED</strong> as <strong>{{position}}</strong> (Section: {{section}}).</p><p>To complete your appointment and activate your Editor privileges, please create your account using your approved email address (<strong>{{approved_email}}</strong>):</p><p><a href="{{invitation_url}}" style="background:#1f3b4d;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block">Set Up Your Editor Account</a></p><p><em>Note: This invitation link is personal and will expire in {{expires_in}}. Please ensure you register using {{approved_email}}.</em></p><p>Welcome to the IJIDCR Editorial Board!</p><p>Warm regards,<br/>Editor-in-Chief &amp; Editorial Office<br/>IJIDCR</p>',
  'Dear {{applicant_name}},\n\nCongratulations! Your application to join the Editorial Board of the International Journal of Intelligent Digital Computing Research (IJIDCR) has been APPROVED as {{position}} (Section: {{section}}).\n\nTo complete your appointment and activate your Editor privileges, please create your account using your approved email address ({{approved_email}}):\n\n{{invitation_url}}\n\nThis invitation link will expire in {{expires_in}}.\n\nWelcome to the IJIDCR Editorial Board!\n\nWarm regards,\nIJIDCR Editorial Office'
FROM journals WHERE short_name = 'JAR'
ON CONFLICT (journal_id, template_key) DO NOTHING;

INSERT INTO email_templates (journal_id, template_key, subject, body_html, body_text)
SELECT id, 'editorial_application_rejected',
  'Update on Your IJIDCR Editorial Board Application — {{application_number}}',
  '<p>Dear {{applicant_name}},</p><p>Thank you for your interest in serving on the Editorial Board of the <strong>International Journal of Intelligent Digital Computing Research (IJIDCR)</strong> and for submitting your credentials.</p><p>After thorough evaluation of our current editorial requirements and section capacities, we regret to inform you that we are unable to offer you an editorial appointment at this time.</p>{{#if decision_reason}}<p><strong>Reviewer Notes:</strong> {{decision_reason}}</p>{{/if}}<p>We deeply appreciate your academic contributions and welcome your continued engagement with IJIDCR as an author and reviewer.</p><p>Warm regards,<br/>Editorial Office<br/>International Journal of Intelligent Digital Computing Research</p>',
  'Dear {{applicant_name}},\n\nThank you for your interest in serving on the Editorial Board of the International Journal of Intelligent Digital Computing Research (IJIDCR) and for submitting your credentials.\n\nAfter thorough evaluation of our current editorial requirements and section capacities, we regret to inform you that we are unable to offer you an editorial appointment at this time.\n\n{{#if decision_reason}}Reviewer Notes: {{decision_reason}}\n{{/if}}\nWe deeply appreciate your academic contributions and welcome your continued engagement with IJIDCR as an author and reviewer.\n\nWarm regards,\nEditorial Office\nIJIDCR'
FROM journals WHERE short_name = 'JAR'
ON CONFLICT (journal_id, template_key) DO NOTHING;
