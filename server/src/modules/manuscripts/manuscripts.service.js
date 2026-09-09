import crypto from 'crypto'
import pool from '../../config/db.js'
import { AppError } from '../../shared/errors/AppError.js'
import { sendSubmissionReceived } from '../notification/manuscript-notification.service.js'
import { generateSubmissionNumber } from './submission-number.service.js'

function generateShortUuid() {
  return crypto.randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase()
}

async function checkAccess(manuscriptId, userId) {
  const result = await pool.query(
    `SELECT 1 FROM manuscripts WHERE id = $1 AND submitted_by = $2
     UNION
     SELECT 1 FROM manuscript_authors WHERE manuscript_id = $1 AND user_id = $2`,
    [manuscriptId, userId]
  )
  return result.rowCount > 0
}

export async function createDraft(userId, journalId) {
  const submissionNumber = `DRAFT-${generateShortUuid()}`

  let jId = journalId;
  if (!jId) {
    const defaultJournal = await pool.query('SELECT id FROM journals LIMIT 1');
    jId = defaultJournal.rows[0]?.id || null;
  }

  const result = await pool.query(
    `INSERT INTO manuscripts (journal_id, submission_number, submitted_by, current_status)
     VALUES ($1, $2, $3, 'draft')
     RETURNING *`,
    [jId, submissionNumber, userId]
  )

  const draft = result.rows[0]

  if (userId) {
    try {
      const userRes = await pool.query(
        `SELECT id, first_name, last_name, display_name, email, institution, department, country, orcid_id
         FROM users WHERE id = $1`,
        [userId]
      )
      if (userRes.rows.length > 0) {
        const u = userRes.rows[0]
        let fName = u.first_name?.trim() || ''
        let lName = u.last_name?.trim() || ''
        if (!fName && !lName && u.display_name) {
          const parts = u.display_name.trim().split(/\s+/)
          fName = parts[0] || ''
          lName = parts.slice(1).join(' ') || ''
        }
        await pool.query(
          `INSERT INTO manuscript_authors
             (manuscript_id, user_id, author_order, first_name, last_name, email, institution, department, country, orcid_id, is_corresponding)
           VALUES ($1, $2, 1, $3, $4, $5, $6, $7, $8, $9, true)`,
          [draft.id, userId, fName, lName, u.email, u.institution, u.department, u.country, u.orcid_id]
        )
      }
    } catch (err) {
      console.error('[MANUSCRIPT] Failed to auto-insert primary author on draft creation:', err.message)
    }
  }

  return draft
}

export async function getManuscriptsByUser(userId) {
  const result = await pool.query(
    `SELECT DISTINCT m.*, j.name as journal_name, c.name as category_name
     FROM manuscripts m
     LEFT JOIN journals j ON j.id = m.journal_id
     LEFT JOIN categories c ON c.id = m.category_id
     LEFT JOIN manuscript_authors ma ON ma.manuscript_id = m.id
     WHERE m.submitted_by = $1 OR ma.user_id = $1
     ORDER BY m.created_at DESC`,
    [userId]
  )

  return result.rows
}

export async function getCategories() {
  const result = await pool.query('SELECT id, name FROM categories WHERE is_active = true ORDER BY name')
  return result.rows
}

export async function getArticleTypes() {
  const result = await pool.query(
    'SELECT id, name, description FROM article_types WHERE is_active = true ORDER BY sort_order, name'
  )
  return result.rows
}

