import { PDFDocument, rgb, StandardFonts, PDFName, PDFString } from 'pdf-lib'
import * as fontkitModule from 'fontkit'
import { promises as fs } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { execFileSync } from 'child_process'
import { DOMParser } from '@xmldom/xmldom'

const fontkit = fontkitModule.default || fontkitModule

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const FALLBACK_LOGO_PATH = path.join(__dirname, '../../assets/journal-logo.png')
const JOURNAL_FAVICON_PATH = path.join(__dirname, '../../assets/favicon-logo.png')
const JOURNAL_FAVICON_FALLBACK_PATH = path.resolve(__dirname, '../../../../client/public/favicon-logo.png')
const ORCID_ICON_PATH = path.join(__dirname, '../../assets/orcid-icon.png')
const EB_GARAMOND_REGULAR_PATH = path.join(__dirname, '../../assets/fonts/EBGaramond-Regular.ttf')
const EB_GARAMOND_BOLD_PATH = path.join(__dirname, '../../assets/fonts/EBGaramond12-Bold.otf')

let cachedRegularFontBytes = null
let cachedBoldFontBytes = null
let cachedJournalFaviconBytes = null

/**
 * Loads and embeds the EB Garamond font family into the given PDFDocument.
 * Falls back to TimesRoman if font assets are missing.
 */
async function loadEBGaramondFonts(doc) {
  if (fontkit && typeof doc.registerFontkit === 'function') {
    doc.registerFontkit(fontkit)
  }
  if (!cachedRegularFontBytes) {
    try {
      cachedRegularFontBytes = await fs.readFile(EB_GARAMOND_REGULAR_PATH)
    } catch {
      cachedRegularFontBytes = null
    }
  }
  if (!cachedBoldFontBytes) {
    try {
      cachedBoldFontBytes = await fs.readFile(EB_GARAMOND_BOLD_PATH)
    } catch {
      cachedBoldFontBytes = null
    }
  }

  let fontRegular = null
  let fontBold = null

  if (cachedRegularFontBytes) {
    fontRegular = await doc.embedFont(cachedRegularFontBytes)
  } else {
    fontRegular = await doc.embedFont(StandardFonts.TimesRoman)
  }

  if (cachedBoldFontBytes) {
    fontBold = await doc.embedFont(cachedBoldFontBytes)
  } else if (cachedRegularFontBytes) {
    fontBold = fontRegular
  } else {
    fontBold = await doc.embedFont(StandardFonts.TimesRomanBold)
  }

  return { fontRegular, fontBold }
}

// Design system colors
const NAVY = rgb(11 / 255, 27 / 255, 58 / 255)
const GOLD = rgb(196 / 255, 162 / 255, 76 / 255)
const MANUSCRIPT_TITLE = rgb(196 / 255, 162 / 255, 76 / 255)
const _SUBJECT_CATEGORY = rgb(196 / 255, 162 / 255, 76 / 255)
const MUTED = rgb(90 / 255, 101 / 255, 114 / 255)
const RULE_GREY = rgb(209 / 255, 213 / 255, 219 / 255)
const BLACK = rgb(0, 0, 0)
// EB Garamond font size constants
const AUTHOR_NAME_FONT_SIZE = 10 // Increased from default 8pt

/**
 * Loads a logo image into the pdf-lib PDFDocument.
 * Uses provided buffer, or falls back to bundled asset.
 */
async function embedLogo(doc, logoBuffer) {
  let buffer = logoBuffer

  if (!buffer) {
    try {
      buffer = await fs.readFile(FALLBACK_LOGO_PATH)
    } catch {
      return null
    }
  }

  try {
    // Try PNG first, then JPG
    return await doc.embedPng(buffer)
  } catch {
    try {
      return await doc.embedJpg(buffer)
    } catch {
      return null
    }
  }
}

/**
 * Loads the official ORCID icon image into the pdf-lib PDFDocument.
 */
async function embedOrcidIcon(doc) {
  try {
    const buffer = await fs.readFile(ORCID_ICON_PATH)
    return await doc.embedPng(buffer)
  } catch {
    return null
  }
}

/**
 * Extracts and normalizes an ORCID ID string into standard 16-character format:
 * 0000-0002-1825-0097. Accepts bare IDs, http:// or https:// URLs.
 */
