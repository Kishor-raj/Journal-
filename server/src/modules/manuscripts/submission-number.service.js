const JOURNAL_PREFIX = 'IJIDCR'

/**
 * Format a submission number in the IJIDCR-YY-NNNN pattern.
 * @param {number} year e.g. 2026
 * @param {number} seq  e.g. 1
 * @returns {string} e.g. "IJIDCR-26-0001"
 */
export function formatSubmissionNumber(year, seq) {
  const yy = String(year).slice(-2).padStart(2, '0')
  const nnnn = String(seq).padStart(4, '0')
  return `${JOURNAL_PREFIX}-${yy}-${nnnn}`
}

/**
 * Generate the next sequential submission number in format IJIDCR-YY-NNNN.
 * Must be called within a transaction (passes the pg Client).
 *
 * Uses the submission_counters table for concurrency-safe, year-scoped sequencing.
 */
export async function generateSubmissionNumber(client) {
  const year = new Date().getFullYear()

  // Ensure a counter row exists for this year (idempotent)
  await client.query(
    `INSERT INTO submission_counters (year, last_number)
     VALUES ($1, 0)
     ON CONFLICT (year) DO NOTHING`,
    [year]
  )

  // Lock the row and increment atomically
  const result = await client.query(
    `UPDATE submission_counters
     SET last_number = last_number + 1, updated_at = now()
     WHERE year = $1
     RETURNING last_number`,
    [year]
  )

  const seq = result.rows[0].last_number

  return formatSubmissionNumber(year, seq)
}
