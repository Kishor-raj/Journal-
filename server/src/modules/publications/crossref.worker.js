import pool from '../../config/db.js'
import { env } from '../../config/env.js'
import { AppError } from '../../shared/errors/AppError.js'
import {
  generateCrossrefDepositXml,
  submitCrossrefDeposit,
  fetchCrossrefSubmissionLog,
  parseCrossrefSubmissionLog,
} from './crossref.service.js'
import { buildArticleLandingUrl } from './doi.service.js'
import { generatePublishedManuscriptPdf } from './published-manuscript.service.js'

const BACKOFF_INTERVALS_MS = [60_000, 120_000, 300_000, 600_000, 1_800_000]

async function writeWorkflowLog(clientOrPool, { manuscriptId, eventName, status, payload, errorMessage }) {
  await clientOrPool.query(
    `INSERT INTO workflow_logs (workflow_name, manuscript_id, event_name, source, status, payload, error_message)
     VALUES ('crossref_doi', $1, $2, 'crossref_worker', $3, $4, $5)`,
    [manuscriptId, eventName, status, JSON.stringify(payload || {}), errorMessage || null]
  )
}

/**
 * Loads manuscript context required to construct Crossref deposit XML.
 */
async function loadDepositContext(clientOrPool, manuscriptId) {
  const manuscriptRes = await clientOrPool.query(
    `SELECT m.id, m.title, m.abstract, m.submission_number, m.journal_id,
            j.name AS journal_name, j.short_name AS journal_short_name,
            j.publisher_name, j.issn_print, j.issn_online
     FROM manuscripts m
     LEFT JOIN journals j ON j.id = m.journal_id
     WHERE m.id = $1`,
    [manuscriptId]
  )

  if (manuscriptRes.rows.length === 0) {
    throw new AppError('Manuscript not found for Crossref deposit', 404)
  }

  const pubRes = await clientOrPool.query(
    `SELECT * FROM publications WHERE manuscript_id = $1`,
    [manuscriptId]
  )

  const authorsRes = await clientOrPool.query(
    `SELECT ma.id, ma.first_name, ma.last_name, ma.email, ma.institution, ma.department, ma.country, ma.orcid_id,
            COALESCE(u.first_name, ma.first_name) AS resolved_first_name,
            COALESCE(u.last_name, ma.last_name) AS resolved_last_name,
            COALESCE(u.orcid_id, ma.orcid_id) AS resolved_orcid
     FROM manuscript_authors ma
     LEFT JOIN users u ON u.id = ma.user_id
     WHERE ma.manuscript_id = $1
     ORDER BY ma.author_order ASC`,
    [manuscriptId]
  )

  const m = manuscriptRes.rows[0]
  const p = pubRes.rows[0] || {}

  const journal = {
    name: m.journal_name,
    short_name: m.journal_short_name,
    publisher_name: m.publisher_name,
    issn_print: m.issn_print,
    issn_online: m.issn_online,
  }

  const authors = authorsRes.rows.map(a => ({
    first_name: a.resolved_first_name || a.first_name,
    last_name: a.resolved_last_name || a.last_name,
    orcid_id: a.resolved_orcid || a.orcid_id,
    institution: a.institution || a.department,
  }))

  return { manuscript: m, publication: p, journal, authors }
}

/**
 * Processes queued Crossref deposit jobs using safe row locking (SKIP LOCKED).
 */