export function extractValidOrcid(rawOrcid) {
  if (!rawOrcid || typeof rawOrcid !== 'string') return null
  const cleaned = rawOrcid
    .replace(/^https?:\/\/orcid\.org\//i, '')
    .replace(/^orcid\.org\//i, '')
    .trim()
  const orcidRegex = /^\d{4}-\d{4}-\d{4}-[\dX]{4}$/i
  return orcidRegex.test(cleaned) ? cleaned.toUpperCase() : null
}

/**
 * Formats an author object or string into a clean display name.
 */
function getAuthorDisplayName(author) {
  if (!author) return ''
  if (typeof author === 'string') return author.trim()
  const full = [author.first_name, author.last_name].filter(Boolean).join(' ').trim()
  return full || author.name || 'Author'
}

/**
 * Splits authors into pairs of up to 2 authors each.
 * Requirement: a single header page must contain two authors.
 *
 * @param {Array} authors - List of authors
 * @returns {Array<Array>} Chunks of up to 2 authors
 */
export function chunkAuthorsIntoPairs(authors = []) {
  if (!Array.isArray(authors) || authors.length === 0) {
    return [['Author(s)']]
  }
  const pairs = []
  for (let i = 0; i < authors.length; i += 2) {
    pairs.push(authors.slice(i, i + 2))
  }
  return pairs
}

/**
 * Returns the formatted author header string for a given page number (1-based, starting from page 2).
 * Page 2 gets the first two authors.
 * Page 3 gets the next two authors.
 * If there are more pages than author pairs, it cycles through the pairs based on author count.
 *
 * @param {Array} authors - List of authors
 * @param {number} pageNum - 1-based page number (e.g. 2, 3, 4...)
 * @returns {string} Formatted author header string, e.g. "Dr. A. Kumar, Dr. B. Priya"
 */
export function getAuthorHeaderForPage(authors = [], pageNum = 2) {
  const pairs = chunkAuthorsIntoPairs(authors)
  if (pairs.length === 0) return 'Author(s)'

  const pairIndex = Math.max(0, pageNum - 2) % pairs.length
  const currentPair = pairs[pairIndex]

  const names = currentPair.map(getAuthorDisplayName).filter(Boolean)
  return names.length > 0 ? names.join(', ') : 'Author(s)'
}

/**
 * Formats the ISSN string based on available configured values.
 * Returns null if neither ISSN is present (does not fabricate fake values).
 */
export function formatIssnString(journal = {}) {
  const online = journal.issn_online ? String(journal.issn_online).trim() : ''
  const print = journal.issn_print ? String(journal.issn_print).trim() : ''

  if (online && print) {
    return `ISSN (Online): ${online} | ISSN (Print): ${print}`
  }
  if (online) {
    return `ISSN (Online): ${online}`
  }
  if (print) {
    return `ISSN (Print): ${print}`
  }
  return null
}

/**
 * Formats a compact ISSN string for running headers on page 2+.
 */
export function formatCompactIssn(journal = {}) {
  const online = journal.issn_online ? String(journal.issn_online).trim() : ''
  const print = journal.issn_print ? String(journal.issn_print).trim() : ''
  const val = online || print
  return val ? `ISSN: ${val}` : null
}

/**
 * Splits a journal title into appropriate lines for the header.
 */
export function formatJournalTitleLines(name) {
  if (!name) {
    return [
      'INTERNATIONAL JOURNAL OF',
      'INTELLIGENT DIGITAL COMPUTING RESEARCH (IJIDCR)',
    ]
  }
  if (name.includes('\n')) {
    return name.split('\n').map((l) => l.trim()).filter(Boolean)
  }
  const clean = name.trim()
  const match = clean.match(/^(INTERNATIONAL JOURNAL OF)\s+(.+)$/i)
  if (match) {
    return [match[1].toUpperCase(), match[2]]
  }
  return [clean]
}

/**
 * Normalizes a PDF word or author name into a comparable token:
 * strips superscripts, punctuation, asterisks and whitespace.
 */
function normalizeNameToken(value) {
  return String(value || '')
    .replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹]/g, '')
    .replace(/[^\p{L}\p{N}]/gu, '')
    .toLowerCase()
}

function splitNameTokens(value) {
  if (typeof value !== 'string') return []
  return value
    .split(/[\s\-‐‑–—.,/]+/)
    .map(normalizeNameToken)
    .filter(Boolean)
}

