import pool from '../../config/db.js'
import { AppError } from '../../shared/errors/AppError.js'

export async function getRevisionsByUser(userId, status = 'pending') {
  let query = `
    SELECT rr.*, m.title, m.submission_number, m.current_status,
            ed.decision, ed.comments_to_author AS decision_letter,
            EXISTS(
              SELECT 1 FROM revision_responses resp 
              WHERE resp.revision_request_id = rr.id AND resp.status = 'submitted'
            ) AS is_submitted,
            (
              SELECT resp.submitted_at FROM revision_responses resp
              WHERE resp.revision_request_id = rr.id AND resp.status = 'submitted'
              ORDER BY resp.submitted_at DESC LIMIT 1
            ) AS response_submitted_at
     FROM revision_requests rr
     JOIN manuscripts m ON m.id = rr.manuscript_id
     LEFT JOIN editorial_decisions ed ON ed.id = rr.editorial_decision_id
     WHERE (m.submitted_by = $1
        OR EXISTS (
          SELECT 1 FROM manuscript_authors ma
          WHERE ma.manuscript_id = m.id AND ma.user_id = $1
        ))
  `
  const params = [userId]

  if (status === 'pending') {
    query += `
      AND m.current_status = 'revision_requested'
      AND NOT EXISTS (
        SELECT 1 FROM revision_responses resp
        WHERE resp.revision_request_id = rr.id AND resp.status = 'submitted'
      )
    `
  } else if (status === 'completed') {
    query += `
      AND (
        EXISTS (
          SELECT 1 FROM revision_responses resp
          WHERE resp.revision_request_id = rr.id AND resp.status = 'submitted'
        )
        OR m.current_status != 'revision_requested'
      )
    `
  }

  query += ` ORDER BY rr.created_at DESC`

  const result = await pool.query(query, params)
  return result.rows
}

export async function getRevisionRequest(requestId, userId) {
  const result = await pool.query(
    `SELECT rr.*, m.title, m.submission_number, m.submitted_by,
            ed.decision, ed.comments_to_author AS decision_letter
     FROM revision_requests rr
     JOIN manuscripts m ON m.id = rr.manuscript_id
     LEFT JOIN editorial_decisions ed ON ed.id = rr.editorial_decision_id
     WHERE rr.id = $1`,
    [requestId]
  )

  if (result.rows.length === 0) {
    throw new AppError('Revision request not found', 404)
  }

  const request = result.rows[0]

  if (request.submitted_by !== userId) {
    const isAuthor = await pool.query(
      'SELECT 1 FROM manuscript_authors WHERE manuscript_id = $1 AND user_id = $2',
      [request.manuscript_id, userId]
    )
    if (isAuthor.rowCount === 0) {
      throw new AppError('Unauthorized', 403)
    }
  }

  const reviewsResult = await pool.query(
    `SELECT r.id, r.public_comments, r.recommendation, r.score,
            u.display_name as reviewer_name
     FROM reviews r
     LEFT JOIN users u ON u.id = r.reviewer_id
     WHERE r.manuscript_id = $1 AND r.round_number = $2
     ORDER BY r.submitted_at`,
    [request.manuscript_id, request.round_number]
  )

  const responsesResult = await pool.query(
    `SELECT * FROM revision_responses
     WHERE revision_request_id = $1
     ORDER BY submitted_at`,
    [requestId]
  )

  const filesResult = await pool.query(
    `SELECT * FROM manuscript_files WHERE manuscript_id = $1 ORDER BY uploaded_at ASC`,
    [request.manuscript_id]
  )

  return {
    ...request,
    reviews: reviewsResult.rows,
    responses: responsesResult.rows,
    files: filesResult.rows,
  }
}

