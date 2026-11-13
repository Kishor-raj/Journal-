import { env } from '../../config/env.js'
import { AppError } from '../../shared/errors/AppError.js'

export const CROSSREF_TEST_DEPOSIT_URL = 'https://test.crossref.org/servlet/deposit'
export const CROSSREF_PROD_DEPOSIT_URL = 'https://doi.crossref.org/servlet/deposit'
export const CROSSREF_TEST_DOWNLOAD_URL = 'https://test.crossref.org/servlet/submissionDownload'
export const CROSSREF_PROD_DOWNLOAD_URL = 'https://doi.crossref.org/servlet/submissionDownload'

/**
 * XML escape helper ensuring no special characters break Crossref XML schema.
 * Replaces &, <, >, ", ' and removes XML 1.0 illegal control characters.
 */
export function escapeXml(str) {
  if (str === null || str === undefined) return ''
  return String(str)
    // eslint-disable-next-line no-control-regex
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

/**
 * Validates and extracts a clean 16-character ORCID identifier if valid.
 * E.g. '0000-0002-1825-0097'
 */
export function extractValidOrcid(rawOrcid) {
  if (!rawOrcid || typeof rawOrcid !== 'string') return null
  const cleaned = rawOrcid.replace(/^https?:\/\/orcid\.org\//i, '').trim()
  const orcidRegex = /^\d{4}-\d{4}-\d{4}-[\dX]{4}$/i
  return orcidRegex.test(cleaned) ? cleaned.toUpperCase() : null
}

/**
 * Generates Crossref journal article deposit XML matching Crossref schema 5.3.1.
 */
export function generateCrossrefDepositXml({
  batchId,
  timestamp = Date.now(),
  depositorName = 'IJIDCR Publishing',
  depositorEmail = env.CROSSREF_DEPOSIT_EMAIL || 'ceo@ijidcr-asgard.in',
  registrant = 'Asgard International Research Publication',
  journal = {},
  manuscript = {},
  publication = {},
  authors = [],
  doi: explicitDoi,
  articleLandingUrl: explicitLandingUrl,
}) {
  const doi = explicitDoi || publication.doi
  const articleLandingUrl = explicitLandingUrl || publication.articleLandingUrl || publication.article_url

  if (!doi) {
    throw new AppError('Cannot generate Crossref XML: DOI is required', 400)
  }
  if (!articleLandingUrl) {
    throw new AppError('Cannot generate Crossref XML: article landing URL is required', 400)
  }

  const cleanBatchId = escapeXml(batchId || `batch_${Date.now()}`)
  const cleanTimestamp = String(timestamp)
  const cleanDepositorName = escapeXml(depositorName)
  const cleanDepositorEmail = escapeXml(depositorEmail)
  const cleanRegistrant = escapeXml(registrant)

  // Journal Metadata
  const journalTitle = escapeXml(journal.name || journal.title || 'International Journal of Intelligent Digital Computing Research')
  const journalAbbrev = escapeXml(journal.short_name || journal.shortTitle || 'IJIDCR')
  const onlineIssn = journal.issn_online || journal.issnOnline ? String(journal.issn_online || journal.issnOnline).trim() : ''
  const printIssn = journal.issn_print || journal.issnPrint ? String(journal.issn_print || journal.issnPrint).trim() : ''

  let issnTags = ''
  if (onlineIssn) {
    issnTags += `\n        <issn media_type="electronic">${escapeXml(onlineIssn)}</issn>`
  }
  if (printIssn && printIssn.toLowerCase() !== 'to be assigned') {
    issnTags += `\n        <issn media_type="print">${escapeXml(printIssn)}</issn>`
  }
  // Default fallback if neither is available so schema validates
  if (!issnTags) {
    issnTags = `\n        <issn media_type="electronic">2654-6725</issn>`
  }

  // Publication dates
  const pubDateObj = publication.publication_date ? new Date(publication.publication_date) : new Date()
  const pubYear = pubDateObj.getUTCFullYear()
  const pubMonth = String(pubDateObj.getUTCMonth() + 1).padStart(2, '0')
  const pubDay = String(pubDateObj.getUTCDate()).padStart(2, '0')

  const volume = publication.volume || 1
  const issue = publication.issue || 1

  // Article metadata
  const articleTitle = escapeXml(manuscript.title || 'Untitled Manuscript')
  const articleAbstract = manuscript.abstract ? escapeXml(manuscript.abstract.trim()) : ''

  // Contributors XML
  const authorList = Array.isArray(authors) && authors.length > 0
    ? authors
    : (Array.isArray(manuscript.authors) && manuscript.authors.length > 0
      ? manuscript.authors
      : [{ first_name: 'Author', last_name: 'Contributor' }])

  const contributorsXml = authorList.map((author, index) => {
    const sequence = index === 0 ? 'first' : 'additional'
    const rawFirst = (author.first_name || '').trim()
    const rawLast = (author.last_name || '').trim()
    const rawName = (author.name || '').trim()

    let givenName = ''
    let surname = ''

    if (rawFirst && rawLast) {
      givenName = escapeXml(rawFirst)
      surname = escapeXml(rawLast)
    } else if (rawLast) {
      surname = escapeXml(rawLast)
    } else if (rawFirst) {
      surname = escapeXml(rawFirst)
    } else if (rawName) {
      const parts = rawName.split(/\s+/)
      if (parts.length > 1) {
        givenName = escapeXml(parts.slice(0, -1).join(' '))
        surname = escapeXml(parts[parts.length - 1])
      } else {
        surname = escapeXml(rawName)
      }
    } else {
      surname = 'Author'
    }

    const orcidVal = extractValidOrcid(author.orcid_id || author.orcid)
    const orcidTag = orcidVal ? `\n          <ORCID authenticated="false">https://orcid.org/${escapeXml(orcidVal)}</ORCID>` : ''

    const affiliation = author.institution || author.department || author.affiliation || ''
    const affiliationTag = affiliation
      ? `\n          <affiliations>\n            <institution>\n              <institution_name>${escapeXml(affiliation)}</institution_name>\n            </institution>\n          </affiliations>`
      : ''

    return `        <person_name sequence="${sequence}" contributor_role="author">${givenName ? `\n          <given_name>${givenName}</given_name>` : ''}\n          <surname>${surname}</surname>${orcidTag}${affiliationTag}\n        </person_name>`
  }).join('\n')

  const abstractBlock = articleAbstract
    ? `\n        <jats:abstract xmlns:jats="http://www.ncbi.nlm.nih.gov/JATS1">\n          <jats:p>${articleAbstract}</jats:p>\n        </jats:abstract>`
    : ''

  const itemNumber = escapeXml(manuscript.submission_number || manuscript.submissionNumber || '')
  const publisherItemBlock = itemNumber
    ? `\n        <publisher_item>\n          <item_number>${itemNumber}</item_number>\n        </publisher_item>`
    : ''

  return `<?xml version="1.0" encoding="UTF-8"?>
<doi_batch version="5.3.1" xmlns="http://www.crossref.org/schema/5.3.1" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.crossref.org/schema/5.3.1 https://www.crossref.org/schemas/crossref5.3.1.xsd">
  <head>
    <doi_batch_id>${cleanBatchId}</doi_batch_id>
    <timestamp>${cleanTimestamp}</timestamp>
    <depositor>
      <depositor_name>${cleanDepositorName}</depositor_name>
      <email_address>${cleanDepositorEmail}</email_address>
    </depositor>
    <registrant>${cleanRegistrant}</registrant>
  </head>
  <body>
    <journal>
      <journal_metadata language="en">
        <full_title>${journalTitle}</full_title>
        <abbrev_title>${journalAbbrev}</abbrev_title>${issnTags}
      </journal_metadata>
      <journal_issue>
        <publication_date media_type="online">
          <month>${pubMonth}</month>
          <day>${pubDay}</day>
          <year>${pubYear}</year>
        </publication_date>
        <journal_volume>
          <volume>${volume}</volume>
        </journal_volume>
        <issue>${issue}</issue>
      </journal_issue>
      <journal_article publication_type="full_text">
        <titles>
          <title>${articleTitle}</title>
        </titles>
        <contributors>
${contributorsXml}
        </contributors>
        <publication_date media_type="online">
          <month>${pubMonth}</month>
          <day>${pubDay}</day>
          <year>${pubYear}</year>
        </publication_date>${abstractBlock}${publisherItemBlock}
        <doi_data>
          <doi>${escapeXml(doi)}</doi>
          <resource>${escapeXml(articleLandingUrl)}</resource>
        </doi_data>
      </journal_article>
    </journal>
  </body>
</doi_batch>`
}

/**
 * Validates production environment safety gates.
 */
export function validateCrossrefConfig(environment = env.CROSSREF_ENV) {
  const isProduction = environment === 'production'

  if (isProduction) {
    if (!env.CROSSREF_PRODUCTION_DEPOSITS_ENABLED) {
      throw new AppError(
        'Crossref production deposit is BLOCKED: CROSSREF_PRODUCTION_DEPOSITS_ENABLED must be explicitly true.',
        403
      )
    }
    if (!env.CROSSREF_LOGIN_ID || !env.CROSSREF_LOGIN_PASSWORD) {
      throw new AppError('Crossref production credentials missing in server environment.', 500)
    }
    if (!env.CROSSREF_DEPOSIT_EMAIL) {
      throw new AppError('Crossref deposit email missing in server environment.', 500)
    }
    if (!env.CROSSREF_DOI_PREFIX) {
      throw new AppError('Crossref DOI prefix missing in server environment.', 500)
    }
  }

  return {
    isProduction,
    depositUrl: isProduction ? CROSSREF_PROD_DEPOSIT_URL : CROSSREF_TEST_DEPOSIT_URL,
    downloadUrl: isProduction ? CROSSREF_PROD_DOWNLOAD_URL : CROSSREF_TEST_DOWNLOAD_URL,
  }
}

/**
 * Submits Crossref deposit XML using multipart/form-data.
 *
 * @param {Object} params
 * @param {string} params.xmlContent
 * @param {string} params.depositFilename
 * @param {string} params.batchId
 * @param {string} [params.environment]
 * @returns {Promise<{ success: boolean, httpStatus: number, responseBody: string, submissionId?: string }>}
 */
export async function submitCrossrefDeposit({
  xmlContent,
  depositFilename,
  batchId: _batchId,
  environment = env.CROSSREF_ENV,
}) {
  const config = validateCrossrefConfig(environment)
  const loginId = env.CROSSREF_LOGIN_ID
  const loginPassword = env.CROSSREF_LOGIN_PASSWORD

  const formData = new FormData()
  formData.append('operation', 'doMDUpload')
  formData.append('login_id', loginId)
  formData.append('login_passwd', loginPassword)
  formData.append('area', config.isProduction ? 'live' : 'test')

  const xmlBlob = new Blob([xmlContent], { type: 'application/xml; charset=utf-8' })
  formData.append('fname', xmlBlob, depositFilename)

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), env.CROSSREF_REQUEST_TIMEOUT_MS || 30000)

  try {
    const response = await fetch(config.depositUrl, {
      method: 'POST',
      body: formData,
      signal: controller.signal,
    })

    clearTimeout(timeoutId)
    const responseText = await response.text()

    if (!response.ok) {
      throw new Error(`Crossref deposit endpoint returned HTTP ${response.status}: ${sanitizeCrossrefResponse(responseText)}`)
    }

    // Try to extract Crossref submission/batch ID from response body if present
    const submissionIdMatch = responseText.match(/(?:submission\s+id[:\s]+|batch_id[:\s]+)([0-9a-zA-Z_-]+)/i)
    const submissionId = submissionIdMatch ? submissionIdMatch[1] : null

    return {
      success: true,
      httpStatus: response.status,
      responseBody: sanitizeCrossrefResponse(responseText),
      submissionId,
    }
  } catch (err) {
    clearTimeout(timeoutId)
    if (err.name === 'AbortError') {
      throw new Error(`Crossref deposit timed out after ${env.CROSSREF_REQUEST_TIMEOUT_MS || 30000}ms`)
    }
    throw err
  }
}

