import pool from '../../config/db.js'

export async function getAuditLogs(filters = {}) {
  const { page = 1, limit = 50, actor_user_id, entity_type, action, start_date, end_date } = filters

  let query = `
    SELECT al.*, u.display_name as actor_name
    FROM audit_logs al
    LEFT JOIN users u ON u.id = al.actor_user_id
    WHERE 1=1
  `
  const params = []
  let paramIndex = 1

  if (actor_user_id) {
    query += ` AND al.actor_user_id = $${paramIndex++}`
    params.push(actor_user_id)
  }

  if (entity_type) {
    query += ` AND al.entity_type = $${paramIndex++}`
    params.push(entity_type)
  }

  if (action) {
    query += ` AND al.action = $${paramIndex++}`
    params.push(action)
  }

  if (start_date) {
    query += ` AND al.created_at >= $${paramIndex++}`
    params.push(start_date)
  }

  if (end_date) {
    query += ` AND al.created_at <= $${paramIndex++}`
    params.push(end_date)
  }

  query += ` ORDER BY al.created_at DESC`
  query += ` LIMIT $${paramIndex++} OFFSET $${paramIndex++}`
  params.push(limit, (page - 1) * limit)

  const result = await pool.query(query, params)

  let countQuery = `
    SELECT COUNT(*) as total
    FROM audit_logs al
    WHERE 1=1
  `
  let countParams = []
  let countParamIndex = 1

  if (actor_user_id) {
    countQuery += ` AND al.actor_user_id = $${countParamIndex++}`
    countParams.push(actor_user_id)
  }

  if (entity_type) {
    countQuery += ` AND al.entity_type = $${countParamIndex++}`
    countParams.push(entity_type)
  }

  if (action) {
    countQuery += ` AND al.action = $${countParamIndex++}`
    countParams.push(action)
  }

  if (start_date) {
    countQuery += ` AND al.created_at >= $${countParamIndex++}`
    countParams.push(start_date)
  }

  if (end_date) {
    countQuery += ` AND al.created_at <= $${countParamIndex++}`
    countParams.push(end_date)
  }

  const countResult = await pool.query(countQuery, countParams)

  return {
    logs: result.rows,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total: Number(countResult.rows[0].total),
      pages: Math.ceil(countResult.rows[0].total / limit),
    },
    total: Number(countResult.rows[0].total),
  }
}

export async function getSecurityLogs(filters = {}) {
  const { page = 1, limit = 50, severity, actor_user_id, start_date, end_date } = filters

  let query = `
    SELECT sl.*, u.display_name as actor_name
    FROM security_logs sl
    LEFT JOIN users u ON u.id = sl.actor_user_id
    WHERE 1=1
  `
  const params = []
  let paramIndex = 1

  if (severity) {
    query += ` AND sl.severity = $${paramIndex++}`
    params.push(severity)
  }

  if (actor_user_id) {
    query += ` AND sl.actor_user_id = $${paramIndex++}`
    params.push(actor_user_id)
  }

  if (start_date) {
    query += ` AND sl.created_at >= $${paramIndex++}`
    params.push(start_date)
  }

  if (end_date) {
    query += ` AND sl.created_at <= $${paramIndex++}`
    params.push(end_date)
  }

  query += ` ORDER BY sl.created_at DESC`
  query += ` LIMIT $${paramIndex++} OFFSET $${paramIndex++}`
  params.push(limit, (page - 1) * limit)

  const result = await pool.query(query, params)

  let countQuery = `SELECT COUNT(*) as total FROM security_logs sl WHERE 1=1`
  let countParams = []
  let countParamIndex = 1
  if (severity) {
    countQuery += ` AND sl.severity = $${countParamIndex++}`
    countParams.push(severity)
  }
  if (actor_user_id) {
    countQuery += ` AND sl.actor_user_id = $${countParamIndex++}`
    countParams.push(actor_user_id)
  }
  const countResult = await pool.query(countQuery, countParams)

  return {
    logs: result.rows,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total: Number(countResult.rows[0].total),
    },
    total: Number(countResult.rows[0].total),
  }
}

export async function getWorkflowLogs(filters = {}) {
  const { page = 1, limit = 50, manuscript_id, workflow_name, status, start_date, end_date } = filters

  let query = `
    SELECT wl.*
    FROM workflow_logs wl
    WHERE 1=1
  `
  const params = []
  let paramIndex = 1

  if (manuscript_id) {
    query += ` AND wl.manuscript_id = $${paramIndex++}`
    params.push(manuscript_id)
  }

  if (workflow_name) {
    query += ` AND wl.workflow_name = $${paramIndex++}`
    params.push(workflow_name)
  }

  if (status) {
    query += ` AND wl.status = $${paramIndex++}`
    params.push(status)
  }

  if (start_date) {
    query += ` AND wl.created_at >= $${paramIndex++}`
    params.push(start_date)
  }

  if (end_date) {
    query += ` AND wl.created_at <= $${paramIndex++}`
    params.push(end_date)
  }

  query += ` ORDER BY wl.created_at DESC`
  query += ` LIMIT $${paramIndex++} OFFSET $${paramIndex++}`
  params.push(limit, (page - 1) * limit)

  const result = await pool.query(query, params)

  let countQuery = `SELECT COUNT(*) as total FROM workflow_logs wl WHERE 1=1`
  let countParams = []
  let countParamIndex = 1
  if (manuscript_id) {
    countQuery += ` AND wl.manuscript_id = $${countParamIndex++}`
    countParams.push(manuscript_id)
  }
  if (status) {
    countQuery += ` AND wl.status = $${countParamIndex++}`
    countParams.push(status)
  }
  const countResult = await pool.query(countQuery, countParams)

  return {
    logs: result.rows,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total: Number(countResult.rows[0].total),
    },
    total: Number(countResult.rows[0].total),
  }
}