export async function processQueuedCrossrefJobs(limit = 5) {
  const client = await pool.connect()
  const results = []

  try {
    await client.query('BEGIN')

    const jobsRes = await client.query(
      `SELECT *
       FROM crossref_deposit_jobs
       WHERE status = 'queued'
         AND next_attempt_at <= now()
       ORDER BY created_at ASC
       LIMIT $1
       FOR UPDATE SKIP LOCKED`,
      [limit]
    )

    await client.query('COMMIT')

    for (const job of jobsRes.rows) {
      try {
        const { manuscript, publication, journal, authors } = await loadDepositContext(pool, job.manuscript_id)
        const articleLandingUrl = publication.article_url || buildArticleLandingUrl(job.manuscript_id)

        const xmlContent = generateCrossrefDepositXml({
          batchId: job.batch_id,
          timestamp: Date.now(),
          journal,
          manuscript,
          publication,
          authors,
          doi: job.doi,
          articleLandingUrl,
        })

        const submitRes = await submitCrossrefDeposit({
          xmlContent,
          depositFilename: job.deposit_filename,
          batchId: job.batch_id,
          environment: job.environment,
        })

        // On successful HTTP queuing at Crossref:
        await pool.query(
          `UPDATE crossref_deposit_jobs
           SET status = 'submitted',
               submitted_at = now(),
               last_attempt_at = now(),
               attempt_count = attempt_count + 1,
               next_attempt_at = now() + INTERVAL '1 minute',
               response_summary = $1,
               xml_content = $2,
               updated_at = now()
           WHERE id = $3`,
          [submitRes.responseBody, xmlContent, job.id]
        )

        await pool.query(
          `UPDATE publications
           SET doi_status = 'submitted',
               doi_batch_id = $1,
               doi_submission_id = COALESCE($2, doi_submission_id),
               doi_deposit_filename = $3,
               doi_submitted_at = now(),
               doi_last_attempt_at = now(),
               doi_attempt_count = doi_attempt_count + 1,
               doi_error = NULL,
               updated_at = now()
           WHERE id = $4`,
          [job.batch_id, submitRes.submissionId || null, job.deposit_filename, job.publication_id]
        )

        await writeWorkflowLog(pool, {
          manuscriptId: job.manuscript_id,
          eventName: 'doi_deposit_submitted',
          status: 'success',
          payload: {
            job_id: job.id,
            doi: job.doi,
            batch_id: job.batch_id,
            filename: job.deposit_filename,
            environment: job.environment,
          },
        })

        results.push({ job_id: job.id, status: 'submitted' })
      } catch (err) {
        const nextAttempt = job.attempt_count + 1
        const isExhausted = nextAttempt >= job.max_attempts
        const backoffMs = BACKOFF_INTERVALS_MS[job.attempt_count] || 1_800_000
        const safeError = err.message || 'Deposit submission error'

        await pool.query(
          `UPDATE crossref_deposit_jobs
           SET status = $1,
               attempt_count = $2,
               last_attempt_at = now(),
               next_attempt_at = now() + ($3 * INTERVAL '1 millisecond'),
               error_message = $4,
               updated_at = now()
           WHERE id = $5`,
          [isExhausted ? 'failed' : 'queued', nextAttempt, backoffMs, safeError, job.id]
        )

        if (isExhausted) {
          await pool.query(
            `UPDATE publications
             SET doi_status = 'failed',
                 doi_last_attempt_at = now(),
                 doi_attempt_count = doi_attempt_count + 1,
                 doi_error = $1,
                 updated_at = now()
             WHERE id = $2`,
            [safeError, job.publication_id]
          )
        }

        await writeWorkflowLog(pool, {
          manuscriptId: job.manuscript_id,
          eventName: 'doi_deposit_submission_failed',
          status: 'failed',
          payload: { job_id: job.id, attempt: nextAttempt, exhausted: isExhausted },
          errorMessage: safeError,
        })

        results.push({ job_id: job.id, status: isExhausted ? 'failed' : 'retry_scheduled', error: safeError })
      }
    }
  } finally {
    client.release()
  }

  return { total: results.length, results }
}

/**
 * Checks final Crossref submission logs for pending deposits.
 */
