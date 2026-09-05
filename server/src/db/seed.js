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
      {
        key: 'submission_received',
        subject: 'Your manuscript has been submitted — {{submission_number}}',
        body_html: `<p>Dear {{author_name}},</p><p>Your manuscript has been successfully submitted to {{journal_name}}.</p><p><strong>Submission Number:</strong> {{submission_number}}<br/><strong>Title:</strong> {{manuscript_title}}<br/><strong>Submitted:</strong> {{submitted_at}}</p><p>Your submission will now undergo editorial screening. You will be notified of any updates to your manuscript status.</p><p><a href="{{manuscript_url}}" style="background:#1f3b4d;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block">View Submission</a></p><p>If the button does not work, copy and paste this link into your browser:<br/>{{manuscript_url}}</p><p>Thank you,<br/>{{journal_name}}</p>`,
        body_text: `Dear {{author_name}},\n\nYour manuscript has been successfully submitted to {{journal_name}}.\n\nSubmission Number: {{submission_number}}\nTitle: {{manuscript_title}}\nSubmitted: {{submitted_at}}\n\nYour submission will now undergo editorial screening. You will be notified of any updates to your manuscript status.\n\nView your submission: {{manuscript_url}}\n\nThank you,\n{{journal_name}}`,
      },
      {
        key: 'desk_rejected',
        subject: 'Update on manuscript {{submission_number}}',
        body_html: `<p>Dear {{author_name}},</p><p>Thank you for submitting your manuscript to {{journal_name}}. After careful consideration during the initial screening, we regret to inform you that your manuscript has not been accepted for further review.</p><p><strong>Submission Number:</strong> {{submission_number}}<br/><strong>Title:</strong> {{manuscript_title}}</p>{{#if decision_reason}}<p><strong>Reason:</strong> {{decision_reason}}</p>{{/if}}{{#if moderation_notes_to_author}}<p><strong>Additional Notes:</strong> {{moderation_notes_to_author}}</p>{{/if}}<p>We encourage you to consider the feedback provided and may submit a revised manuscript in the future if appropriate.</p><p><a href="{{manuscript_url}}" style="background:#1f3b4d;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block">View Submission</a></p><p>If you have any questions, please contact the editorial office.</p><p>Thank you,<br/>{{journal_name}}</p>`,
        body_text: `Dear {{author_name}},\n\nThank you for submitting your manuscript to {{journal_name}}. After careful consideration during the initial screening, we regret to inform you that your manuscript has not been accepted for further review.\n\nSubmission Number: {{submission_number}}\nTitle: {{manuscript_title}}\n\nReason: {{decision_reason}}\nAdditional Notes: {{moderation_notes_to_author}}\n\nWe encourage you to consider the feedback provided and may submit a revised manuscript in the future if appropriate.\n\nView your submission: {{manuscript_url}}\n\nIf you have any questions, please contact the editorial office.\n\nThank you,\n{{journal_name}}`,
      },
      {
        key: 'reviewer_invited',
        subject: 'You are invited to review a manuscript for {{journal_name}}',
        body_html: `<p>Dear {{reviewer_name}},</p><p>You have been invited to review the following manuscript for {{journal_name}}:</p><p><strong>Title:</strong> {{manuscript_title}}<br/><strong>Submission:</strong> {{submission_number}}<br/><strong>Review deadline:</strong> {{review_deadline}}</p><p>Please review the invitation and respond using the secure link below:</p><p><a href="{{invitation_url}}" style="background:#1f3b4d;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block">View Review Invitation</a></p><p>If the button does not work, copy and paste this link into your browser:<br/>{{invitation_url}}</p><p>Thank you,<br/>{{journal_name}}</p>`,
        body_text: `Dear {{reviewer_name}},\n\nYou have been invited to review the following manuscript for {{journal_name}}:\n\nTitle: {{manuscript_title}}\nSubmission: {{submission_number}}\nReview deadline: {{review_deadline}}\n\nPlease review the invitation and respond using the secure link below:\n\n{{invitation_url}}\n\nIf the button does not work, copy and paste this link into your browser.\n\nThank you,\n{{journal_name}}`,
      },
      {
        key: 'editorial_accepted',
        subject: 'Manuscript accepted — {{submission_number}}',
        body_html: `<p>Dear {{author_name}},</p><p>We are pleased to inform you that your manuscript has been accepted for publication in {{journal_name}}.</p><p><strong>Submission Number:</strong> {{submission_number}}<br/><strong>Title:</strong> {{manuscript_title}}<br/><strong>Decision Date:</strong> {{decision_date}}</p><p>Your manuscript will now proceed to the production stage. You will receive further communication regarding galley proofs and publication details.</p><p><a href="{{manuscript_url}}" style="background:#1f3b4d;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block">View Manuscript</a></p><p>If you have any questions, please contact the editorial office.</p><p>Congratulations!<br/>{{journal_name}}</p>`,
        body_text: `Dear {{author_name}},\n\nWe are pleased to inform you that your manuscript has been accepted for publication in {{journal_name}}.\n\nSubmission Number: {{submission_number}}\nTitle: {{manuscript_title}}\nDecision Date: {{decision_date}}\n\nYour manuscript will now proceed to the production stage. You will receive further communication regarding galley proofs and publication details.\n\nView your manuscript: {{manuscript_url}}\n\nIf you have any questions, please contact the editorial office.\n\nCongratulations!\n{{journal_name}}`,
      },
      {
        key: 'editorial_rejected',
        subject: 'Manuscript decision — {{submission_number}}',
        body_html: `<p>Dear {{author_name}},</p><p>Thank you for submitting your manuscript to {{journal_name}}. After careful review and evaluation, we regret to inform you that your manuscript has not been accepted for publication.</p><p><strong>Submission Number:</strong> {{submission_number}}<br/><strong>Title:</strong> {{manuscript_title}}<br/><strong>Decision Date:</strong> {{decision_date}}</p>{{#if comments_to_author}}<p><strong>Comments from the Editor:</strong></p><p>{{comments_to_author}}</p>{{/if}}<p>We appreciate your interest in publishing with {{journal_name}} and encourage you to consider submitting future work.</p><p><a href="{{manuscript_url}}" style="background:#1f3b4d;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block">View Submission</a></p><p>If you have any questions, please contact the editorial office.</p><p>Thank you,<br/>{{journal_name}}</p>`,
        body_text: `Dear {{author_name}},\n\nThank you for submitting your manuscript to {{journal_name}}. After careful review and evaluation, we regret to inform you that your manuscript has not been accepted for publication.\n\nSubmission Number: {{submission_number}}\nTitle: {{manuscript_title}}\nDecision Date: {{decision_date}}\n\nComments from the Editor:\n{{comments_to_author}}\n\nWe appreciate your interest in publishing with {{journal_name}} and encourage you to consider submitting future work.\n\nView your submission: {{manuscript_url}}\n\nIf you have any questions, please contact the editorial office.\n\nThank you,\n{{journal_name}}`,
      },
      {
        key: 'minor_revision_requested',
        subject: 'Minor revision requested — {{submission_number}}',
        body_html: `<p>Dear {{author_name}},</p><p>Thank you for submitting your manuscript to {{journal_name}}. After review, we would like to invite you to submit a revised version of your manuscript addressing minor changes.</p><p><strong>Submission Number:</strong> {{submission_number}}<br/><strong>Title:</strong> {{manuscript_title}}<br/><strong>Revision Deadline:</strong> {{revision_due_at}}</p>{{#if revision_instructions}}<p><strong>Instructions for Revision:</strong></p><p>{{revision_instructions}}</p>{{/if}}<p>Please submit your revised manuscript by the deadline above. If you require an extension, please contact the editorial office before the deadline.</p><p><a href="{{revision_url}}" style="background:#1f3b4d;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block">Submit Revision</a></p><p>If the button does not work, copy and paste this link into your browser:<br/>{{revision_url}}</p><p>Thank you,<br/>{{journal_name}}</p>`,
        body_text: `Dear {{author_name}},\n\nThank you for submitting your manuscript to {{journal_name}}. After review, we would like to invite you to submit a revised version of your manuscript addressing minor changes.\n\nSubmission Number: {{submission_number}}\nTitle: {{manuscript_title}}\nRevision Deadline: {{revision_due_at}}\n\nInstructions for Revision:\n{{revision_instructions}}\n\nPlease submit your revised manuscript by the deadline above. If you require an extension, please contact the editorial office before the deadline.\n\nSubmit your revision: {{revision_url}}\n\nThank you,\n{{journal_name}}`,
      },
      {
        key: 'major_revision_requested',
        subject: 'Major revision requested — {{submission_number}}',
        body_html: `<p>Dear {{author_name}},</p><p>Thank you for submitting your manuscript to {{journal_name}}. After thorough review, we would like to invite you to submit a substantially revised version of your manuscript.</p><p><strong>Submission Number:</strong> {{submission_number}}<br/><strong>Title:</strong> {{manuscript_title}}<br/><strong>Revision Deadline:</strong> {{revision_due_at}}</p>{{#if revision_instructions}}<p><strong>Instructions for Revision:</strong></p><p>{{revision_instructions}}</p>{{/if}}<p>The review panel has identified areas that require significant changes. Please address all the points raised in your revised submission. The revised manuscript will undergo another round of review.</p><p><a href="{{revision_url}}" style="background:#1f3b4d;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block">Submit Revision</a></p><p>If the button does not work, copy and paste this link into your browser:<br/>{{revision_url}}</p><p>Thank you,<br/>{{journal_name}}</p>`,
        body_text: `Dear {{author_name}},\n\nThank you for submitting your manuscript to {{journal_name}}. After thorough review, we would like to invite you to submit a substantially revised version of your manuscript.\n\nSubmission Number: {{submission_number}}\nTitle: {{manuscript_title}}\nRevision Deadline: {{revision_due_at}}\n\nInstructions for Revision:\n{{revision_instructions}}\n\nThe review panel has identified areas that require significant changes. Please address all the points raised in your revised submission. The revised manuscript will undergo another round of review.\n\nSubmit your revision: {{revision_url}}\n\nThank you,\n{{journal_name}}`,
      },
      {
        key: 'draft_reminder',
        subject: 'You have an unfinished manuscript draft',
        body_html: `<p>Dear {{author_name}},</p><p>This is a friendly reminder that you have an unfinished manuscript draft in {{journal_name}}.</p><p><strong>Submission Number:</strong> {{submission_number}}<br/><strong>Title:</strong> {{manuscript_title}}<br/><strong>Last Updated:</strong> {{last_updated_at}}</p><p>When you are ready, you can continue working on your draft and submit it for review.</p><p><a href="{{draft_url}}" style="background:#1f3b4d;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block">Continue Draft</a></p><p>If the button does not work, copy and paste this link into your browser:<br/>{{draft_url}}</p><p>Thank you,<br/>{{journal_name}}</p>`,
        body_text: `Dear {{author_name}},\n\nThis is a friendly reminder that you have an unfinished manuscript draft in {{journal_name}}.\n\nSubmission Number: {{submission_number}}\nTitle: {{manuscript_title}}\nLast Updated: {{last_updated_at}}\n\nWhen you are ready, you can continue working on your draft and submit it for review.\n\nContinue your draft: {{draft_url}}\n\nThank you,\n{{journal_name}}`,
      },
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
        key: 'publication_certificate',
        subject: 'Certificate of Publication — {{submission_number}}',
        body_html: `<p>Dear {{author_name}},</p><p>Congratulations! Your manuscript has been officially published in {{journal_name}} and your <strong>Certificate of Publication</strong> is now available.</p><p><strong>Certificate Number:</strong> {{certificate_number}}<br/><strong>Article Number:</strong> {{submission_number}}<br/><strong>Title:</strong> {{manuscript_title}}<br/><strong>Volume:</strong> {{volume}} &nbsp;|&nbsp; <strong>Issue:</strong> {{issue}} &nbsp;|&nbsp; <strong>Year:</strong> {{publication_year}}<br/><strong>Publication Date:</strong> {{publication_date}}</p>{{#if certificate_download_url}}<p><a href="{{certificate_download_url}}" style="background:#1f3b4d;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block">Download Certificate</a></p>{{/if}}<p>You can also verify your certificate any time using this link:<br/>{{verification_url}}</p><p><a href="{{manuscript_url}}" style="background:#1f3b4d;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;display:inline-block">View Manuscript</a></p><p>Congratulations on your publication!<br/>{{journal_name}}</p>`,
        body_text: `Dear {{author_name}},\n\nCongratulations! Your manuscript has been officially published in {{journal_name}} and your Certificate of Publication is now available.\n\nCertificate Number: {{certificate_number}}\nArticle Number: {{submission_number}}\nTitle: {{manuscript_title}}\nVolume: {{volume}}\nIssue: {{issue}}\nYear: {{publication_year}}\nPublication Date: {{publication_date}}\n\nDownload your certificate: {{certificate_download_url}}\nVerify your certificate: {{verification_url}}\nView your manuscript: {{manuscript_url}}\n\nCongratulations on your publication!\n{{journal_name}}`,
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
