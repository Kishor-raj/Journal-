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
  // Generate QR code with the unique per-certificate verification URL
  const qrTargetUrl = context.verificationUrl || 'https://ijidcr-asgard.in/'
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
    // Strip any existing quotation marks (straight or curly) from the title
    let articleTitle     = rawTitle
      .replace(/^[\u201c\u201d"']+/, '')
      .replace(/[\u201c\u201d"']+$/, '')
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

    // ── Certificate Number (top-left, next to "CERTIFICATE NO:" label) ──
    if (certNo && certNo !== '-') {
      doc.font('Helvetica-Bold').fontSize(8.5).fillColor(NAVY)
      doc.text(certNo, 118, 32.5, { lineBreak: false })
    }

    // ── Author Name (centered, ~Y 290 -> 328) ──────────────────────────
    drawCenteredSlot(doc, authorName, 292, 328, {
      font: 'Times-BoldItalic',
      size: 22,
      color: NAVY,
      maxWidth: 520,
      minSize: 13,
      maxLines: 1,
      verticalPadding: 2,
      characterSpacing: 0.8,
    })

    // ── Article Title (centered, ~Y 354 -> 410) ────────────────────────
    drawCenteredSlot(doc, articleTitle, 354, 410, {
      font: 'Times-Bold',
      size: 13.5,
      color: NAVY,
      maxWidth: 540,
      minSize: 8.5,
      maxLines: 3,
      lineHeightFactor: 1.15,
      verticalPadding: 2,
      characterSpacing: 0.6,
    })

    // ── Volume / Issue / Year (render with underlined value slots) ──────
    const volFontSize = 11
    const lineThickness = 0.75
    const slotWidth = 55          // width of each underline slot
    const slotPad = 3             // padding between label text and slot
    const baseY = 418             // text baseline Y
    const underlineY = baseY + volFontSize + 2  // underline sits just below text

    doc.font('Times-Roman').fontSize(volFontSize).fillColor(NAVY)

    // Build segments: "in Volume" ___1___ ", Issue" ___1___ ", Year" ___2026___
    const segments = [
      { label: 'in Volume ', value: String(volume) },
      { label: ', Issue ',   value: String(issue) },
      { label: ', Year ',    value: String(year) },
    ]

    // Calculate total width for centering
    let totalWidth = 0
    for (const seg of segments) {
      totalWidth += doc.widthOfString(seg.label) + slotWidth
    }

    let cursorX = (PAGE_W - totalWidth) / 2

    for (const seg of segments) {
      // Draw label text
      const labelW = doc.widthOfString(seg.label)
      doc.text(seg.label, cursorX, baseY, { lineBreak: false })
      cursorX += labelW

      // Draw underline
      doc.save()
        .lineWidth(lineThickness)
        .strokeColor(NAVY)
        .moveTo(cursorX, underlineY)
        .lineTo(cursorX + slotWidth, underlineY)
        .stroke()
        .restore()

      // Draw value centered within the slot
      const valW = doc.widthOfString(seg.value)
      doc.text(seg.value, cursorX + (slotWidth - valW) / 2, baseY, { lineBreak: false })
      cursorX += slotWidth
    }

    // ── QR Code (right side, inside golden frame) ───────────────────────
    const qrSize = 78
    const qrX    = 709
    const qrY    = 236
    doc.image(qrBuffer, qrX, qrY, { width: qrSize, height: qrSize })

    // ── Article ID (bottom-left, next to "ARTICLE ID:" label) ───────────
    const articleIdText = String(articleNo || '').trim()
    if (articleIdText && articleIdText !== '-') {
      doc.font('Helvetica-Bold').fontSize(8.5).fillColor(NAVY)
      doc.text(articleIdText, 233, 569.5, { lineBreak: false })
    }

    doc.end()
  })
}