export async function processPendingCrossrefVerifications(limit = 5) {
  const client = await pool.connect()
  const results = []

  try {
    await client.query('BEGIN')

    const jobsRes = await client.query(
      `SELECT *
       FROM crossref_deposit_jobs
       WHERE status IN ('submitted', 'verifying')
         AND next_attempt_at <= now()
       ORDER BY created_at ASC
       LIMIT $1
       FOR UPDATE SKIP LOCKED`,
      [limit]
    )

    await client.query('COMMIT')

    for (const job of jobsRes.rows) {
      try {
        const logFetch = await fetchCrossrefSubmissionLog({
          depositFilename: job.deposit_filename,
          environment: job.environment,
        })

        if (logFetch.status === 'pending' || !logFetch.logXml) {
          // Log not ready yet; defer next check with backoff
          const backoffMs = BACKOFF_INTERVALS_MS[job.attempt_count] || 300_000
          await pool.query(
            `UPDATE crossref_deposit_jobs
             SET status = 'verifying',
                 last_attempt_at = now(),
                 next_attempt_at = now() + ($1 * INTERVAL '1 millisecond'),
                 updated_at = now()
             WHERE id = $2`,
            [backoffMs, job.id]
          )
          results.push({ job_id: job.id, status: 'pending' })
          continue
        }

        const parsed = parseCrossrefSubmissionLog(logFetch.logXml, job.doi)

        if (parsed.isPending) {
          const backoffMs = BACKOFF_INTERVALS_MS[job.attempt_count] || 300_000
          await pool.query(
            `UPDATE crossref_deposit_jobs
             SET status = 'verifying',
                 last_attempt_at = now(),
                 next_attempt_at = now() + ($1 * INTERVAL '1 millisecond'),
                 response_summary = $2,
                 updated_at = now()
             WHERE id = $3`,
            [backoffMs, parsed.summary, job.id]
          )
          results.push({ job_id: job.id, status: 'pending' })
        } else if (parsed.isSuccess) {
          const finalStatus = job.environment === 'production' ? 'registered' : 'test_success'

          await pool.query(
            `UPDATE crossref_deposit_jobs
             SET status = 'completed',
                 completed_at = now(),
                 last_attempt_at = now(),
                 response_summary = $1,
                 error_message = NULL,
                 updated_at = now()
             WHERE id = $2`,
            [parsed.summary, job.id]
          )

          await pool.query(
            `UPDATE publications
             SET doi_status = $1,
                 doi_registered_at = now(),
                 doi_last_attempt_at = now(),
                 doi_error = NULL,
                 updated_at = now()
             WHERE id = $2`,
            [finalStatus, job.publication_id]
          )

          // Regenerate publication PDF so official branded PDF reflects registered DOI
          try {
            await generatePublishedManuscriptPdf(job.manuscript_id)
          } catch (pdfErr) {
            console.warn(`[CROSSREF_WORKER] Post-registration PDF update warning for ${job.manuscript_id}:`, pdfErr.message)
          }

          await writeWorkflowLog(pool, {
            manuscriptId: job.manuscript_id,
            eventName: 'doi_registration_completed',
            status: 'success',
            payload: {
              job_id: job.id,
              doi: job.doi,
              doi_status: finalStatus,
              environment: job.environment,
              summary: parsed.summary,
            },
          })

          results.push({ job_id: job.id, status: 'completed', doi_status: finalStatus })
        } else {
          // Failure diagnostic reported in submission log
          const errorMsg = parsed.error || parsed.summary || 'Crossref deposit rejected'

          await pool.query(
            `UPDATE crossref_deposit_jobs
             SET status = 'failed',
                 last_attempt_at = now(),
                 response_summary = $1,
                 error_message = $2,
                 updated_at = now()
             WHERE id = $3`,
            [parsed.summary, errorMsg, job.id]
          )

          await pool.query(
            `UPDATE publications
             SET doi_status = 'failed',
                 doi_last_attempt_at = now(),
                 doi_error = $1,
                 updated_at = now()
             WHERE id = $2`,
            [errorMsg, job.publication_id]
          )

          await writeWorkflowLog(pool, {
            manuscriptId: job.manuscript_id,
            eventName: 'doi_registration_failed',
            status: 'failed',
            payload: { job_id: job.id, doi: job.doi },
            errorMessage: errorMsg,
          })

          results.push({ job_id: job.id, status: 'failed', error: errorMsg })
        }
      } catch (err) {
        console.error(`[CROSSREF_WORKER] Verification failed for job ${job.id}:`, err.message)
        results.push({ job_id: job.id, status: 'error', error: err.message })
      }
    }
  } finally {
    client.release()
  }

  return { total: results.length, results }
}

/**
 * Runs one worker tick (queues & verifications).
 */
export async function runCrossrefWorkerOnce() {
  const queued = await processQueuedCrossrefJobs(5)
  const verifications = await processPendingCrossrefVerifications(5)
  return { queued, verifications }
}