/**
 * Sanitizes response bodies to guarantee credentials or secrets are never leaked.
 */
export function sanitizeCrossrefResponse(text) {
  if (!text) return ''
  return String(text)
    .replace(/(password|pwd|login_passwd)=[^&\s]+/gi, '$1=***REDACTED***')
    .slice(0, 4000)
}

/**
 * Parses the Crossref submission log XML to verify per-record diagnostic status.
 *
 * @param {string} logXml - Raw XML from Crossref submissionDownload
 * @param {string} expectedDoi - Target DOI to check
 * @returns {{ isPending: boolean, isSuccess: boolean, isFailure: boolean, error?: string, summary: string }}
 */
export function parseCrossrefSubmissionLog(logXml, _expectedDoi) {
  if (!logXml || typeof logXml !== 'string') {
    return { isPending: true, isSuccess: false, isFailure: false, summary: 'Empty or missing log response' }
  }

  // If Crossref responds that submission is still pending or not found
  if (
    logXml.includes('Submission not found') ||
    logXml.includes('still processing') ||
    logXml.includes('processing queue') ||
    logXml.includes('<record_count>0</record_count>')
  ) {
    return { isPending: true, isSuccess: false, isFailure: false, summary: 'Submission processing in Crossref queue' }
  }

  // Check for record diagnostic elements
  const recordCountMatch = logXml.match(/<record_count>(\d+)<\/record_count>/i)
  const failureCountMatch = logXml.match(/<failure_count>(\d+)<\/failure_count>/i)
  const successCountMatch = logXml.match(/<success_count>(\d+)<\/success_count>/i)

  const failureCount = failureCountMatch ? parseInt(failureCountMatch[1], 10) : 0
  const successCount = successCountMatch ? parseInt(successCountMatch[1], 10) : 0
  const recordCount = recordCountMatch ? parseInt(recordCountMatch[1], 10) : 0

  // Per-record diagnostic failure check
  const failureDiagnosticRegex = /<record_diagnostic[^>]*status=["']Failure["'][^>]*>([\s\S]*?)<\/record_diagnostic>/gi
  const failureDiagnostics = []
  let match
  while ((match = failureDiagnosticRegex.exec(logXml)) !== null) {
    const errorText = match[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
    failureDiagnostics.push(errorText)
  }

  if (failureCount > 0 || failureDiagnostics.length > 0) {
    const combinedError = failureDiagnostics.join('; ') || `Crossref reported ${failureCount} record failure(s).`
    return {
      isPending: false,
      isSuccess: false,
      isFailure: true,
      error: sanitizeCrossrefResponse(combinedError),
      summary: `Failed with ${failureCount} failure(s): ${sanitizeCrossrefResponse(combinedError)}`,
    }
  }

  // Per-record success check
  const successDiagnosticRegex = /<record_diagnostic[^>]*status=["']Success["'][^>]*>/i
  if (successCount > 0 || (recordCount > 0 && successDiagnosticRegex.test(logXml))) {
    return {
      isPending: false,
      isSuccess: true,
      isFailure: false,
      summary: `Successfully registered (${successCount} record(s) processed with 0 failures)`,
    }
  }

  // If no diagnostic or count found, could still be malformed or pending
  if (logXml.includes('<batch_data>')) {
    return { isPending: true, isSuccess: false, isFailure: false, summary: 'Batch data received, awaiting record completion' }
  }

  return {
    isPending: false,
    isFailure: true,
    isSuccess: false,
    error: 'Unrecognized Crossref submission log response',
    summary: sanitizeCrossrefResponse(logXml.slice(0, 300)),
  }
}

/**
 * Retrieves the final Crossref submission log for a deposit.
 */
export async function fetchCrossrefSubmissionLog({
  depositFilename,
  environment = env.CROSSREF_ENV,
}) {
  const config = validateCrossrefConfig(environment)
  const loginId = env.CROSSREF_LOGIN_ID
  const loginPassword = env.CROSSREF_LOGIN_PASSWORD

  const url = new URL(config.downloadUrl)
  url.searchParams.set('usr', loginId)
  url.searchParams.set('pwd', loginPassword)
  url.searchParams.set('file_name', depositFilename)
  url.searchParams.set('type', 'result')

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), env.CROSSREF_REQUEST_TIMEOUT_MS || 30000)

  try {
    const response = await fetch(url.toString(), {
      method: 'GET',
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (response.status === 404) {
      return { status: 'pending', logXml: null }
    }

    if (!response.ok) {
      const errText = await response.text().catch(() => '')
      throw new Error(`Failed to fetch Crossref log (HTTP ${response.status}): ${sanitizeCrossrefResponse(errText)}`)
    }

    const logXml = await response.text()
    return { status: 'ready', logXml }
  } catch (err) {
    clearTimeout(timeoutId)
    if (err.name === 'AbortError') {
      throw new Error(`Log retrieval timed out after ${env.CROSSREF_REQUEST_TIMEOUT_MS || 30000}ms`)
    }
    throw err
  }
}