export async function submitRevisionResponse(requestId, userId, responseData) {
  const { cover_letter, response_summary, reviewer_responses, version_data, file_ids } = responseData

  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    const requestResult = await client.query(
      `SELECT rr.*, m.id as manuscript_id, m.current_version_id, m.submitted_by
       FROM revision_requests rr
       JOIN manuscripts m ON m.id = rr.manuscript_id
       WHERE rr.id = $1 FOR UPDATE`,
      [requestId]
    )

    if (requestResult.rows.length === 0) {
      throw new AppError('Revision request not found', 404)
    }

    const request = requestResult.rows[0]

    if (request.submitted_by !== userId) {
      const isAuthor = await client.query(
        'SELECT 1 FROM manuscript_authors WHERE manuscript_id = $1 AND user_id = $2',
        [request.manuscript_id, userId]
      )
      if (isAuthor.rowCount === 0) {
        throw new AppError('Unauthorized', 403)
      }
    }

    const existingResponse = await client.query(
      `SELECT id FROM revision_responses
       WHERE revision_request_id = $1 AND status = 'submitted'`,
      [requestId]
    )

    if (existingResponse.rows.length > 0) {
      throw new AppError('Revision already submitted for this request', 400)
    }

    const previousVersion = await client.query(
      `SELECT version_number FROM manuscript_versions
       WHERE manuscript_id = $1 ORDER BY version_number DESC LIMIT 1`,
      [request.manuscript_id]
    )

    const newVersionNumber = previousVersion.rows.length > 0
      ? previousVersion.rows[0].version_number + 1
      : 1

    const title = version_data?.title || null
    const abstract = version_data?.abstract || null

    const versionResult = await client.query(
      `INSERT INTO manuscript_versions (manuscript_id, version_number, version_type, title, abstract, submitted_by, submitted_at, is_current)
       VALUES ($1, $2, 'revision', COALESCE($3, (SELECT title FROM manuscripts WHERE id = $1)), COALESCE($4, (SELECT abstract FROM manuscripts WHERE id = $1)), $5, now(), true)
       RETURNING id`,
      [request.manuscript_id, newVersionNumber, title, abstract, userId]
    )

    const newVersionId = versionResult.rows[0].id

    if (request.current_version_id) {
      await client.query(
        `UPDATE manuscript_versions SET is_current = false WHERE id = $1`,
        [request.current_version_id]
      )
    }

    await client.query(
      `UPDATE manuscripts SET current_version_id = $1 WHERE id = $2`,
      [newVersionId, request.manuscript_id]
    )

    if (file_ids && Array.isArray(file_ids) && file_ids.length > 0) {
      await client.query(
        `UPDATE manuscript_files SET version_id = $1, is_accessible = true WHERE id = ANY($2::uuid[]) AND manuscript_id = $3`,
        [newVersionId, file_ids, request.manuscript_id]
      )
    } else {
      await client.query(
        `UPDATE manuscript_files SET version_id = $1, is_accessible = true WHERE manuscript_id = $2 AND version_id IS NULL AND uploaded_at >= now() - interval '1 hour'`,
        [newVersionId, request.manuscript_id]
      )
    }

    const responseResult = await client.query(
      `INSERT INTO revision_responses (revision_request_id, manuscript_version_id, submitted_by, cover_letter, response_summary, submitted_at, status)
       VALUES ($1, $2, $3, $4, $5, now(), 'submitted')
       RETURNING id`,
      [requestId, newVersionId, userId, cover_letter || null, response_summary || null]
    )

    const revisionResponseId = responseResult.rows[0].id

    if (reviewer_responses && Array.isArray(reviewer_responses)) {
      for (const resp of reviewer_responses) {
        await client.query(
          `INSERT INTO reviewer_comment_responses (revision_response_id, review_id, comment_reference, author_response, change_reference)
           VALUES ($1, $2, $3, $4, $5)`,
          [revisionResponseId, resp.review_id, resp.comment_reference || null, resp.author_response, resp.change_reference || null]
        )
      }
    }

    await client.query(
      `UPDATE manuscripts SET current_status = 'resubmitted', updated_at = now() WHERE id = $1`,
      [request.manuscript_id]
    )

    await client.query(
      `INSERT INTO manuscript_status_history (manuscript_id, from_status, to_status, changed_by)
       VALUES ($1, 'revision_requested', 'resubmitted', $2)`,
      [request.manuscript_id, userId]
    )

    await client.query(
      `INSERT INTO user_activity (user_id, activity_type, entity_type, entity_id)
       VALUES ($1, 'revision_submitted', 'manuscripts', $2)`,
      [userId, request.manuscript_id]
    )

    await client.query('COMMIT')

    return { success: true, revision_response_id: revisionResponseId, new_version_id: newVersionId }
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}

export async function getRevisionsByManuscript(manuscriptId) {
  const result = await pool.query(
    `SELECT rr.*, ed.decision, ed.comments_to_author AS decision_letter,
            rr_inst.id AS response_id, rr_inst.cover_letter, rr_inst.response_summary,
            rr_inst.submitted_at AS response_submitted_at, rr_inst.status AS response_status,
            rr_inst.manuscript_version_id
     FROM revision_requests rr
     LEFT JOIN editorial_decisions ed ON ed.id = rr.editorial_decision_id
     LEFT JOIN revision_responses rr_inst ON rr_inst.revision_request_id = rr.id AND rr_inst.status = 'submitted'
     WHERE rr.manuscript_id = $1
     ORDER BY rr.round_number ASC`,
    [manuscriptId]
  )

  const commentResponsesResult = await pool.query(
    `SELECT rcr.*, rr_inst.revision_request_id
     FROM reviewer_comment_responses rcr
     JOIN revision_responses rr_inst ON rr_inst.id = rcr.revision_response_id
     JOIN revision_requests rr ON rr.id = rr_inst.revision_request_id
     WHERE rr.manuscript_id = $1`,
    [manuscriptId]
  )

  return result.rows.map(row => ({
    ...row,
    reviewer_responses: commentResponsesResult.rows.filter(cr => cr.revision_request_id === row.id)
  }))
}
