import crypto from 'crypto'
import pool from '../../config/db.js'

const SITE_STATS_ID = 1

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

const KNOWN_BOT_PATTERN = /(bot|crawl|spider|slurp|monitor|uptimerobot|pingdom|headless|curl|wget|python-requests|postman|googlebot|bingbot|yandex|baiduspider|duckduckgo|applebot|facebookexternalhit|twitterbot|x-?post|telegrambot|discordbot|slack|linkedinbot|whatsapp|semrush|ahrefs|mj12bot|dotbot|petalbot)/i

export function isValidVisitorId(value) {
  return typeof value === 'string' && UUID_PATTERN.test(value)
}

export function generateVisitorId() {
  return crypto.randomUUID()
}

export function isLikelyBot(userAgent) {
  if (!userAgent || typeof userAgent !== 'string') return true
  return KNOWN_BOT_PATTERN.test(userAgent)
}

async function ensureStatsRow(client) {
  await client.query(
    `INSERT INTO site_stats (id, total_visitors)
     VALUES ($1, 0)
     ON CONFLICT (id) DO NOTHING`,
    [SITE_STATS_ID]
  )
}

export async function getTotalVisitors() {
  const result = await pool.query(
    'SELECT COALESCE(total_visitors, 0) AS total FROM site_stats WHERE id = $1',
    [SITE_STATS_ID]
  )
  return Number(result.rows[0]?.total ?? 0)
}

export async function registerVisit(visitorId) {
  const resolvedId = isValidVisitorId(visitorId) ? visitorId : generateVisitorId()
  const client = await pool.connect()

  try {
    await client.query('BEGIN')

    const inserted = await client.query(
      `INSERT INTO site_visitors (visitor_id)
       VALUES ($1)
       ON CONFLICT (visitor_id) DO NOTHING
       RETURNING id`,
      [resolvedId]
    )

    await ensureStatsRow(client)

    let totalVisitors
    if (inserted.rowCount === 1) {
      const incremented = await client.query(
        `UPDATE site_stats
         SET total_visitors = total_visitors + 1
         WHERE id = $1
         RETURNING total_visitors`,
        [SITE_STATS_ID]
      )
      totalVisitors = Number(incremented.rows[0].total_visitors)
    } else {
      await client.query(
        'UPDATE site_visitors SET last_seen = NOW() WHERE visitor_id = $1',
        [resolvedId]
      )
      const current = await client.query(
        'SELECT total_visitors FROM site_stats WHERE id = $1',
        [SITE_STATS_ID]
      )
      totalVisitors = Number(current.rows[0]?.total_visitors ?? 0)
    }

    await client.query('COMMIT')
    return {
      visitorId: resolvedId,
      isNewVisitor: inserted.rowCount === 1,
      totalVisitors,
    }
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}