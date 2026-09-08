import PDFDocument from 'pdfkit'
import QRCode from 'qrcode'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { existsSync } from 'fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Template image path
const TEMPLATE_PATH = join(__dirname, '../../assets/certificate-template.png')

const PAGE_W = 842   // A4 landscape width  (pts)
const PAGE_H = 595   // A4 landscape height (pts)

// Brand colours (for text overlays)
const NAVY  = '#0B1B3A'
const GOLD  = '#C4A24C'
const MUTED = '#5A6572'
const INK   = '#1A2A3A'

/* ─── helpers ──────────────────────────────────────────────────────────── */
function wrapLines(doc, words, maxWidth, characterSpacing = 0) {
  const lines = []
  let current = ''
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word
    if (doc.widthOfString(candidate, { characterSpacing }) <= maxWidth) {
      current = candidate
    } else {
      if (current) lines.push(current)
      current = word
    }
  }
  if (current) lines.push(current)
  return lines
}

function fitTextSlot(doc, text, maxWidth, maxHeight, startSize, minSize, fontName, maxLines = 2, lineHeightFactor = 1.15, characterSpacing = 0) {
  const words = String(text ?? '').trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return { lines: [], size: startSize }

  for (let size = startSize; size >= minSize; size -= 0.5) {
    doc.font(fontName).fontSize(size)
    const lines = wrapLines(doc, words, maxWidth, characterSpacing)
    const tooWide = lines.some((line) => doc.widthOfString(line, { characterSpacing }) > maxWidth + 0.5)
    const blockHeight = (lines.length - 1) * (size * lineHeightFactor) + size * 0.8
    if (!tooWide && lines.length <= maxLines && blockHeight <= maxHeight) {
      return { lines, size }
    }
  }

  doc.font(fontName).fontSize(minSize)
  return { lines: wrapLines(doc, words, maxWidth, characterSpacing).slice(0, maxLines), size: minSize }
}

/** Draw centred text within a vertical slot [slotTop, slotBottom] */
function drawCenteredSlot(doc, text, slotTop, slotBottom, opts = {}) {
  const {
    font = 'Times-Roman',
    size = 14,
    color = NAVY,
    maxWidth = 560,
    minSize = 8.5,
    maxLines = 2,
    lineHeightFactor = 1.15,
    verticalPadding = 2.5,
    yOffset = 0,
    characterSpacing = 0,
  } = opts

  const slotHeight = slotBottom - slotTop
  const availableHeight = slotHeight - verticalPadding * 2
  const { lines, size: usedSize } = fitTextSlot(
    doc,
    text,
    maxWidth,
    availableHeight,
    size,
    minSize,
    font,
    maxLines,
    lineHeightFactor,
    characterSpacing
  )
  if (lines.length === 0) return slotBottom

  doc.font(font).fontSize(usedSize).fillColor(color)

  const blockHeight = (lines.length - 1) * (usedSize * lineHeightFactor) + usedSize * 0.8
  let cursorY = slotTop + (slotHeight - blockHeight) / 2 + yOffset

  for (const line of lines) {
    const width = doc.widthOfString(line, { characterSpacing })
    doc.text(line, (PAGE_W - width) / 2, cursorY, { lineBreak: false, characterSpacing })
    cursorY += usedSize * lineHeightFactor
  }
  return cursorY
}

function formatDate(value) {
  if (!value) return ''
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return String(value)
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
}

export function toTitleCase(str) {
  return String(str ?? '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => {
      if (word.length <= 2 && word === word.toUpperCase()) return word
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    })
    .join(' ')
}