function getAuthorNameTokens(author = {}) {
  const tokens = new Set()
  for (const part of [author.first_name, author.last_name, author.name]) {
    for (const token of splitNameTokens(part)) tokens.add(token)
  }

  // Also accept the concatenated "firstlast" form for names the PDF may
  // render without a separator.
  const joined = normalizeNameToken(`${author.first_name || ''}${author.last_name || ''}`)
  if (joined) tokens.add(joined)

  return tokens
}

function getAuthorLastNameTokens(author = {}) {
  return new Set(splitNameTokens(author.last_name))
}

/**
 * Locates the bounding boxes of author names on Page 1.
 *
 * Matching is deliberately strict:
 *  - only words below the "Correspondence" heading (the author block) are considered,
 *    so header text such as "ORIGINAL RESEARCH" or the "Accepted:" date line can
 *    never be mistaken for an author;
 *  - tokens must match whole words, so authors with initials such as "E" or "P"
 *    do not match every word that merely contains that letter;
 *  - each matched word is used for at most one author, and authors sharing a line
 *    each get their own bounding box anchored to their own last-name word.
 *
 * Falls back to template coordinates when pdftotext is unavailable or the
 * correspondence block cannot be identified.
 */
export function findAuthorBoxesOnPage1(pdfBuffer, authors = []) {
  if (!Buffer.isBuffer(pdfBuffer) || pdfBuffer.length === 0 || !Array.isArray(authors) || authors.length === 0) {
    return []
  }

  try {
    const xml = execFileSync('pdftotext', ['-bbox', '-l', '1', '-', '-'], {
      input: pdfBuffer,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'ignore'],
    })

    const domDoc = new DOMParser().parseFromString(xml, 'text/xml')
    const leftWords = Array.from(domDoc.getElementsByTagName('word'))
      .map((w) => ({
        el: w,
        text: w.textContent || '',
        token: normalizeNameToken(w.textContent),
        xMin: parseFloat(w.getAttribute('xMin')),
        xMax: parseFloat(w.getAttribute('xMax')),
        yMin: parseFloat(w.getAttribute('yMin')),
        yMax: parseFloat(w.getAttribute('yMax')),
      }))
      .filter((w) => w.token && [w.xMin, w.xMax, w.yMin, w.yMax].every(Number.isFinite))
      // Author block is the left column of page 1
      .filter((w) => w.xMin < 225)

    const heading = leftWords.find((w) => w.token === 'correspondence')
    if (!heading) {
      return authors.map((a) => ({ author: a, source: 'fallback' }))
    }

    const afterHeading = leftWords
      .filter((w) => w.yMin > heading.yMin + 2)
      .sort((a, b) => a.yMin - b.yMin || a.xMin - b.xMin)

    // Author names end where the affiliation / corresponding-author block starts.
    let blockEnd = Infinity
    for (const w of afterHeading) {
      if (/^[⁰¹²³⁴⁵⁶⁷⁸⁹]/.test(w.text) || w.token === 'corresponding' || w.text.startsWith('©')) {
        blockEnd = w.yMin
        break
      }
    }

    const blockWords = afterHeading.filter((w) => w.yMin < blockEnd - 1)
    const usedWords = new Set()

    return authors.map((author) => {
      const lastNameTokens = getAuthorLastNameTokens(author)
      const allTokens = getAuthorNameTokens(author)

      let candidates = blockWords.filter(
        (w) => !usedWords.has(w) && w.token && lastNameTokens.has(w.token)
      )
      if (candidates.length === 0) {
        candidates = blockWords.filter(
          (w) => !usedWords.has(w) && w.token && allTokens.has(w.token)
        )
      }
      if (candidates.length === 0) {
        return { author, source: 'fallback' }
      }

      // Stay on the line of the first (reading-order) match, then anchor to the
      // right-most matched word so multi-part surnames stay together.
      const anchorLineY = candidates[0].yMin
      const lineCandidates = candidates.filter((w) => Math.abs(w.yMin - anchorLineY) < 3)
      const anchor = lineCandidates.reduce((right, w) => (w.xMax > right.xMax ? w : right), lineCandidates[0])

      // Words belonging to this author on the anchor line: used for the link box.
      const lineWords = blockWords.filter(
        (w) => Math.abs(w.yMin - anchor.yMin) < 3 && w.token && allTokens.has(w.token)
      )
      for (const w of lineWords) usedWords.add(w)
      usedWords.add(anchor)

      return {
        author,
        xMin: Math.min(...lineWords.map((w) => w.xMin)),
        xMax: anchor.xMax,
        yMin: Math.min(...lineWords.map((w) => w.yMin)),
        yMax: Math.max(...lineWords.map((w) => w.yMax)),
        source: 'bbox',
      }
    })
  } catch {
    return authors.map((a) => ({ author: a, source: 'fallback' }))
  }
}