export async function getManuscriptById(id, userId) {
  const hasAccess = await checkAccess(id, userId)
  if (!hasAccess) {
    throw new AppError('Manuscript not found', 404)
  }

  const manuscriptResult = await pool.query(
    `SELECT m.*, j.name as journal_name, c.name as category_name
     FROM manuscripts m
     LEFT JOIN journals j ON j.id = m.journal_id
     LEFT JOIN categories c ON c.id = m.category_id
     WHERE m.id = $1`,
    [id]
  )

  if (manuscriptResult.rows.length === 0) {
    throw new AppError('Manuscript not found', 404)
  }

  const manuscript = manuscriptResult.rows[0]

  const authorsResult = await pool.query(
    `SELECT * FROM manuscript_authors WHERE manuscript_id = $1 ORDER BY author_order`,
    [id]
  )

  if (authorsResult.rows.length === 0 && manuscript.submitted_by) {
    const userRes = await pool.query(
      `SELECT id, first_name, last_name, display_name, email, institution, department, country, orcid_id
       FROM users WHERE id = $1`,
      [manuscript.submitted_by]
    )
    if (userRes.rows.length > 0) {
      const u = userRes.rows[0]
      let fName = u.first_name?.trim() || ''
      let lName = u.last_name?.trim() || ''
      if (!fName && !lName && u.display_name) {
        const parts = u.display_name.trim().split(/\s+/)
        fName = parts[0] || ''
        lName = parts.slice(1).join(' ') || ''
      }
      const insRes = await pool.query(
        `INSERT INTO manuscript_authors
           (manuscript_id, user_id, author_order, first_name, last_name, email, institution, department, country, orcid_id, is_corresponding)
         VALUES ($1, $2, 1, $3, $4, $5, $6, $7, $8, $9, true)
         RETURNING *`,
        [id, manuscript.submitted_by, fName, lName, u.email, u.institution, u.department, u.country, u.orcid_id]
      )
      authorsResult.rows = insRes.rows
    }
  }

  const versionResult = await pool.query(
    `SELECT * FROM manuscript_versions WHERE manuscript_id = $1 ORDER BY version_number DESC LIMIT 1`,
    [id]
  )

  const filesResult = await pool.query(
    `SELECT * FROM manuscript_files WHERE manuscript_id = $1 ORDER BY uploaded_at`,
    [id]
  )

  return {
    ...manuscript,
    authors: authorsResult.rows,
    current_version: versionResult.rows[0] || null,
    files: filesResult.rows,
  }
}

export async function updateManuscript(id, data, userId) {
  const manuscriptResult = await pool.query(
    'SELECT * FROM manuscripts WHERE id = $1',
    [id]
  )

  if (manuscriptResult.rows.length === 0) {
    throw new AppError('Manuscript not found', 404)
  }

  if (manuscriptResult.rows[0].current_status !== 'draft') {
    throw new AppError('Only draft manuscripts can be updated', 400)
  }

  const hasAccess = await checkAccess(id, userId)
  if (!hasAccess) {
    throw new AppError('Manuscript not found', 404)
  }

  const { title, abstract, keywords, category_id, category, article_type } = data
  
  let rawCat = category_id ?? category ?? null
  let cId = (typeof rawCat === 'string' && rawCat.trim() !== '') ? rawCat.trim() : null

  if (cId && !cId.includes('-')) {
    const catResult = await pool.query('SELECT id FROM categories WHERE name = $1', [cId])
    if (catResult.rows.length > 0) {
      cId = catResult.rows[0].id
    } else {
      cId = null
    }
  }

  const result = await pool.query(
    `UPDATE manuscripts SET
       title = COALESCE($1, title),
       abstract = COALESCE($2, abstract),
       keywords = COALESCE($3, keywords),
       category_id = COALESCE($4, category_id),
       article_type = COALESCE($5, article_type),
       updated_at = now()
     WHERE id = $6
     RETURNING *`,
    [title ?? null, abstract ?? null, keywords ?? null, cId, article_type ?? null, id]
  )

  return result.rows[0]
}

export async function deleteDraft(id, userId) {
  const manuscriptResult = await pool.query(
    'SELECT current_status, submitted_by FROM manuscripts WHERE id = $1',
    [id]
  )
  if (manuscriptResult.rows.length === 0) {
    throw new AppError('Manuscript not found', 404)
  }
  if (manuscriptResult.rows[0].current_status !== 'draft') {
    throw new AppError('Only draft manuscripts can be deleted', 400)
  }
  if (manuscriptResult.rows[0].submitted_by !== userId) {
    throw new AppError('Unauthorized', 403)
  }
  await pool.query('DELETE FROM manuscripts WHERE id = $1', [id])
}

