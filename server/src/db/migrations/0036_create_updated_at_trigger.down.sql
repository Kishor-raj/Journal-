DROP TRIGGER IF EXISTS update_roles_updated_at ON roles;
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
DROP TRIGGER IF EXISTS update_user_identities_updated_at ON user_identities;
DROP TRIGGER IF EXISTS update_journals_updated_at ON journals;
DROP TRIGGER IF EXISTS update_submission_guidelines_updated_at ON submission_guidelines;
DROP TRIGGER IF EXISTS update_email_templates_updated_at ON email_templates;
DROP TRIGGER IF EXISTS update_categories_updated_at ON categories;
DROP TRIGGER IF EXISTS update_manuscripts_updated_at ON manuscripts;
DROP FUNCTION IF EXISTS update_updated_at_column();