/**
 * Stamps ORCID icon after author names on Page 1 and attaches interactive
 * clickable PDF Link annotations redirecting to the authors' ORCID pages.
 */
async function stampAuthorOrcidOnPage1(doc, page1, authors = [], pdfBuffer = null, fontRegular = null) {
  if (!Array.isArray(authors) || authors.length === 0) return

  const orcidImg = await embedOrcidIcon(doc)
  const boxes = findAuthorBoxesOnPage1(pdfBuffer, authors)
  const { height } = page1.getSize()

  const fallbackBaseY = 563 // Standard template baseline below Correspondence header
  for (let idx = 0; idx < authors.length; idx++) {
    const a = authors[idx]
    const rawOrcid = a.orcid_id || a.orcid || ''
    const validOrcid = extractValidOrcid(rawOrcid)
    if (!validOrcid) continue

    const orcidUrl = `https://orcid.org/${validOrcid}`
    const box = boxes[idx]
    let xMin, xMax, yBottom, yTop

    if (box && box.source === 'bbox' && typeof box.xMin === 'number') {
      xMin = box.xMin
      xMax = box.xMax
      yBottom = height - box.yMax
      yTop = height - box.yMin
    } else {
      xMin = 57.7
      yBottom = fallbackBaseY - idx * 15.65
      yTop = yBottom + 12
      const displayName = getAuthorDisplayName(a)
      const estimatedWidth = fontRegular ? fontRegular.widthOfTextAtSize(displayName, 10) : displayName.length * 6
      xMax = xMin + estimatedWidth
    }

    const iconSize = 8.5
    const iconX = xMax + 3
    const iconY = yBottom + Math.max(0, (yTop - yBottom - iconSize) / 2)

    if (orcidImg) {
      page1.drawImage(orcidImg, {
        x: iconX,
        y: iconY,
        width: iconSize,
        height: iconSize,
      })
    }

    // Interactive clickable Link annotation covering both author name and ORCID icon
    const linkAnnot = doc.context.obj({
      Type: PDFName.of('Annot'),
      Subtype: PDFName.of('Link'),
      Rect: [xMin - 2, yBottom - 2, iconX + iconSize + 2, yTop + 2],
      Border: [0, 0, 0],
      C: [0, 0, 0],
      A: {
        Type: PDFName.of('Action'),
        S: PDFName.of('URI'),
        URI: PDFString.of(orcidUrl),
      },
    })
    const linkRef = doc.context.register(linkAnnot)
    page1.node.addAnnot(linkRef)
  }
}

/**
 * Stamps publication-ready branding headers and footers onto a PDF.
 *
 * @param {Object} params
 * @param {Buffer} params.pdfBuffer - The source PDF buffer (unbranded)
 * @param {Object} params.journal - Journal metadata (name, publisher, issns, website_url)
 * @param {Object} params.manuscript - Manuscript record (submission_number, title)
 * @param {Object} params.publication - Publication record (volume, issue, year)
 * @param {string} params.certificateNumber - Reused certificate number
 * @param {Buffer} [params.logoBuffer] - Optional logo buffer
 * @param {Array} [params.authors] - Optional list of authors for running headers & ORCID
 * @returns {Promise<Buffer>} The branded, publication-ready PDF buffer
 */
