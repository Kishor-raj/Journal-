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
function wrapLines(doc, words, maxWidth) {
  const lines = []
  let current = ''
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word
    if (doc.widthOfString(candidate) <= maxWidth) {
      current = candidate
    } else {
      if (current) lines.push(current)
      current = word
    }
  }
  if (current) lines.push(current)
  return lines
}

function fitText(doc, text, maxWidth, startSize, minSize, fontName) {
  const words = String(text ?? '').trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return { lines: [], size: startSize }

  for (let size = startSize; size >= minSize; size -= 1) {
    doc.font(fontName).fontSize(size)
    const lines = wrapLines(doc, words, maxWidth)
    const tooWide = lines.some((line) => doc.widthOfString(line) > maxWidth + 0.5)
    if (!tooWide) return { lines, size }
  }

  doc.font(fontName).fontSize(minSize)
  return { lines: wrapLines(doc, words, maxWidth), size: minSize }
}

/** Draw centred text; returns the Y after the last line */
function drawCenteredText(doc, text, y, opts = {}) {
  const { font = 'Helvetica', size = 11, color = INK, maxWidth = 560, minSize } = opts
  const { lines, size: usedSize } = fitText(doc, text, maxWidth, size, Math.max(6, minSize ?? size - 6), font)
  doc.font(font).fontSize(usedSize).fillColor(color)
  let cursorY = y
  for (const line of lines) {
    const width = doc.widthOfString(line)
    doc.text(line, (PAGE_W - width) / 2, cursorY)
    cursorY += usedSize * 1.22
  }
  return cursorY
}

/** Draw left-aligned text; returns the Y after the last line */
function drawLeftText(doc, text, x, y, opts = {}) {
  const { font = 'Helvetica', size = 11, color = INK, maxWidth = 320 } = opts
  const { lines, size: usedSize } = fitText(doc, text, maxWidth, size, Math.max(6, size - 4), font)
  doc.font(font).fontSize(usedSize).fillColor(color)
  let cursorY = y
  for (const line of lines) {
    doc.text(line, x, cursorY)
    cursorY += usedSize * 1.25
  }
  return cursorY
}

function formatDate(value) {
  if (!value) return ''
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return String(value)
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
}

/* ─── main export ──────────────────────────────────────────────────────── */
export async function renderCertificatePdf(context) {
  // Generate QR code
  const qrBuffer = await QRCode.toBuffer(context.verificationUrl || 'https://ijidcr-asgard.vercel.app/verify', {
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
    const authorName      = context.authorName      || 'Author Name'
    const articleTitle    = context.articleTitle    || 'Untitled Article'
    const volume          = context.volume          ?? 1
    const issue           = context.issue           ?? 1
    const year            = context.year            ?? new Date().getFullYear()
    const certNo          = context.certificateNumber || '-'
    const articleNo       = context.submissionNumber  || '-'
    const publicationDate = formatDate(context.publicationDate)
    const doi             = context.doi
    const issn            = context.issn
    const verifyUrl       = context.verificationUrl || 'www.ijidcr.com/verify'

    // ── Step 1: Draw template as full-page background ───────────────────
    if (existsSync(TEMPLATE_PATH)) {
      doc.image(TEMPLATE_PATH, 0, 0, { width: PAGE_W, height: PAGE_H })
    }

    // ── Step 2: Overlay dynamic data ────────────────────────────────────

    // ── Author Name ─────────────────────────────────────────────────────
    // Template "This is to certify that" is at ~y260. Blank zone is ~y290-315.
    drawCenteredText(doc, authorName, 292, {
      font: 'Times-Bold',
      size: 22,
      color: NAVY,
      maxWidth: 500,
      minSize: 12,
    })

    // ── Article Title ────────────────────────────────────────────────────
    // Template "has published a research paper entitled" is at ~y355.
    // Blank zone is ~y375-400. Place title there.
    drawCenteredText(doc, `"${articleTitle}"`, 370, {
      font: 'Times-BoldItalic',
      size: 14,
      color: NAVY,
      maxWidth: 540,
      minSize: 9,
    })

    // ── Volume / Issue / Year: Cover only the placeholder line ────────
    doc.rect(260, 392, 322, 22).fillColor('#FFFFFF').fill()

    drawCenteredText(doc, `in Volume ${volume},  Issue ${issue},  Year ${year}`, 396, {
      font: 'Helvetica-Bold',
      size: 11.5,
      color: NAVY,
      maxWidth: 400,
    })

    // ── QR Code (bottom-left — precisely over the template placeholder) ──
    const qrSize = 76
    const qrX    = 48
    const qrY    = 428
    doc.image(qrBuffer, qrX, qrY, { width: qrSize, height: qrSize })

    // ── Top-right: Certificate No (replacing Article ID) ─────────────────
    if (certNo && certNo !== '-') {
      const certLabel = `Certificate No.: ${certNo}`
      doc.font('Helvetica-Bold').fontSize(8).fillColor(NAVY)
      const certW = doc.widthOfString(certLabel)
      doc.text(certLabel, PAGE_W - 30 - certW, 22)
    }

    doc.end()
  })
}