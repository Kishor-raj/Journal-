import pg from 'pg'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

dotenv.config({ path: path.resolve(import.meta.dirname, '../../.env') })

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })

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
    ]
    for (const t of templates) {
      await client.query(
        `INSERT INTO email_templates (journal_id, template_key, subject, body_html, body_text)
         SELECT id, $1, $2, '<p>Placeholder</p>', 'Placeholder'
         FROM journals WHERE short_name = 'JAR'
         ON CONFLICT (journal_id, template_key) DO NOTHING`,
        [t.key, t.subject]
      )
    }
    console.log('✓ Email templates seeded')

    // Seed admin user
    const adminRoleId = (await client.query(`SELECT id FROM roles WHERE name = 'admin'`)).rows[0]?.id
    if (adminRoleId) {
      await client.query(
        `INSERT INTO users (role_id, email, first_name, last_name, display_name, is_email_verified, account_status)
         VALUES ($1, 'admin@jar-journal.org', 'System', 'Admin', 'System Admin', true, 'active')
         ON CONFLICT (email) DO NOTHING`,
        [adminRoleId]
      )
      await client.query(
        `INSERT INTO user_roles (user_id, role_id)
         SELECT u.id, r.id FROM users u CROSS JOIN roles r
         WHERE u.email = 'admin@jar-journal.org'
         ON CONFLICT (user_id, role_id) DO NOTHING`
      )
      console.log('✓ Admin user seeded')
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
