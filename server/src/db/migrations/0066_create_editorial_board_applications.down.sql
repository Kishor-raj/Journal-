-- Rollback: 0066_create_editorial_board_applications.down.sql

DROP TABLE IF EXISTS editorial_members CASCADE;
DROP TABLE IF EXISTS editorial_appointments CASCADE;
DROP TABLE IF EXISTS editorial_role_grants CASCADE;
DROP TABLE IF EXISTS editorial_applications CASCADE;

DELETE FROM email_templates WHERE template_key IN (
  'editorial_application_received',
  'editorial_application_admin_alert',
  'editorial_application_clarification',
  'editorial_application_approved',
  'editorial_role_invitation',
  'editorial_application_rejected'
);