export async function addAuthor(manuscriptId, data, userId) {
  const manuscriptResult = await pool.query(
    'SELECT * FROM manuscripts WHERE id = $1',
    [manuscriptId]
  )

  if (manuscriptResult.rows.length === 0) {
    throw new AppError('Manuscript not found', 404)
  }

  if (manuscriptResult.rows[0].current_status !== 'draft') {
    throw new AppError('Cannot modify authors after submission', 400)
  }

  const hasAccess = await checkAccess(manuscriptId, userId)
  if (!hasAccess) {
    throw new AppError('Manuscript not found', 404)
  }

  const maxOrderResult = await pool.query(
    'SELECT COALESCE(MAX(author_order), 0) as max_order FROM manuscript_authors WHERE manuscript_id = $1',
    [manuscriptId]
  )

  const nextOrder = maxOrderResult.rows[0].max_order + 1

  let { user_id, first_name, last_name, email, institution, department, country, orcid_id, is_corresponding, contribution_roles } = data

  // If email is provided, lookup in users table to link user_id and populate missing author details
  if (email && (!first_name || !last_name || !user_id)) {
    const userRes = await pool.query(
      `SELECT id, first_name, last_name, display_name, institution, department, country, orcid_id
       FROM users WHERE LOWER(TRIM(email)) = LOWER(TRIM($1))`,
      [email]
    )
    if (userRes.rows.length > 0) {
      const u = userRes.rows[0]
      user_id = user_id || u.id
      first_name = first_name || u.first_name
      last_name = last_name || u.last_name
      if (!first_name && !last_name && u.display_name) {
        const parts = u.display_name.trim().split(/\s+/)
        first_name = parts[0] || ''
        last_name = parts.slice(1).join(' ') || ''
      }
      institution = institution || u.institution
      department = department || u.department
      country = country || u.country
      orcid_id = orcid_id || u.orcid_id
    }
  }

  // If a single name string was provided
  if (data.name && (!first_name && !last_name)) {
    const parts = String(data.name).trim().split(/\s+/)
    first_name = parts[0] || ''
    last_name = parts.slice(1).join(' ') || ''
  }

  const result = await pool.query(
    `INSERT INTO manuscript_authors (manuscript_id, user_id, author_order, first_name, last_name, email, institution, department, country, orcid_id, is_corresponding, contribution_roles)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
     RETURNING *`,
    [manuscriptId, user_id || null, nextOrder, first_name || null, last_name || null, email || null, institution || null, department || null, country || null, orcid_id || null, is_corresponding || false, contribution_roles || []]
  )

  return result.rows[0]
}

export async function updateAuthor(authorId, data, userId) {
  const authorResult = await pool.query(
    `SELECT ma.*, m.submitted_by
     FROM manuscript_authors ma
     JOIN manuscripts m ON m.id = ma.manuscript_id
     WHERE ma.id = $1`,
    [authorId]
  )

  if (authorResult.rows.length === 0) {
    throw new AppError('Author not found', 404)
  }

  const author = authorResult.rows[0]

  const manuscriptResult = await pool.query(
    'SELECT current_status FROM manuscripts WHERE id = $1',
    [author.manuscript_id]
  )

  if (manuscriptResult.rows[0].current_status !== 'draft') {
    throw new AppError('Cannot modify authors after submission', 400)
  }

  if (author.submitted_by !== userId) {
    const isAuthor = await pool.query(
      'SELECT 1 FROM manuscript_authors WHERE manuscript_id = $1 AND user_id = $2',
      [author.manuscript_id, userId]
    )
    if (isAuthor.rowCount === 0) {
      throw new AppError('Unauthorized', 403)
    }
  }

  const { first_name, last_name, email, institution, department, country, orcid_id, is_corresponding, contribution_roles, author_order } = data

  const result = await pool.query(
    `UPDATE manuscript_authors SET
       first_name = COALESCE($1, first_name),
       last_name = COALESCE($2, last_name),
       email = COALESCE($3, email),
       institution = COALESCE($4, institution),
       department = COALESCE($5, department),
       country = COALESCE($6, country),
       orcid_id = COALESCE($7, orcid_id),
       is_corresponding = COALESCE($8, is_corresponding),
       contribution_roles = COALESCE($9, contribution_roles),
       author_order = COALESCE($10, author_order)
     WHERE id = $11
     RETURNING *`,
    [first_name, last_name, email, institution, department, country, orcid_id, is_corresponding, contribution_roles, author_order, authorId]
  )

  return result.rows[0]
}