export async function renderBrandedManuscriptPdf({
  pdfBuffer,
  journal = {},
  manuscript = {},
  publication = {},
  certificateNumber,
  logoBuffer = null,
  authors = [],
}) {
  if (!Buffer.isBuffer(pdfBuffer) || pdfBuffer.length === 0) {
    throw new Error('Invalid PDF buffer provided for publication branding.')
  }

  const doc = await PDFDocument.load(pdfBuffer)
  const pages = doc.getPages()
  const totalPages = pages.length

  if (totalPages === 0) {
    throw new Error('PDF document contains no pages.')
  }

  // EB Garamond font family from project assets
  const { fontRegular, fontBold } = await loadEBGaramondFonts(doc)
  const logoImg = await embedLogo(doc, logoBuffer)

  const journalName =
    journal.name ||
    'INTERNATIONAL JOURNAL OF INTELLIGENT DIGITAL COMPUTING RESEARCH (IJIDCR)'
  const journalShortName = journal.short_name || 'IJIDCR'
  const publisherName = journal.publisher_name
    ? (journal.publisher_name.trim().toLowerCase().startsWith('published by')
        ? journal.publisher_name.trim()
        : `Published by ${journal.publisher_name.trim()}`)
    : 'Published by ASGARD INTERNATIONAL RESEARCH PUBLICATION'
  const issnFull = formatIssnString(journal)
  const compactIssn = formatCompactIssn(journal)

  const submissionNumber = manuscript.submission_number || 'N/A'
  const certNo = certificateNumber || 'N/A'

  const volume = publication.volume || 1
  const issue = publication.issue || 1
  const year = publication.publication_year || new Date().getFullYear()
  const volIssueText = `Vol. ${volume}, Issue ${issue} (${year})`
  const websiteUrl = journal.website_url || 'https://ijidcr-asgard.in/'

  for (let i = 0; i < totalPages; i++) {
    const page = pages[i]
    const { width, height } = page.getSize()
    const margin = 36 // 0.5 in side margins
    const isFirstPage = i === 0

    if (isFirstPage) {
      // ══════════════════════════════════════════════════════════════════════
      // PAGE 1 — FULL PUBLICATION HEADER
      // ══════════════════════════════════════════════════════════════════════
      const titleLines = formatJournalTitleLines(journalName)

      let logoWidth = 0
      if (logoImg) {
        const logoH = 30
        logoWidth = (logoImg.width / logoImg.height) * logoH
        logoWidth = Math.min(logoWidth, 60)
        page.drawImage(logoImg, {
          x: margin,
          y: height - 14 - logoH,
          width: logoWidth,
          height: logoH,
        })
      }

      const textX = margin + (logoWidth > 0 ? logoWidth + 10 : 0)

      // Title line(s)
      let titleY = height - 19
      for (const tLine of titleLines) {
        page.drawText(tLine, {
          x: textX,
          y: titleY,
          size: 12,
          font: fontBold,
          color: MANUSCRIPT_TITLE,
        })
        titleY -= 13
      }

      // Publisher line (if configured)
      let lineY = titleY
      if (publisherName) {
        page.drawText(publisherName, {
          x: textX,
          y: lineY,
          size: 6.8,
          font: fontRegular,
          color: MUTED,
        })
        lineY -= 8.5
      }

      // ISSN line (if configured)
      if (issnFull) {
        page.drawText(issnFull, {
          x: textX,
          y: lineY,
          size: 6.8,
          font: fontRegular,
          color: MUTED,
        })
        lineY -= 8.5
      }

      // Right metadata column
      const idText = `Manuscript ID: ${submissionNumber}`
      const certText = `Certificate No: ${certNo}`

      const idW = fontBold.widthOfTextAtSize(idText, 7.5)
      const certW = fontBold.widthOfTextAtSize(certText, 7.5)
      const volW = fontRegular.widthOfTextAtSize(volIssueText, 6.5)

      page.drawText(idText, {
        x: width - margin - idW,
        y: height - 20,
        size: 7.5,
        font: fontBold,
        color: NAVY,
      })

      page.drawText(certText, {
        x: width - margin - certW,
        y: height - 29.5,
        size: 7.5,
        font: fontBold,
        color: GOLD,
      })

      page.drawText(volIssueText, {
        x: width - margin - volW,
        y: height - 38,
        size: 6.5,
        font: fontRegular,
        color: MUTED,
      })

      const rawDoi = publication.doi ? String(publication.doi).trim() : ''
      const doiUrlText = rawDoi
        ? (rawDoi.startsWith('http') ? rawDoi : `https://doi.org/${rawDoi}`)
        : null

      if (doiUrlText) {
        const doiW = fontRegular.widthOfTextAtSize(`DOI: ${doiUrlText}`, 6.5)
        page.drawText(`DOI: ${doiUrlText}`, {
          x: width - margin - doiW,
          y: height - 46.5,
          size: 6.5,
          font: fontRegular,
          color: MUTED,
        })
      }

      // Separator rule
      const sepY = Math.min(lineY - 2, height - (doiUrlText ? 54 : 48))
      page.drawLine({
        start: { x: margin, y: sepY },
        end: { x: width - margin, y: sepY },
        thickness: 0.75,
        color: GOLD,
      })

      // If authors provided with orcid, stamp orcid on page 1
      if (Array.isArray(authors) && authors.length > 0) {
        await stampAuthorOrcidOnPage1(doc, page, authors, pdfBuffer, fontRegular)
      }
    } else {
      // ══════════════════════════════════════════════════════════════════════
      // PAGE 2+ — COMPACT RUNNING HEADER
      // ══════════════════════════════════════════════════════════════════════
      const journalRunningText = compactIssn
        ? `${journalShortName} | ${compactIssn}`
        : journalShortName

      // Header rule (or head rule): The thin black horizontal line stretching across the full width of the top margin.
      page.drawLine({
        start: { x: margin, y: height - 28 },
        end: { x: width - margin, y: height - 28 },
        thickness: 0.5,
        color: BLACK,
      })

      if (Array.isArray(authors) && authors.length > 0) {
        // Author names above the margin (2 authors per page)
        const authorHeaderText = getAuthorHeaderForPage(authors, i + 1)
        page.drawText(authorHeaderText, {
          x: margin,
          y: height - 22,
          size: AUTHOR_NAME_FONT_SIZE,
          font: fontRegular,
          color: BLACK,
        })

        const rightW = fontRegular.widthOfTextAtSize(journalRunningText, 7.5)
        page.drawText(journalRunningText, {
          x: width - margin - rightW,
          y: height - 22,
          size: 7.5,
          font: fontBold,
          color: BLACK,
        })
      } else {
        // Fallback when no authors provided
        let miniLogoW = 0
        if (logoImg) {
          const miniLogoH = 14
          miniLogoW = (logoImg.width / logoImg.height) * miniLogoH
          miniLogoW = Math.min(miniLogoW, 25)
          page.drawImage(logoImg, {
            x: margin,
            y: height - 12 - miniLogoH,
            width: miniLogoW,
            height: miniLogoH,
          })
        }

        const textX = margin + (miniLogoW > 0 ? miniLogoW + 6 : 0)
        page.drawText(journalRunningText, {
          x: textX,
          y: height - 22,
          size: 7.5,
          font: fontBold,
          color: NAVY,
        })

        const rightRunningText = `Manuscript ID: ${submissionNumber} | Certificate: ${certNo}`
        const rightW = fontRegular.widthOfTextAtSize(rightRunningText, 7)
        page.drawText(rightRunningText, {
          x: width - margin - rightW,
          y: height - 22,
          size: 7,
          font: fontRegular,
          color: NAVY,
        })
      }
    }

    // ══════════════════════════════════════════════════════════════════════
    // FOOTER (ALL PAGES)
    // ══════════════════════════════════════════════════════════════════════
    page.drawLine({
      start: { x: margin, y: 26 },
      end: { x: width - margin, y: 26 },
      thickness: 0.4,
      color: RULE_GREY,
    })

    if (websiteUrl) {
      page.drawText(websiteUrl, {
        x: margin,
        y: 16,
        size: 6.5,
        font: fontRegular,
        color: MUTED,
      })
    }

    const pageText = `Page ${i + 1} of ${totalPages}`
    const pageW = fontBold.widthOfTextAtSize(pageText, 7)
    page.drawText(pageText, {
      x: width - margin - pageW,
      y: 16,
      size: 7,
      font: fontBold,
      color: NAVY,
    })
  }

  // Set document metadata
  if (manuscript.title) {
    doc.setTitle(manuscript.title)
  }
  doc.setCreator('IJIDCR Publishing Engine')
  doc.setProducer('IJIDCR Publication System')

  const outputBytes = await doc.save()
  return Buffer.from(outputBytes)
}

