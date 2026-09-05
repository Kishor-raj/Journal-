import PDFDocument from 'pdfkit'
import QRCode from 'qrcode'

const PAGE_W = 842
const PAGE_H = 595

const NAVY = '#0B1B3A'
const GOLD = '#C4A24C'
const MUTED = '#5A6572'
const INK = '#1A2A3A'

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

function drawCenteredText(doc, text, y, opts = {}) {
  const { font = 'Helvetica', size = 11, color = INK, maxWidth = 700, minSize = size - 6 } = opts
  const { lines, size: usedSize } = fitText(doc, text, maxWidth, size, Math.max(6, minSize), font)
  doc.font(font).fontSize(usedSize).fillColor(color)
  let cursorY = y
  for (const line of lines) {
    const width = doc.widthOfString(line)
    doc.text(line, (PAGE_W - width) / 2, cursorY)
    cursorY += usedSize * 1.22
  }
  return cursorY
}

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

function drawRightText(doc, text, xFromRight, y, opts = {}) {
  const { font = 'Helvetica', size = 11, color = INK, maxWidth = 340 } = opts
  const { lines, size: usedSize } = fitText(doc, text, maxWidth, size, Math.max(6, size - 4), font)
  doc.font(font).fontSize(usedSize).fillColor(color)
  let cursorY = y
  for (const line of lines) {
    const width = doc.widthOfString(line)
    doc.text(line, PAGE_W - xFromRight - width, cursorY)
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

export async function renderCertificatePdf(context) {
  const qrBuffer = await QRCode.toBuffer(context.verificationUrl || 'https://www.ijidcr.com/verify', {
    type: 'png',
    width: 240,
    margin: 1,
    errorCorrectionLevel: 'M',
  })

  return new Promise((resolve, _reject) => {
    const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 0 })
    const chunks = []
    doc.on('data', (chunk) => chunks.push(chunk))
    doc.on('end', () => resolve(Buffer.concat(chunks)))

    const journalShort = context.journalShortName || 'IJIDCR'
    const journalName = context.journalName || 'Journal'
    const publisherName = context.publisherName || ''
    const volume = context.volume ?? 1
    const issue = context.issue ?? 1
    const year = context.year ?? new Date().getFullYear()
    const verifyUrl = context.verificationUrl || ''
    const articleNo = context.submissionNumber || '-'
    const certNo = context.certificateNumber || '-'
    const authorName = context.authorName || 'Author Name'
    const articleTitle = context.articleTitle || 'Untitled Article'
    const publicationDate = formatDate(context.publicationDate)

    drawCertificate(doc, {
      journalShort,
      journalName,
      publisherName,
      volume,
      issue,
      year,
      verifyUrl,
      articleNo,
      certNo,
      authorName,
      articleTitle,
      publicationDate,
      doi: context.doi,
      issn: context.issn,
      qrBuffer,
    })
    doc.end()
  })
}