export function formatCertificateName(value) {
  const cleaned = String(value ?? '')
    .replace(/^for\s+/i, '')
    .replace(/\bundefined\b/gi, '')
    .replace(/\bnull\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim()

  if (!cleaned || cleaned.toLowerCase() === 'author' || cleaned.toLowerCase() === 'author name') {
    return 'Author'
  }

  // If text is all lowercase or all uppercase, convert to Title Case
  if (cleaned === cleaned.toLowerCase() || cleaned === cleaned.toUpperCase()) {
    return toTitleCase(cleaned)
  }

  return cleaned
}

/* ─── main export ──────────────────────────────────────────────────────── */
export async function renderCertificatePdf(context) {
  // Generate QR code with exact scanner verification domain
  const qrTargetUrl = 'https://ijidcr-asgard.in/'
  const qrBuffer = await QRCode.toBuffer(qrTargetUrl, {
    type: 'png',
    width: 200,
    margin: 1,
    errorCorrectionLevel: 'M',
    color: { dark: '#0B1B3A', light: '#FFFFFF' },
  })

  return new Promise((resolve, _reject) => {
    const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 0 })
    const chunks = []
    doc.on('data', (chunk) => chunks.push(chunk))
    doc.on('end', () => resolve(Buffer.concat(chunks)))

    // ── extract context fields ──────────────────────────────────────────
    const authorName     = formatCertificateName(context.authorName || 'Author Name')
    const rawTitle       = String(context.articleTitle || 'Untitled Article').trim()
    let articleTitle     = rawTitle
    if (articleTitle && !articleTitle.startsWith('“') && !articleTitle.startsWith('"') && !articleTitle.startsWith("'")) {
      articleTitle = `“${articleTitle}”`
    } else if (articleTitle.startsWith('"') && articleTitle.endsWith('"') && articleTitle.length > 1) {
      articleTitle = `“${articleTitle.slice(1, -1)}”`
    }
    articleTitle = articleTitle.toUpperCase()

    const volume         = context.volume ?? 1
    const issue          = context.issue ?? 1
    const year           = context.year ?? new Date().getFullYear()
    const certNo         = context.certificateNumber || '-'
    const articleNo      = context.submissionNumber || '-'
    const publicationDate = formatDate(context.publicationDate)
    const doi            = context.doi
    const issn           = context.issn

    // ── Step 1: Draw template as full-page background ───────────────────
    if (existsSync(TEMPLATE_PATH)) {
      doc.image(TEMPLATE_PATH, 0, 0, { width: PAGE_W, height: PAGE_H })
    }

    // ── Step 2: Overlay dynamic data with matched typography ────────────

    // ── Author Name (Slot 1: Y 290.6 -> 325.1) ───────────────────────────
    drawCenteredSlot(doc, authorName, 290.6, 325.1, {
      font: 'Times-Bold',
      size: 21,
      color: NAVY,
      maxWidth: 560,
      minSize: 12,
      maxLines: 1,
      verticalPadding: 3.5,
      yOffset: 2,
      characterSpacing: 1.2,
    })

    // ── Article Title (Slot 2: Y 353.7 -> 378.1) ──────────────────────────
    drawCenteredSlot(doc, articleTitle, 353.7, 378.1, {
      font: 'Times-Bold',
      size: 13.5,
      color: NAVY,
      maxWidth: 560,
      minSize: 8.5,
      maxLines: 2,
      lineHeightFactor: 1.15,
      verticalPadding: 2.5,
      characterSpacing: 0.8,
    })

    // ── Volume / Issue / Year (Cover placeholder and render dynamic text) ─
    doc.rect(300, 394, 242, 16).fillColor('#FFFFFF').fill()

    const volText = `in Volume ${volume},  Issue ${issue},  Year ${year}`
    doc.font('Times-Roman').fontSize(11).fillColor(NAVY)
    const volW = doc.widthOfString(volText)
    doc.text(volText, (PAGE_W - volW) / 2, 396, { lineBreak: false })

    // ── QR Code (bottom-left scanner pointing to www.ijidcr-asgard.in) ───
    const qrSize = 76
    const qrX    = 48
    const qrY    = 428
    doc.image(qrBuffer, qrX, qrY, { width: qrSize, height: qrSize })

    // ── Top-right: Certificate No. ──────────────────────────────────────
    const certBoxW = 170
    const certBoxH = 76
    const certBoxX = PAGE_W - 22 - certBoxW
    const certBoxY = 174
    if (certNo && certNo !== '-') {
      doc.save()
      doc.lineWidth(1.1)
      doc.roundedRect(certBoxX, certBoxY, certBoxW, certBoxH, 7)
      doc.fillAndStroke('#FBF6EA', GOLD)

      doc.font('Times-Bold').fontSize(9).fillColor(GOLD)
      doc.text('CERTIFICATE NO.', certBoxX + 14, certBoxY + 13, {
        width: certBoxW - 28,
        align: 'left',
        lineBreak: false,
      })
      doc.font('Times-Bold').fontSize(11.2).fillColor(NAVY)
      doc.text(certNo, certBoxX + 14, certBoxY + 29, {
        width: certBoxW - 28,
        align: 'left',
        lineBreak: false,
      })

      doc.moveTo(certBoxX + 14, certBoxY + 50).lineTo(certBoxX + certBoxW - 14, certBoxY + 50).stroke(GOLD)

      doc.font('Times-Bold').fontSize(9).fillColor(GOLD)
      doc.text('ARTICLE ID', certBoxX + 14, certBoxY + 54, {
        width: certBoxW - 28,
        align: 'left',
        lineBreak: false,
      })
      doc.font('Times-Bold').fontSize(11).fillColor(NAVY)
      doc.text(articleNo, certBoxX + 14, certBoxY + 67, {
        width: certBoxW - 28,
        align: 'left',
        lineBreak: false,
      })
      doc.restore()
    }

    doc.end()
  })
}