/**
 * Stamps Page 2+ running head rule with author names (2 authors per page)
 * and Page 1 author ORCID icons + interactive clickable links onto a generated PDF.
 *
 * @param {Object} params
 * @param {Buffer} params.pdfBuffer - PDF document buffer
 * @param {Array} params.authors - List of authors
 * @param {Object} params.journal - Journal metadata
 * @param {Object} params.manuscript - Manuscript metadata
 * @param {Object} params.publication - Publication metadata
 * @returns {Promise<Buffer>} Modified PDF buffer
 */
export async function stampPublishedManuscriptHeadersAndOrcid({
  pdfBuffer,
  authors = [],
  journal = {},
  manuscript: _manuscript = {},
  publication: _publication = {},
}) {
  if (!Buffer.isBuffer(pdfBuffer) || pdfBuffer.length === 0) {
    return pdfBuffer
  }

  try {
    const doc = await PDFDocument.load(pdfBuffer)
    const pages = doc.getPages()
    const totalPages = pages.length
    if (totalPages === 0) return pdfBuffer

    const { fontRegular, fontBold } = await loadEBGaramondFonts(doc)
    const journalShortName = journal.short_name || 'IJIDCR'

    // 1. Page 1: Stamp author ORCID icon & interactive link
    await stampAuthorOrcidOnPage1(doc, pages[0], authors, pdfBuffer, fontRegular)

    // 2. Pages 2 to n: Stamp header rule & 2 authors per page
    for (let i = 1; i < totalPages; i++) {
      const page = pages[i]
      const { width, height } = page.getSize()
      const margin = 36 // 0.5 in side margins

      // Header rule (or head rule): The thin black horizontal line stretching across the full width of the top margin.
      page.drawLine({
        start: { x: margin, y: height - 28 },
        end: { x: width - margin, y: height - 28 },
        thickness: 0.5,
        color: BLACK,
      })

      // In the above margin: author names (2 authors per page)
      const authorHeaderText = getAuthorHeaderForPage(authors, i + 1)
      page.drawText(authorHeaderText, {
        x: margin,
        y: height - 22,
        size: 8,
        font: fontRegular,
        color: BLACK,
      })

      // Right header: journal short name
      const rightW = fontBold.widthOfTextAtSize(journalShortName, 7.5)
      page.drawText(journalShortName, {
        x: width - margin - rightW,
        y: height - 22,
        size: 7.5,
        font: fontBold,
        color: BLACK,
      })
    }

    const modifiedBytes = await doc.save()
    return Buffer.from(modifiedBytes)
  } catch {
    // If stamping fails, return original buffer gracefully
    return pdfBuffer
  }
}

