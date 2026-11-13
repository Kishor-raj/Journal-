import pool from '../../config/db.js'
import { env } from '../../config/env.js'
import { AppError } from '../../shared/errors/AppError.js'

export const DEFAULT_DOI_PREFIX = '10.68968'
export const DEFAULT_DOI_STEM = 'IJIDCR'

/**
 * Pads a numeric sequence to at least 5 digits without truncating larger numbers.
 * E.g., 1 -> 'IJIDCR_00001', 99999 -> 'IJIDCR_99999', 100000 -> 'IJIDCR_100000'
 */
export function formatDoiSuffix(seqNumber, stem = env.CROSSREF_DOI_SUFFIX_STEM || DEFAULT_DOI_STEM) {
  const num = Number(seqNumber)
  if (!Number.isInteger(num) || num <= 0) {
    throw new AppError('Invalid sequence number for DOI suffix generation', 400)
  }
  const cleanStem = String(stem || DEFAULT_DOI_STEM).trim().toUpperCase()
  const padded = String(num).padStart(5, '0')
  return `${cleanStem}_${padded}`
}

/**
 * Combines prefix and suffix into a canonical DOI string.
 * E.g. '10.68968/IJIDCR_00001'
 */
export function formatFullDoi(suffix, prefix = env.CROSSREF_DOI_PREFIX || DEFAULT_DOI_PREFIX) {
  const cleanPrefix = String(prefix || DEFAULT_DOI_PREFIX).trim().replace(/\/+$/, '')
  const cleanSuffix = String(suffix || '').trim().replace(/^\/+/, '')
  if (!cleanSuffix) {
    throw new AppError('DOI suffix is required', 400)
  }
  return `${cleanPrefix}/${cleanSuffix}`
}

/**
 * Formats full canonical resolving DOI URL.
 * E.g. 'https://doi.org/10.68968/IJIDCR_00001'
 */
export function buildCanonicalDoiUrl(doi) {
  if (!doi || typeof doi !== 'string') return null
  const clean = doi.trim()
  if (!clean) return null
  if (/^https?:\/\/doi\.org\//i.test(clean)) {
    return clean.replace(/^http:/, 'https:')
  }
  return `https://doi.org/${clean}`
}

/**
 * Builds the canonical public article landing page URL.
 * Never points directly to the PDF file.
 */
export function buildArticleLandingUrl(manuscriptId, baseOrigin = env.PUBLIC_APP_ORIGIN) {
  if (!manuscriptId) {
    throw new AppError('Manuscript ID is required to build article landing URL', 400)
  }
  const origin = String(baseOrigin || 'http://localhost:5173').trim().replace(/\/+$/, '')
  return `${origin}/articles/${manuscriptId}`
}

/**
 * Atomically obtains the next suffix from the PostgreSQL sequence.
 */
export async function allocateNextDoiSuffix(clientOrPool = pool) {
  const res = await clientOrPool.query("SELECT nextval('doi_suffix_seq') AS seq")
  const seqNumber = parseInt(res.rows[0].seq, 10)
  return formatDoiSuffix(seqNumber)
}

/**
 * Allocates or resolves a DOI for a publication record within a database client transaction.
 * Idempotent: if publication already has a DOI, reuses and returns it without allocating a new one.
 *
 * @param {import('pg').PoolClient} client - Transaction client
 * @param {string} manuscriptId - Target manuscript UUID
 * @param {Object} [options]
 * @param {string} [options.prefix]
 * @param {string} [options.environment]
 * @returns {Promise<{ doi: string, doiSuffix: string, articleUrl: string, doiStatus: string, doiEnvironment: string, isNew: boolean }>}
 */
export async function allocateDoiForPublication(
  client,
  manuscriptId,
  {
    prefix = env.CROSSREF_DOI_PREFIX || DEFAULT_DOI_PREFIX,
    environment = env.CROSSREF_ENV || 'test',
  } = {}
) {
  if (!client || typeof client.query !== 'function') {
    throw new AppError('A valid database client transaction is required for DOI allocation', 500)
  }

  // 1. Check existing publication row for this manuscript
  const existingRes = await client.query(
    `SELECT id, doi, doi_suffix, doi_status, doi_environment, article_url
     FROM publications
     WHERE manuscript_id = $1
     FOR UPDATE`,
    [manuscriptId]
  )

  const existing = existingRes.rows[0]

  // If a DOI is already assigned, reuse it permanently
  if (existing && existing.doi) {
    const canonicalArticleUrl = existing.article_url || buildArticleLandingUrl(manuscriptId)
    return {
      publicationId: existing.id,
      doi: existing.doi,
      doiSuffix: existing.doi_suffix || existing.doi.split('/').pop(),
      articleUrl: canonicalArticleUrl,
      doiStatus: existing.doi_status || 'reserved',
      doiEnvironment: existing.doi_environment || environment,
      isNew: false,
    }
  }

  // 2. Allocate next suffix atomically from sequence
  const suffix = await allocateNextDoiSuffix(client)
  const fullDoi = formatFullDoi(suffix, prefix)
  const articleUrl = buildArticleLandingUrl(manuscriptId)
  const doiStatus = 'reserved'

  return {
    publicationId: existing?.id || null,
    doi: fullDoi,
    doiSuffix: suffix,
    articleUrl,
    doiStatus,
    doiEnvironment: environment,
    isNew: true,
  }
}

/**
 * Returns full DOI registration details for a manuscript.
 */
export async function getDoiDetailsForManuscript(manuscriptId) {
  const result = await pool.query(
    `SELECT
       p.id AS publication_id,
       p.manuscript_id,
       p.doi,
       p.doi_suffix,
       p.doi_status,
       p.doi_environment,
       p.doi_batch_id,
       p.doi_submission_id,
       p.doi_deposit_filename,
       p.doi_submitted_at,
       p.doi_registered_at,
       p.doi_last_attempt_at,
       p.doi_attempt_count,
       p.doi_error,
       p.article_url,
       p.volume,
       p.issue,
       p.publication_year,
       p.published_at,
       m.submission_number,
       m.title AS manuscript_title
     FROM publications p
     JOIN manuscripts m ON m.id = p.manuscript_id
     WHERE p.manuscript_id = $1`,
    [manuscriptId]
  )

  if (result.rows.length === 0) {
    return null
  }

  const row = result.rows[0]
  return {
    ...row,
    doi_url: row.doi ? buildCanonicalDoiUrl(row.doi) : null,
  }
}