function drawCertificate(doc, data) {
  const {
    journalShort,
    journalName,
    publisherName,
    volume,
    issue,
    year,
    verifyUrl,
    articleNo,
    certNo,
    authorName,
    articleTitle,
    publicationDate,
    doi,
    issn,
    qrBuffer,
  } = data

  // Outer border
  doc.lineWidth(2.5).strokeColor(NAVY).rect(18, 18, PAGE_W - 36, PAGE_H - 36).stroke()

  // Inner border
  doc.lineWidth(1).strokeColor(GOLD).rect(26, 26, PAGE_W - 52, PAGE_H - 52).stroke()

  // Corner accents
  drawCornerAccent(doc, 26, 26)
  drawCornerAccent(doc, PAGE_W - 26, 26)
  drawCornerAccent(doc, 26, PAGE_H - 26)
  drawCornerAccent(doc, PAGE_W - 26, PAGE_H - 26)

  // Top metadata
  if (issn) drawLeftText(doc, `ISSN: ${issn}`, 60, 48, { font: 'Helvetica', size: 9, color: MUTED, maxWidth: 280 })
  drawRightText(doc, 'Certificate of Publication', PAGE_W - 60, 48, { font: 'Helvetica', size: 9, color: MUTED, maxWidth: 300 })

  // Journal branding
  drawCenteredText(doc, journalShort, 84, { font: 'Helvetica-Bold', size: 18, color: GOLD, maxWidth: 620 })
  drawCenteredText(doc, journalName, 112, { font: 'Helvetica-Bold', size: 14, color: NAVY, maxWidth: 660, minSize: 10 })
  if (publisherName) drawCenteredText(doc, publisherName, 134, { font: 'Helvetica', size: 10.5, color: MUTED, maxWidth: 660, minSize: 8 })

  // Title
  drawCenteredText(doc, 'CERTIFICATE', 176, { font: 'Helvetica-Bold', size: 36, color: NAVY, maxWidth: 560 })
  drawCenteredText(doc, 'OF PUBLICATION', 216, { font: 'Helvetica-Bold', size: 15, color: GOLD, maxWidth: 520 })

  // Divider
  doc.lineWidth(1).strokeColor(GOLD).moveTo((PAGE_W - 340) / 2, 244).lineTo((PAGE_W + 340) / 2, 244).stroke()

  // Body
  drawCenteredText(doc, 'This is to certify that', 262, { font: 'Helvetica', size: 13, color: MUTED, maxWidth: 500 })
  drawCenteredText(doc, authorName, 288, { font: 'Times-Bold', size: 28, color: NAVY, maxWidth: 640, minSize: 16 })

  drawCenteredText(doc, 'has published the following research article in', 330, { font: 'Helvetica', size: 12.5, color: INK, maxWidth: 600 })

  drawCenteredText(doc, `"${articleTitle}"`, 354, {
    font: 'Times-Italic',
    size: 14,
    color: INK,
    maxWidth: 720,
    minSize: 10,
  })

  drawCenteredText(doc, `Published in ${journalName}`, 388, { font: 'Helvetica', size: 12, color: INK, maxWidth: 640 })
  if (publisherName) {
    drawCenteredText(doc, `Volume ${volume}  |  Issue ${issue}  |  ${year}  |  ${publisherName}`, 410, {
      font: 'Helvetica',
      size: 10.5,
      color: MUTED,
      maxWidth: 660,
      minSize: 8,
    })
  } else {
    drawCenteredText(doc, `Volume ${volume}  |  Issue ${issue}  |  ${year}`, 410, {
      font: 'Helvetica',
      size: 10.5,
      color: MUTED,
      maxWidth: 660,
      minSize: 8,
    })
  }

  // Divider before details
  doc.lineWidth(0.75).strokeColor(MUTED).moveTo(120, 432).lineTo(PAGE_W - 160, 432).stroke()

  // Details row
  drawLeftText(doc, `Article No.: ${articleNo}`, 120, 442, { font: 'Helvetica-Bold', size: 11, color: NAVY, maxWidth: 330 })
  if (doi) drawLeftText(doc, `DOI: ${doi}`, 120, 458, { font: 'Helvetica', size: 9.5, color: MUTED, maxWidth: 330 })
  if (publicationDate) drawRightText(doc, `Publication Date: ${publicationDate}`, PAGE_W - 120, 442, { font: 'Helvetica-Bold', size: 11, color: NAVY, maxWidth: 330 })

  drawCenteredText(doc, `Certificate No.: ${certNo}`, 478, { font: 'Helvetica-Bold', size: 12.5, color: NAVY, maxWidth: 560, minSize: 10 })

  // QR block (right)
  const qrSize = 104
  const qrX = PAGE_W - 160
  const qrY = 316
  doc.image(qrBuffer, qrX, qrY, { width: qrSize })
  doc.font('Helvetica').fontSize(7).fillColor(MUTED)
  const qrCaption = verifyUrl.replace(/^https?:\/\//, '')
  const qrLines = wrapLines(doc, String(qrCaption || 'scan to verify').split(/\s+/), 120)
  let captionY = qrY + qrSize + 4
  for (const line of qrLines.slice(0, 3)) {
    const w = doc.widthOfString(line)
    doc.text(line, qrX + (qrSize - w) / 2, captionY)
    captionY += 8
  }
  doc.font('Helvetica-Bold').fontSize(7.5).fillColor(NAVY)
  const verifyLabel = 'Scan to Verify'
  const vlW = doc.widthOfString(verifyLabel)
  doc.text(verifyLabel, qrX + (qrSize - vlW) / 2, qrY - 12)

  // Signatures
  drawSignatureArea(doc, 'Editor-in-Chief', 150)
  drawSignatureArea(doc, 'Founder & Director', PAGE_W - 150 - 140)

  // Disclaimer footer
  const disclaimer =
    'This certificate is electronically generated and is valid as an official record of publication. ' +
    'Please verify authenticity using the QR code or the verification link printed above.'
  let footerY = 534
  doc.font('Helvetica').fontSize(7.5).fillColor(MUTED)
  const footerLines = wrapLines(doc, disclaimer.split(/\s+/), 700)
  for (const line of footerLines) {
    const w = doc.widthOfString(line)
    doc.text(line, (PAGE_W - w) / 2, footerY)
    footerY += 9
  }
}

function drawCornerAccent(doc, x, y) {
  doc.save()
  doc.lineWidth(2).strokeColor(GOLD)
  const length = 26
  const signX = x <= 26 ? 1 : -1
  const signY = y <= 26 ? 1 : -1
  doc.moveTo(x + signX * length, y + signY * length)
  doc.lineTo(x + signX * length, y)
  doc.lineTo(x + signX * length * 0.4, y)
  doc.stroke()
  doc.moveTo(x + signX * length, y + signY * length)
  doc.lineTo(x, y + signY * length)
  doc.lineTo(x, y + signY * length * 0.4)
  doc.stroke()
  doc.restore()
}

function drawSignatureArea(doc, label, x) {
  const lineStart = x
  const lineEnd = x + 140
  const y = 506
  doc.lineWidth(0.75).strokeColor(MUTED).moveTo(lineStart, y).lineTo(lineEnd, y).stroke()
  const labelWidth = doc.font('Helvetica').fontSize(10).widthOfString(label)
  doc.fillColor(NAVY).text(label, x + (140 - labelWidth) / 2, y + 4)
}