export async function removeAuthor(authorId, userId) {
  const authorResult = await pool.query(
    `SELECT ma.*, m.submitted_by
     FROM manuscript_authors ma
     JOIN manuscripts m ON m.id = ma.manuscript_id
     WHERE ma.id = $1`,
    [authorId]
  )

  if (authorResult.rows.length === 0) {
    throw new AppError('Author not found', 404)
  }

  const author = authorResult.rows[0]

  const manuscriptResult = await pool.query(
    'SELECT current_status FROM manuscripts WHERE id = $1',
    [author.manuscript_id]
  )

  if (manuscriptResult.rows[0].current_status !== 'draft') {
    throw new AppError('Cannot remove authors after submission', 400)
  }

  if (author.submitted_by !== userId) {
    throw new AppError('Unauthorized', 403)
  }

  await pool.query('DELETE FROM manuscript_authors WHERE id = $1', [authorId])
}

export async function submitManuscript(manuscriptId, userId) {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    const manuscriptResult = await client.query(
      'SELECT * FROM manuscripts WHERE id = $1 FOR UPDATE',
      [manuscriptId]
    )

    if (manuscriptResult.rows.length === 0) {
      throw new AppError('Manuscript not found', 404)
    }

    const manuscript = manuscriptResult.rows[0]

    if (manuscript.current_status !== 'draft') {
      throw new AppError('Only draft manuscripts can be submitted', 400)
    }

    if (manuscript.submitted_by !== userId) {
      throw new AppError('Unauthorized', 403)
    }

    let authorsResult = await client.query(
      'SELECT id FROM manuscript_authors WHERE manuscript_id = $1',
      [manuscriptId]
    )

    if (authorsResult.rows.length === 0) {
      const userRes = await client.query(
        `SELECT id, first_name, last_name, display_name, email, institution, department, country, orcid_id
         FROM users WHERE id = $1`,
        [userId]
      )
      if (userRes.rows.length > 0) {
        const u = userRes.rows[0]
        let fName = u.first_name?.trim() || ''
        let lName = u.last_name?.trim() || ''
        if (!fName && !lName && u.display_name) {
          const parts = u.display_name.trim().split(/\s+/)
          fName = parts[0] || ''
          lName = parts.slice(1).join(' ') || ''
        }
        await client.query(
          `INSERT INTO manuscript_authors
             (manuscript_id, user_id, author_order, first_name, last_name, email, institution, department, country, orcid_id, is_corresponding)
           VALUES ($1, $2, 1, $3, $4, $5, $6, $7, $8, $9, true)`,
          [manuscriptId, userId, fName, lName, u.email, u.institution, u.department, u.country, u.orcid_id]
        )
      }
      authorsResult = await client.query(
        'SELECT id FROM manuscript_authors WHERE manuscript_id = $1',
        [manuscriptId]
      )
    }

    if (authorsResult.rows.length === 0) {
      throw new AppError('Manuscript must have at least one author', 400)
    }

    // Sync any authors on this manuscript with users table
    await client.query(`
      UPDATE manuscript_authors ma
      SET user_id = COALESCE(ma.user_id, u.id),
          first_name = COALESCE(NULLIF(TRIM(ma.first_name), ''), NULLIF(TRIM(ma.first_name), 'Author'), u.first_name),
          last_name = COALESCE(NULLIF(TRIM(ma.last_name), ''), u.last_name),
          institution = COALESCE(NULLIF(TRIM(ma.institution), ''), u.institution),
          department = COALESCE(NULLIF(TRIM(ma.department), ''), u.department),
          country = COALESCE(NULLIF(TRIM(ma.country), ''), u.country),
          orcid_id = COALESCE(ma.orcid_id, u.orcid_id)
      FROM users u
      WHERE ma.manuscript_id = $1
        AND (ma.user_id = u.id OR (ma.user_id IS NULL AND LOWER(TRIM(ma.email)) = LOWER(TRIM(u.email))))
    `, [manuscriptId])

    const versionResult = await client.query(
      `INSERT INTO manuscript_versions (manuscript_id, version_number, version_type, title, abstract, submitted_by, submitted_at, is_current)
       VALUES ($1, 1, 'initial', $2, $3, $4, now(), true)
       RETURNING id`,
      [manuscriptId, manuscript.title, manuscript.abstract, userId]
    )

    const versionId = versionResult.rows[0].id

    await client.query(
      'UPDATE manuscripts SET current_version_id = $1 WHERE id = $2',
      [versionId, manuscriptId]
    )

    await client.query(
      'UPDATE manuscript_files SET version_id = $1 WHERE manuscript_id = $2 AND version_id IS NULL',
      [versionId, manuscriptId]
    )

    const submissionNumber = await generateSubmissionNumber(client)

    await client.query(
      `UPDATE manuscripts SET
         submission_number = $1,
         current_status = 'submitted',
         submitted_at = now(),
         updated_at = now()
       WHERE id = $2`,
      [submissionNumber, manuscriptId]
    )

    await client.query(
      `INSERT INTO manuscript_status_history (manuscript_id, from_status, to_status, changed_by)
       VALUES ($1, 'draft', 'submitted', $2)`,
      [manuscriptId, userId]
    )

    await client.query(
      `INSERT INTO user_activity (user_id, activity_type, entity_type, entity_id, ip_address)
       VALUES ($1, 'manuscript_submitted', 'manuscripts', $2, $3)`,
      [userId, manuscriptId, null]
    )

    await client.query('COMMIT')

    const updatedResult = await pool.query(
      'SELECT * FROM manuscripts WHERE id = $1',
      [manuscriptId]
    )

    sendSubmissionReceived(manuscriptId).catch((err) => {
      console.error('Post-commit submission email failed:', err.message)
    })

    return updatedResult.rows[0]
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}

