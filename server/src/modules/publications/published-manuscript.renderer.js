import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'
import { promises as fs } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const FALLBACK_LOGO_PATH = path.join(__dirname, '../../assets/journal-logo.png')

// Design system colors
const NAVY = rgb(11 / 255, 27 / 255, 58 / 255)
const GOLD = rgb(196 / 255, 162 / 255, 76 / 255)
const MUTED = rgb(90 / 255, 101 / 255, 114 / 255)
const RULE_GREY = rgb(209 / 255, 213 / 255, 219 / 255)

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
 * Stamps publication-ready branding headers and footers onto a PDF.
 *
 * @param {Object} params
 * @param {Buffer} params.pdfBuffer - The source PDF buffer (unbranded)
 * @param {Object} params.journal - Journal metadata (name, publisher, issns, website_url)
 * @param {Object} params.manuscript - Manuscript record (submission_number, title)
 * @param {Object} params.publication - Publication record (volume, issue, year)
 * @param {string} params.certificateNumber - Reused certificate number
 * @param {Buffer} [params.logoBuffer] - Optional logo buffer
 * @returns {Promise<Buffer>} The branded, publication-ready PDF buffer
 */
export async function renderBrandedManuscriptPdf({
  pdfBuffer,
  journal = {},
  manuscript = {},
  publication = {},
  certificateNumber,
  logoBuffer = null,
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

  const fontRegular = await doc.embedFont(StandardFonts.Helvetica)
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold)
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
          size: 8.5,
          font: fontBold,
          color: NAVY,
        })
        titleY -= 9.5
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

      // Separator rule
      const sepY = Math.min(lineY - 2, height - 48)
      page.drawLine({
        start: { x: margin, y: sepY },
        end: { x: width - margin, y: sepY },
        thickness: 0.75,
        color: GOLD,
      })
    } else {
      // ══════════════════════════════════════════════════════════════════════
      // PAGE 2+ — COMPACT RUNNING HEADER
      // ══════════════════════════════════════════════════════════════════════
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
      const journalRunningText = compactIssn
        ? `${journalShortName} | ${compactIssn}`
        : journalShortName

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

      // Separator rule
      page.drawLine({
        start: { x: margin, y: height - 28 },
        end: { x: width - margin, y: height - 28 },
        thickness: 0.5,
        color: RULE_GREY,
      })
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
