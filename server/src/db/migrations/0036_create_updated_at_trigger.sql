CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_roles_updated_at BEFORE UPDATE ON roles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_identities_updated_at BEFORE UPDATE ON user_identities FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_journals_updated_at BEFORE UPDATE ON journals FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_submission_guidelines_updated_at BEFORE UPDATE ON submission_guidelines FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_email_templates_updated_at BEFORE UPDATE ON email_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON categories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_manuscripts_updated_at BEFORE UPDATE ON manuscripts FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