const CROSSREF_LOGO_PATH = path.join(__dirname, '../../assets/crossref-logo.png')
let cachedCrossrefLogoBytes = null

/**
 * Loads and embeds the official Crossref logo image into the pdf-lib PDFDocument.
 * Uses bundled high-resolution asset converted from metadata-from-crossref-logo-200.svg.
 *
 * @param {PDFDocument} doc - The PDF document to embed the logo into
 * @returns {Promise<any>} The embedded PDFImage, or null if loading fails
 */
export async function embedCrossrefLogo(doc) {
  if (!doc) return null
  if (!cachedCrossrefLogoBytes) {
    try {
      cachedCrossrefLogoBytes = await fs.readFile(CROSSREF_LOGO_PATH)
    } catch {
      cachedCrossrefLogoBytes = null
    }
  }

  if (!cachedCrossrefLogoBytes) return null

  try {
    return await doc.embedPng(cachedCrossrefLogoBytes)
  } catch {
    return null
  }
}

/**
 * Loads and embeds the official Journal favicon logo into the pdf-lib PDFDocument.
 * Uses client/public/favicon-logo.png asset copied to server/src/assets/favicon-logo.png.
 *
 * @param {PDFDocument} doc - The PDF document
 * @returns {Promise<any>} The embedded PDFImage, or null if loading fails
 */
export async function embedJournalFaviconLogo(doc) {
  if (!doc) return null
  if (!cachedJournalFaviconBytes) {
    try {
      cachedJournalFaviconBytes = await fs.readFile(JOURNAL_FAVICON_PATH)
    } catch {
      try {
        cachedJournalFaviconBytes = await fs.readFile(JOURNAL_FAVICON_FALLBACK_PATH)
      } catch {
        cachedJournalFaviconBytes = null
      }
    }
  }

  if (!cachedJournalFaviconBytes) return null

  try {
    return await doc.embedPng(cachedJournalFaviconBytes)
  } catch {
    return null
  }
}

