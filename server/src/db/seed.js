import pg from 'pg'
import dotenv from 'dotenv'
import path from 'path'
import bcrypt from 'bcryptjs'

dotenv.config({ path: path.resolve(import.meta.dirname, '../../.env') })

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })

const ADMIN_EMAIL = 'admin@jar-journal.org'
const ADMIN_PASSWORD = process.env.ADMIN_SEED_PASSWORD || 'Admin@123'

async function seed() {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    // Seed roles
    const roles = ['admin', 'author', 'moderator', 'editor', 'reviewer']
    for (const name of roles) {
      await client.query(
        `INSERT INTO roles (name, description) VALUES ($1, $2)
         ON CONFLICT (name) DO NOTHING`,
        [name, `${name} role`]
      )
    }
    console.log('✓ Roles seeded')

    // Seed journal
    await client.query(
      `INSERT INTO journals (name, short_name, description, publisher_name, contact_email)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT DO NOTHING`,
      [
        'Journal of Advanced Research',
        'JAR',
        'A peer-reviewed journal dedicated to publishing high-quality research across multiple disciplines.',
        'Academic Publishing House',
        'editorial@jar-journal.org',
      ]
    )
    console.log('✓ Journal seeded')

    // Seed categories
    const categories = [
      'Computer Science',
      'Electrical Engineering',
      'Mechanical Engineering',
      'Civil Engineering',
      'Chemical Engineering',
      'Biomedical Engineering',
      'Mathematics',
      'Physics',
      'Chemistry',
      'Biology',
      'Medicine',
      'Environmental Science',
      'Materials Science',
      'Artificial Intelligence',
      'Data Science',
    ]
    for (const name of categories) {
      await client.query(
        `INSERT INTO categories (name) VALUES ($1) ON CONFLICT (name) DO NOTHING`,
        [name]
      )
    }
    console.log('✓ Categories seeded')

    // Seed submission guidelines
    await client.query(
      `INSERT INTO submission_guidelines (journal_id, title, content, is_published, published_at)
       SELECT id, 'Submission Guidelines', 'Please follow these guidelines when submitting your manuscript.', true, now()
       FROM journals WHERE short_name = 'JAR'
       ON CONFLICT DO NOTHING`
    )
    console.log('✓ Submission guidelines seeded')

    // Seed email templates
    const templates = [
      { key: 'submission_received', subject: 'Manuscript Submission Received' },
      { key: 'desk_rejected', subject: 'Manuscript Desk Rejected' },
      { key: 'reviewer_invited', subject: 'Review Invitation' },
      { key: 'decision_issued', subject: 'Editorial Decision' },
      {
        key: 'account_verification',
        subject: 'Verify your email address',
        body_html: `<p>Hello {{first_name}},</p><p>Thank you for creating an account with Asgard Publications. Please verify your email address by clicking the button below.</p><p><a href="{{verification_url}}" style="background:#1f3b4d;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block">Verify Email</a></p><p>This link will expire in {{expires_in}}.</p><p>If you did not create this account, you can safely ignore this email.</p>`,
        body_text: `Hello {{first_name}},\n\nThank you for creating an account with Asgard Publications. Please verify your email address by visiting:\n\n{{verification_url}}\n\nThis link will expire in {{expires_in}}.\n\nIf you did not create this account, you can safely ignore this email.`,
      },
      {
        key: 'password_reset',
        subject: 'Reset your password',
        body_html: `<p>Hello {{first_name}},</p><p>We received a request to reset your password. Click the button below to choose a new password.</p><p><a href="{{reset_url}}" style="background:#1f3b4d;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block">Reset Password</a></p><p>This link will expire in {{expires_in}}.</p><p>If you did not request this, you can safely ignore this email.</p>`,
        body_text: `Hello {{first_name}},\n\nWe received a request to reset your password. Please visit:\n\n{{reset_url}}\n\nThis link will expire in {{expires_in}}.\n\nIf you did not request this, you can safely ignore this email.`,
      },
      {
        key: 'password_changed',
        subject: 'Your password has been changed',
        body_html: `<p>Hello {{first_name}},</p><p>Your password was changed successfully.</p><p>If you did not make this change, please contact the journal administrator immediately.</p>`,
        body_text: `Hello {{first_name}},\n\nYour password was changed successfully.\n\nIf you did not make this change, please contact the journal administrator immediately.`,
      },
      {
        key: 'reviewer_invitation',
        subject: 'You are invited to review a manuscript for {{journal_name}}',
        body_html: `<p>Dear {{reviewer_name}},</p><p>You have been invited to review the following manuscript for {{journal_name}}:</p><p><strong>Title:</strong> {{manuscript_title}}<br/><strong>Submission:</strong> {{submission_number}}<br/><strong>Review deadline:</strong> {{review_deadline}}</p><p>Please review the invitation and respond using the secure link below:</p><p><a href="{{invitation_url}}" style="background:#1f3b4d;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block">View Review Invitation</a></p><p>If the button does not work, copy and paste this link into your browser:<br/>{{invitation_url}}</p><p>Thank you,<br/>{{journal_name}}</p>`,
        body_text: `Dear {{reviewer_name}},\n\nYou have been invited to review the following manuscript for {{journal_name}}:\n\nTitle: {{manuscript_title}}\nSubmission: {{submission_number}}\nReview deadline: {{review_deadline}}\n\nPlease review the invitation and respond using the secure link below:\n\n{{invitation_url}}\n\nIf the button does not work, copy and paste this link into your browser.\n\nThank you,\n{{journal_name}}`,
      },
    ]
    for (const t of templates) {
      await client.query(
        `INSERT INTO email_templates (journal_id, template_key, subject, body_html, body_text)
         SELECT id, $1, $2, $3, $4
         FROM journals WHERE short_name = 'JAR'
         ON CONFLICT (journal_id, template_key) DO NOTHING`,
        [t.key, t.subject, t.body_html || '<p>Placeholder</p>', t.body_text || 'Placeholder']
      )
    }
    console.log('✓ Email templates seeded')

    // Seed admin user (with a password credential so password login works)
    const adminRoleId = (await client.query(`SELECT id FROM roles WHERE name = 'admin'`)).rows[0]?.id
    if (adminRoleId) {
      await client.query(
        `INSERT INTO users (role_id, email, first_name, last_name, display_name, is_email_verified, account_status)
         VALUES ($1, $2, 'System', 'Admin', 'System Admin', true, 'active')
         ON CONFLICT (email) DO NOTHING`,
        [adminRoleId, ADMIN_EMAIL]
      )
      await client.query(
        `UPDATE users SET is_email_verified = true, account_status = 'active' WHERE email = $1`,
        [ADMIN_EMAIL]
      )
      await client.query(
        `INSERT INTO user_roles (user_id, role_id)
         SELECT u.id, r.id FROM users u CROSS JOIN roles r
         WHERE u.email = $1
         ON CONFLICT (user_id, role_id) DO NOTHING`,
        [ADMIN_EMAIL]
      )
      const adminPasswordHash = await bcrypt.hash(ADMIN_PASSWORD, 12)
      await client.query(
        `INSERT INTO user_password_credentials (user_id, password_hash, failed_login_attempts)
         SELECT id, $1, 0 FROM users WHERE email = $2
         ON CONFLICT (user_id) DO UPDATE SET password_hash = EXCLUDED.password_hash, failed_login_attempts = 0, updated_at = now()`,
        [adminPasswordHash, ADMIN_EMAIL]
      )
      console.log('✓ Admin user seeded with password credential')
    }

    await client.query('COMMIT')
    console.log('Seed completed successfully')
  } catch (err) {
    await client.query('ROLLBACK')
    console.error('Seed failed:', err)
    throw err
  } finally {
    client.release()
    await pool.end()
  }
}

seed()
