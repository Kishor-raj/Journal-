import pool from '../../config/db.js'
import { env } from '../../config/env.js'

const DEFAULT_CONFIG = {
  ai_email_enabled: true,
  ai_auto_reply_enabled: false,
  ai_auto_reply_confidence_threshold: 0.90,
  ai_auto_reply_categories: ['SUBMISSION_GUIDELINES', 'JOURNAL_INFORMATION', 'GENERAL_QUESTION', 'MANUSCRIPT_STATUS'],
  ai_human_approval_categories: ['WITHDRAWAL_REQUEST', 'EDITORIAL_DECISION_QUERY', 'COMPLAINT', 'REVIEWER_INVITATION', 'REVIEWER_EXTENSION', 'PAYMENT', 'ETHICS_OR_PLAGIARISM', 'SECURITY'],
  ai_never_auto_reply_categories: ['ETHICS_OR_PLAGIARISM', 'SECURITY', 'SPAM', 'OTHER'],
  ai_gemini_model: 'gemini-3.6-flash',
  ai_max_email_context_length: 5000,
  ai_max_reply_length: 2000,
  ai_webhook_rate_limit: 30,
  ai_max_retry_attempts: 3,
  ai_worker_poll_interval_ms: 20000,
  ai_data_retention_days: 90,
  ai_rollout_stage: 'development',
}

let cachedConfig = null

export async function getAiEmailConfig() {
  if (cachedConfig) return cachedConfig

  try {
    const result = await pool.query(
      `SELECT config_key, config_value FROM ai_email_config WHERE is_active = true`
    )
    const dbConfig = {}
    for (const row of result.rows) {
      try {
        dbConfig[row.config_key] = JSON.parse(row.config_value)
      } catch {
        dbConfig[row.config_key] = row.config_value
      }
    }
    cachedConfig = { ...DEFAULT_CONFIG, ...dbConfig }
    return cachedConfig
  } catch {
    cachedConfig = { ...DEFAULT_CONFIG }
    return cachedConfig
  }
}

export function getAiEmailConfigPublic() {
  return {
    ai_email_enabled: cachedConfig?.ai_email_enabled ?? DEFAULT_CONFIG.ai_email_enabled,
    ai_auto_reply_enabled: cachedConfig?.ai_auto_reply_enabled ?? DEFAULT_CONFIG.ai_auto_reply_enabled,
    ai_rollout_stage: cachedConfig?.ai_rollout_stage ?? DEFAULT_CONFIG.ai_rollout_stage,
  }
}

export async function updateAiEmailConfig(updates, userId) {
  const allowedKeys = Object.keys(DEFAULT_CONFIG)
  const validUpdates = {}

  for (const [key, value] of Object.entries(updates)) {
    if (allowedKeys.includes(key)) {
      validUpdates[key] = value
    }
  }

  if (Object.keys(validUpdates).length === 0) {
    return { success: false, error: 'No valid config keys provided' }
  }

  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    for (const [key, value] of Object.entries(validUpdates)) {
      await client.query(
        `INSERT INTO ai_email_config (config_key, config_value, updated_by)
         VALUES ($1, $2, $3)
         ON CONFLICT (config_key) DO UPDATE
           SET config_value = $2, updated_by = $3, updated_at = now()`,
        [key, JSON.stringify(value), userId]
      )
    }

    await client.query(
      `INSERT INTO workflow_logs (workflow_name, event_name, source, status, payload)
       VALUES ('ai_email', 'config_updated', 'admin', 'success', $1)`,
      [JSON.stringify({ updated_keys: Object.keys(validUpdates), user_id: userId })]
    )

    await client.query('COMMIT')

    cachedConfig = null
    const config = await getAiEmailConfig()

    return { success: true, config }
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}

export async function isAiEmailEnabled() {
  const config = await getAiEmailConfig()
  return config.ai_email_enabled === true
}

export async function isAutoReplyEnabled() {
  const config = await getAiEmailConfig()
  return config.ai_auto_reply_enabled === true
}

export function clearConfigCache() {
  cachedConfig = null
}
