import pool from '../../config/db.js'

const CATEGORIES = [
  'Manuscript Submission',
  'Editorial Inquiry',
  'Peer Review',
  'Publication',
  'Technical Support',
  'General Inquiry',
  'Other',
]

const STATUSES = ['NEW', 'READ', 'REPLIED', 'CLOSED']

const FIELD_LIMITS = {
  fullName: 200,
  email: 254,
  institution: 300,
  country: 100,
  subject: 300,
  category: 50,
  message: 5000,
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function validateContactInput(body) {
  const errors = []
  const payload = body && typeof body === 'object' ? body : {}

  const fullName = typeof payload.fullName === 'string' ? payload.fullName.trim() : ''
  if (!fullName) {
    errors.push('Full name is required.')
  } else if (fullName.length > FIELD_LIMITS.fullName) {
    errors.push(`Full name must not exceed ${FIELD_LIMITS.fullName} characters.`)
  }

  const email = typeof payload.email === 'string' ? payload.email.trim().toLowerCase() : ''
  if (!email) {
    errors.push('Email is required.')
  } else if (!EMAIL_REGEX.test(email)) {
    errors.push('Please provide a valid email address.')
  } else if (email.length > FIELD_LIMITS.email) {
    errors.push(`Email must not exceed ${FIELD_LIMITS.email} characters.`)
  }

  const institution = typeof payload.institution === 'string' ? payload.institution.trim() : ''
  if (institution.length > FIELD_LIMITS.institution) {
    errors.push(`Institution must not exceed ${FIELD_LIMITS.institution} characters.`)
  }

  const country = typeof payload.country === 'string' ? payload.country.trim() : ''
  if (country.length > FIELD_LIMITS.country) {
    errors.push(`Country must not exceed ${FIELD_LIMITS.country} characters.`)
  }

  const subject = typeof payload.subject === 'string' ? payload.subject.trim() : ''
  if (!subject) {
    errors.push('Subject is required.')
  } else if (subject.length > FIELD_LIMITS.subject) {
    errors.push(`Subject must not exceed ${FIELD_LIMITS.subject} characters.`)
  }

  const category = typeof payload.category === 'string' ? payload.category.trim() : ''
  if (!category) {
    errors.push('Category is required.')
  } else if (!CATEGORIES.includes(category)) {
    errors.push('Invalid category selected.')
  }

  const message = typeof payload.message === 'string' ? payload.message.trim() : ''
  if (!message) {
    errors.push('Message is required.')
  } else if (message.length > FIELD_LIMITS.message) {
    errors.push(`Message must not exceed ${FIELD_LIMITS.message} characters.`)
  }

  if (errors.length > 0) {
    return { valid: false, errors }
  }

  return {
    valid: true,
    data: { fullName, email, institution, country, subject, category, message },
  }
}

export async function createInquiry({ fullName, email, institution, country, subject, category, message, honeypot }) {
  const result = await pool.query(
    `INSERT INTO contact_inquiries (full_name, email, institution, country, subject, category, message, honeypot)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING id, full_name, email, subject, category, status, created_at`,
    [fullName, email, institution || null, country || null, subject, category, message, honeypot || null]
  )
  return result.rows[0]
}

export async function markNotificationSent(id) {
  await pool.query(
    'UPDATE contact_inquiries SET notification_sent = true WHERE id = $1',
    [id]
  )
}

export async function markNotificationFailed(id, errorMessage) {
  await pool.query(
    'UPDATE contact_inquiries SET notification_error = $1 WHERE id = $2',
    [errorMessage, id]
  )
}

export async function getInquiries({ page = 1, limit = 20, status, search }) {
  const conditions = ['1=1']
  const params = []
  let paramIndex = 1

  if (status && STATUSES.includes(status)) {
    conditions.push(`status = $${paramIndex++}`)
    params.push(status)
  }

  if (search && typeof search === 'string' && search.trim()) {
    const term = `%${search.trim().toLowerCase()}%`
    conditions.push(`(LOWER(full_name) LIKE $${paramIndex} OR LOWER(email) LIKE $${paramIndex} OR LOWER(subject) LIKE $${paramIndex})`)
    params.push(term)
    paramIndex++
  }

  const whereClause = conditions.join(' AND ')
  const offset = (Math.max(1, Number(page)) - 1) * Math.min(Math.max(1, Number(limit)), 100)
  const safeLimit = Math.min(Math.max(1, Number(limit)), 100)

  const countResult = await pool.query(
    `SELECT COUNT(*)::int AS total FROM contact_inquiries WHERE ${whereClause}`,
    params
  )

  const dataResult = await pool.query(
    `SELECT id, full_name, email, institution, country, subject, category, message,
            status, notification_sent, notification_error, created_at, updated_at
     FROM contact_inquiries
     WHERE ${whereClause}
     ORDER BY created_at DESC
     LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
    [...params, safeLimit, offset]
  )

  return {
    inquiries: dataResult.rows,
    pagination: {
      page: Math.max(1, Number(page)),
      limit: safeLimit,
      total: countResult.rows[0].total,
      pages: Math.ceil(countResult.rows[0].total / safeLimit),
    },
  }
}

export async function getInquiryById(id) {
  const result = await pool.query(
    `SELECT id, full_name, email, institution, country, subject, category, message,
            status, notification_sent, notification_error, created_at, updated_at
     FROM contact_inquiries
     WHERE id = $1`,
    [id]
  )
  return result.rows[0] || null
}

export async function updateInquiryStatus(id, status) {
  if (!STATUSES.includes(status)) {
    return null
  }
  const result = await pool.query(
    `UPDATE contact_inquiries SET status = $1 WHERE id = $2
     RETURNING id, full_name, email, subject, category, status, created_at, updated_at`,
    [status, id]
  )
  return result.rows[0] || null
}