/**
 * Re-enqueues a Crossref deposit job for an existing DOI.
 * Never creates a new DOI; reuses the existing suffix and publication row.
 */
export async function retryCrossrefDeposit(manuscriptId, editorId) {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    const pubRes = await client.query(
      `SELECT * FROM publications WHERE manuscript_id = $1 FOR UPDATE`,
      [manuscriptId]
    )

    if (pubRes.rows.length === 0) {
      throw new AppError('No publication record found for this manuscript', 404)
    }

    const pub = pubRes.rows[0]
    if (!pub.doi || !pub.doi_suffix) {
      throw new AppError('Cannot retry: manuscript has no allocated DOI', 400)
    }

    // Check if an existing job is currently pending
    const activeJobRes = await client.query(
      `SELECT id, status FROM crossref_deposit_jobs
       WHERE manuscript_id = $1
         AND status IN ('queued', 'submitting', 'submitted', 'verifying')
       LIMIT 1`,
      [manuscriptId]
    )

    if (activeJobRes.rows.length > 0) {
      throw new AppError(
        `A DOI registration is already in progress (status: ${activeJobRes.rows[0].status})`,
        409
      )
    }

    const timestamp = Date.now()
    const cleanStem = pub.doi_suffix.replace(/[^a-zA-Z0-9_]/g, '')
    const batchId = `retry_${cleanStem}_${timestamp}`
    const depositFilename = `${batchId}.xml`

    const jobRes = await client.query(
      `INSERT INTO crossref_deposit_jobs
         (manuscript_id, publication_id, doi, doi_suffix, environment, batch_id, deposit_filename, status, next_attempt_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'queued', now())
       RETURNING *`,
      [
        manuscriptId,
        pub.id,
        pub.doi,
        pub.doi_suffix,
        pub.doi_environment || env.CROSSREF_ENV,
        batchId,
        depositFilename,
      ]
    )

    await client.query(
      `UPDATE publications
       SET doi_status = 'reserved',
           doi_error = NULL,
           doi_batch_id = $1,
           doi_deposit_filename = $2,
           updated_at = now()
       WHERE id = $3`,
      [batchId, depositFilename, pub.id]
    )

    await client.query(
      `INSERT INTO audit_logs (actor_user_id, action, entity_type, entity_id, new_values)
       VALUES ($1, 'doi_deposit_retried', 'manuscripts', $2, $3)`,
      [
        editorId,
        manuscriptId,
        JSON.stringify({
          doi: pub.doi,
          doi_suffix: pub.doi_suffix,
          job_id: jobRes.rows[0].id,
          batch_id: batchId,
        }),
      ]
    )

    await writeWorkflowLog(client, {
      manuscriptId,
      eventName: 'doi_deposit_retried',
      status: 'queued',
      payload: {
        editor_id: editorId,
        doi: pub.doi,
        job_id: jobRes.rows[0].id,
        batch_id: batchId,
      },
    })

    await client.query('COMMIT')
    return {
      success: true,
      manuscript_id: manuscriptId,
      doi: pub.doi,
      doi_suffix: pub.doi_suffix,
      doi_status: 'reserved',
      job_id: jobRes.rows[0].id,
    }
  } catch (err) {
    await client.query('ROLLBACK')
    throw err
  } finally {
    client.release()
  }
}

/**
 * Starts the polling worker for Crossref deposits.
 */
export function startCrossrefWorker({ pollIntervalMs = env.CROSSREF_WORKER_INTERVAL_MS || 60_000, enabled = true } = {}) {
  if (!enabled) {
    console.log('[CROSSREF_WORKER] Disabled')
    return null
  }

  let running = false
  let stopFlag = false
  let timer = null

  const tick = async () => {
    if (running || stopFlag) return
    running = true
    try {
      await runCrossrefWorkerOnce()
    } catch (err) {
      console.error('[CROSSREF_WORKER] Tick error:', err.message)
    } finally {
      running = false
    }
  }

  timer = setInterval(tick, pollIntervalMs)
  // Initial immediate tick after 5s startup delay
  setTimeout(tick, 5000)

  return {
    stop() {
      stopFlag = true
      if (timer) clearInterval(timer)
      console.log('[CROSSREF_WORKER] Stopped')
    },
  }
}
