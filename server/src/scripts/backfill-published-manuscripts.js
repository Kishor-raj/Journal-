import path from 'path'
import dotenv from 'dotenv'
import pool from '../config/db.js'
import { generatePublishedManuscriptPdf, resolveManuscriptSourceFile } from '../modules/publications/published-manuscript.service.js'
import { createPublicationRow } from '../modules/publications/publication.service.js'

dotenv.config({ path: path.resolve(import.meta.dirname, '../../.env') })

/**
 * Backfill published manuscripts that do not yet have a branded PDF generated.
 * Idempotent, safe, and resumable.
 */
export async function backfillPublishedManuscripts(options = {}) {
  const force = Boolean(options.force)

  console.log('--- Starting Published Manuscript Branded PDF Backfill ---')
  console.log(`Mode: ${force ? 'Force all published manuscripts' : 'Missing/Pending/Failed only'}`)

  const query = `
    SELECT m.id, m.submission_number, m.title, m.current_version_id,
           p.id AS publication_id, p.document_status, p.document_file_id
    FROM manuscripts m
    LEFT JOIN publications p ON p.manuscript_id = m.id
    WHERE m.current_status = 'published'
    ORDER BY m.updated_at ASC
  `

  const { rows: manuscripts } = await pool.query(query)
  console.log(`Found ${manuscripts.length} published manuscript(s) in database.`)

  let processed = 0
  let skipped = 0
  let failed = 0

  for (const m of manuscripts) {
    const isAlreadyReady = m.document_status === 'ready' && m.document_file_id
    if (isAlreadyReady && !force) {
      console.log(`[SKIP] #${m.submission_number || m.id}: already has ready branded publication PDF.`)
      skipped++
      continue
    }

    // Check if eligible source file exists
    const sourceFile = await resolveManuscriptSourceFile(m.id, m.current_version_id)
    if (!sourceFile) {
      console.warn(`[SKIP] #${m.submission_number || m.id}: No eligible author DOCX or PDF source file found in storage.`)
      skipped++
      continue
    }

    // Ensure publication row exists
    if (!m.publication_id) {
      const client = await pool.connect()
      try {
        await createPublicationRow(client, {
          manuscriptId: m.id,
          editorId: null,
          volume: 1,
          issue: 1,
          publicationYear: new Date().getFullYear(),
          doi: null,
          articleUrl: null,
        })
      } finally {
        client.release()
      }
    }

    console.log(`[PROCESSING] #${m.submission_number || m.id} (${m.title?.slice(0, 40) || 'Untitled'})...`)

    try {
      const result = await generatePublishedManuscriptPdf(m.id)
      if (result.success) {
        console.log(`  ✓ Successfully generated branded PDF for #${m.submission_number}`)
        processed++
      } else {
        console.error(`  ✗ Generation failed for #${m.submission_number}: ${result.error}`)
        failed++
      }
    } catch (err) {
      console.error(`  ✗ Unexpected error for #${m.submission_number}: ${err.message}`)
      failed++
    }
  }

  console.log('\n--- Backfill Summary ---')
  console.log(`Total manuscripts found: ${manuscripts.length}`)
  console.log(`Successfully generated: ${processed}`)
  console.log(`Skipped: ${skipped}`)
  console.log(`Failed: ${failed}`)
  console.log('-------------------------\n')

  return { total: manuscripts.length, processed, skipped, failed }
}

// If run directly from CLI
if (process.argv[1] && process.argv[1].endsWith('backfill-published-manuscripts.js')) {
  const force = process.argv.includes('--force')
  backfillPublishedManuscripts({ force })
    .then(() => pool.end())
    .catch((err) => {
      console.error('Fatal backfill error:', err)
      pool.end()
      process.exit(1)
    })
}