/**
 * Stamps the Journal favicon logo on the top right side of page 1,
 * positioned above the journal name and above the Crossref logo.
 *
 * @param {PDFDocument} doc - The PDF document
 * @param {any} page1 - The first page of the PDF document
 * @param {Object} [options] - Optional positioning overrides
 * @returns {Promise<boolean>} Whether the logo was stamped
 */
export async function stampJournalLogoOnPage1(doc, page1, options = {}) {
  if (!doc || !page1) return false

  const journalImg = await embedJournalFaviconLogo(doc)
  if (!journalImg) return false

  const { width, height } = page1.getSize()
  const margin = 36 // 0.5 in side margin
  const jSize = typeof options.journalLogoSize === 'number' ? options.journalLogoSize : 54 // increased to 54 pt for enhanced prominence
  const topOffset = typeof options.journalLogoTopOffset === 'number'
    ? options.journalLogoTopOffset
    : (margin + jSize) // 90 pt on standard A4 (top edge aligns with 36 pt top margin)
  const jX = width - margin - jSize // 505.28 pt on standard A4
  const jY = height - topOffset // 751.89 pt (top at 805.89 pt, >6 pt above journal title)

  page1.drawImage(journalImg, {
    x: jX,
    y: jY,
    width: jSize,
    height: jSize,
  })

  return true
}

/**
 * Wipes/removes the existing Crossref badge icon by drawing a clean white rectangle,
 * stamps the new Crossref logo (from metadata-from-crossref-logo-200.svg) slightly downside
 * safely below the journal name, stamps the Journal logo in the top right corner,
 * and attaches an interactive clickable Link annotation pointing to the canonical DOI URL.
 *
 * @param {PDFDocument} doc - The PDF document
 * @param {any} page1 - The first page of the PDF document
 * @param {string} [doiUrl] - Canonical DOI URL (e.g. https://doi.org/10.68968/...)
 * @param {Object} [options] - Optional layout settings (e.g. { yOffset: number, stampJournalLogo: boolean })
 * @returns {Promise<boolean>} Whether the logo was stamped
 */
export async function stampCrossrefLogoOnPage1(doc, page1, doiUrl = null, options = {}) {
  if (!doc || !page1) return false

  const { width, height } = page1.getSize()
  const margin = 36 // 0.5 in side margin

  // 1. Stamp the Journal logo in the top right corner above the journal title and Crossref logo
  if (options.stampJournalLogo !== false) {
    await stampJournalLogoOnPage1(doc, page1, options)
  }

  const logoW = 82
  const logoH = 82 / (200 / 67.9) // ~27.84 pt (preserves exact SVG aspect ratio)
  const logoX = width - margin - logoW // 477.28 pt on standard A4
  // Positioned slightly downside (158 pt from top -> y = 683.89 pt, top at 711.73 pt)
  // to ensure generous clearance below the enlarged "INTERNATIONAL JOURNAL OF INTELLIGENT DIGITAL COMPUTING RESEARCH (IJIDCR)" header
  const yOffset = typeof options.yOffset === 'number' ? options.yOffset : 158
  const logoY = height - yOffset

  const crossrefImg = await embedCrossrefLogo(doc)
  if (crossrefImg) {
    // 2. Wipe/remove any underlying text/artefacts with a clean white rectangle safeguard
    page1.drawRectangle({
      x: logoX - 4,
      y: logoY - 3,
      width: logoW + 8,
      height: logoH + 6,
      color: rgb(1, 1, 1),
    })

    // 3. Draw the new Crossref logo image
    page1.drawImage(crossrefImg, {
      x: logoX,
      y: logoY,
      width: logoW,
      height: logoH,
    })
  }

  // 4. Attach interactive clickable Link annotation over the logo area if DOI URL is provided
  if (doiUrl && typeof doiUrl === 'string') {
    const linkAnnot = doc.context.obj({
      Type: PDFName.of('Annot'),
      Subtype: PDFName.of('Link'),
      Rect: [logoX, logoY, logoX + logoW, logoY + logoH],
      Border: [0, 0, 0],
      C: [0, 0, 0],
      A: {
        Type: PDFName.of('Action'),
        S: PDFName.of('URI'),
        URI: PDFString.of(doiUrl),
      },
    })
    const linkRef = doc.context.register(linkAnnot)
    page1.node.addAnnot(linkRef)
  }

  return true
}