export async function getStatusHistory(manuscriptId, userId) {
  const hasAccess = await checkAccess(manuscriptId, userId)
  if (!hasAccess) {
    throw new AppError('Manuscript not found', 404)
  }

  const result = await pool.query(
    `SELECT msh.*, u.display_name as changed_by_name
     FROM manuscript_status_history msh
     LEFT JOIN users u ON u.id = msh.changed_by
     WHERE msh.manuscript_id = $1
     ORDER BY msh.created_at ASC`,
    [manuscriptId]
  )

  return result.rows
}

export async function getManuscriptForRole(manuscriptId, userId, role) {
  const manuscriptResult = await pool.query(
    `SELECT m.*, j.name as journal_name, c.name as category_name
     FROM manuscripts m
     LEFT JOIN journals j ON j.id = m.journal_id
     LEFT JOIN categories c ON c.id = m.category_id
     WHERE m.id = $1`,
    [manuscriptId]
  )

  if (manuscriptResult.rows.length === 0) {
    throw new AppError('Manuscript not found', 404)
  }

  const manuscript = manuscriptResult.rows[0]

  const filesResult = await pool.query(
    `SELECT id, file_type, original_filename, format, mime_type, file_size_bytes, uploaded_at
     FROM manuscript_files
     WHERE manuscript_id = $1
     ORDER BY uploaded_at`,
    [manuscriptId]
  )

  const baseData = {
    ...manuscript,
    files: filesResult.rows,
  }

  if (role === 'reviewer') {
    delete baseData.corresponding_author_id
    delete baseData.submitted_by
    delete baseData.authors

    baseData.files = baseData.files.map((f) => ({
      id: f.id,
      file_type: f.file_type,
      original_filename: f.original_filename,
      format: f.format,
      mime_type: f.mime_type,
      file_size_bytes: f.file_size_bytes,
      uploaded_at: f.uploaded_at,
    }))

    return baseData
  }

  const authorsResult = await pool.query(
    `SELECT * FROM manuscript_authors WHERE manuscript_id = $1 ORDER BY author_order`,
    [manuscriptId]
  )

  baseData.authors = authorsResult.rows

  return baseData
}
