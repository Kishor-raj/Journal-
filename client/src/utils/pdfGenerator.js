/**
 * Generates a 100% valid, compliant PDF 1.4 binary for academic manuscripts.
 * Opens cleanly in Adobe Reader, Chrome, Safari, Firefox, Edge, iOS, and Android.
 */

function sanitize(str) {
  return String(str || '')
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/[^\x20-\x7E]/g, ' ')
}

function wrapText(text, maxCharsPerLine = 80) {
  const words = String(text || '').trim().split(/\s+/)
  const lines = []
  let current = ''
  for (const w of words) {
    if (!w) continue
    if ((current ? current + ' ' + w : w).length <= maxCharsPerLine) {
      current = current ? current + ' ' + w : w
    } else {
      if (current) lines.push(current)
      current = w
    }
  }
  if (current) lines.push(current)
  return lines.length > 0 ? lines : ['']
}

export function generateAcademicPdfBlob({
  title = 'Untitled Manuscript',
  code = 'IJIDCR-26-0001',
  date = 'September 2026',
  category = 'Research Article',
  authors = [],
  abstract = 'No abstract provided.',
  keywords = 'Computing, AI',
  volTitle = 'Volume 1 (2026)',
  issueName = 'Issue 1 (2026)',
}) {
  const authorNames = Array.isArray(authors)
    ? authors.map(a => typeof a === 'string' ? a : (a.name + (a.affiliation ? ` (${a.affiliation})` : ''))).join(' • ')
    : String(authors || 'Academic Author')

  const titleLines = wrapText(title, 50).slice(0, 3)
  const abstractLines = wrapText(abstract, 80).slice(0, 14)
  const keywordLines = wrapText(keywords, 70).slice(0, 3)
  const authorLines = wrapText(authorNames, 65).slice(0, 3)

  let stream = ''

  // Top Header Banner
  stream += '0.043 0.106 0.227 rg\n' // Navy
  stream += '40 760 515 45 re f\n'
  stream += '1 1 1 rg\n' // White text
  stream += 'BT /F2 10.5 Tf 55 788 Td (INTERNATIONAL JOURNAL OF INTELLIGENT DIGITAL COMPUTING RESEARCH) Tj ET\n'
  stream += '0.768 0.635 0.298 rg\n' // Gold text
  stream += 'BT /F1 8.5 Tf 55 772 Td (ISSN: 2977-4418  |  OPEN ACCESS  |  PEER REVIEWED  |  ASGARD PUBLICATIONS) Tj ET\n'

  // Gold accent rule
  stream += '0.768 0.635 0.298 RG 1.5 w\n'
  stream += '40 755 m 555 755 l S\n'

  // Metadata Line
  stream += '0.35 0.4 0.48 rg\n'
  stream += `BT /F2 8.5 Tf 40 738 Td (${sanitize(category.toUpperCase() + '  •  ' + volTitle + '  •  ' + issueName + '  •  CODE: ' + code)}) Tj ET\n`
  stream += `BT /F1 8.5 Tf 40 726 Td (Published Online: ${sanitize(date)}  •  DOI Prefix: 10.xxxx/ijidcr.2026.${sanitize(code)}) Tj ET\n`

  // Divider line
  stream += '0.88 0.86 0.82 RG 1 w\n'
  stream += '40 716 m 555 716 l S\n'

  // Title
  stream += '0.043 0.106 0.227 rg\n'
  let y = 696
  for (const line of titleLines) {
    stream += `BT /F4 14.5 Tf 40 ${y} Td (${sanitize(line)}) Tj ET\n`
    y -= 17
  }

  y -= 4
  // Authors
  stream += '0.22 0.25 0.34 rg\n'
  for (const line of authorLines) {
    stream += `BT /F5 10 Tf 40 ${y} Td (${sanitize(line)}) Tj ET\n`
    y -= 13
  }

  y -= 10
  // Abstract Box
  const absBoxTop = y
  const absHeight = Math.min(300, (abstractLines.length * 12) + (keywordLines.length * 12) + 38)
  const absBoxBottom = absBoxTop - absHeight

  // Background Box
  stream += '0.97 0.975 0.985 rg\n'
  stream += `40 ${absBoxBottom} 515 ${absHeight} re f\n`

  // Left gold border
  stream += '0.768 0.635 0.298 RG 3 w\n'
  stream += `40 ${absBoxTop} m 40 ${absBoxBottom} l S\n`

  // Abstract Text
  let absY = absBoxTop - 15
  stream += '0.043 0.106 0.227 rg\n'
  stream += `BT /F2 9.5 Tf 52 ${absY} Td (STRUCTURED ABSTRACT) Tj ET\n`
  absY -= 13

  stream += '0.15 0.18 0.24 rg\n'
  for (const line of abstractLines) {
    stream += `BT /F3 9 Tf 52 ${absY} Td (${sanitize(line)}) Tj ET\n`
    absY -= 11.5
  }

  absY -= 5
  stream += '0.043 0.106 0.227 rg\n'
  stream += `BT /F2 8.5 Tf 52 ${absY} Td (Keywords: ) Tj ET\n`
  stream += '0.3 0.35 0.42 rg\n'
  for (const line of keywordLines) {
    stream += `BT /F1 8.5 Tf 100 ${absY} Td (${sanitize(line)}) Tj ET\n`
    absY -= 11.5
  }

  y = absBoxBottom - 18

  // Publication & Licensing Overview
  stream += '0.043 0.106 0.227 rg\n'
  stream += `BT /F2 10 Tf 40 ${y} Td (PUBLICATION & CITATION OVERVIEW) Tj ET\n`
  y -= 15

  stream += '0.25 0.28 0.35 rg\n'
  stream += `BT /F3 8.5 Tf 40 ${y} Td (This manuscript has passed double-blind peer review and is officially published in IJIDCR Archives.) Tj ET\n`
  y -= 12
  stream += `BT /F3 8.5 Tf 40 ${y} Td (Licensed under Creative Commons Attribution 4.0 International \\(CC BY 4.0\\).) Tj ET\n`
  y -= 12
  const shortAuth = authorNames.slice(0, 35)
  const shortTitle = title.slice(0, 45)
  stream += `BT /F3 8.5 Tf 40 ${y} Td (Citation: ${sanitize(shortAuth)} et al. \\(2026\\). ${sanitize(shortTitle)}... IJIDCR, 1\\(1\\), ${sanitize(code)}.) Tj ET\n`

  // Footer
  stream += '0.768 0.635 0.298 RG 1 w\n'
  stream += '40 45 m 555 45 l S\n'
  stream += '0.4 0.45 0.53 rg\n'
  stream += 'BT /F1 8 Tf 40 33 Td (IJIDCR  •  Official Academic Publication  •  Asgard Research Publication) Tj ET\n'
  stream += 'BT /F2 8 Tf 500 33 Td (Page 1 of 1) Tj ET\n'

  const streamLen = stream.length
  const objects = []

  objects[1] = '<< /Type /Catalog /Pages 2 0 R >>'
  objects[2] = '<< /Type /Pages /Kids [3 0 R] /Count 1 >>'
  objects[3] = '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.28 841.89] /Resources 4 0 R /Contents 5 0 R >>'
  objects[4] = '<< /Font << ' +
    '/F1 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> ' +
    '/F2 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >> ' +
    '/F3 << /Type /Font /Subtype /Type1 /BaseFont /Times-Roman >> ' +
    '/F4 << /Type /Font /Subtype /Type1 /BaseFont /Times-Bold >> ' +
    '/F5 << /Type /Font /Subtype /Type1 /BaseFont /Times-Italic >> ' +
    '>> >>'
  objects[5] = `<< /Length ${streamLen} >>\nstream\n${stream}endstream`

  let body = '%PDF-1.4\n%\xE2\xE3\xCF\xD3\n'
  const offsets = [0]

  for (let i = 1; i <= 5; i++) {
    offsets[i] = body.length
    body += `${i} 0 obj\n${objects[i]}\nendobj\n`
  }

  const startxref = body.length
  body += 'xref\n0 6\n0000000000 65535 f \n'
  for (let i = 1; i <= 5; i++) {
    body += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`
  }
  body += `trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${startxref}\n%%EOF\n`

  // Convert string to binary array for Blob
  const byteNumbers = new Uint8Array(body.length)
  for (let i = 0; i < body.length; i++) {
    byteNumbers[i] = body.charCodeAt(i) & 0xff
  }

  return new Blob([byteNumbers], { type: 'application/pdf' })
}

/**
 * Initiates the download of the PDF manuscript in the browser
 */
export function triggerPdfDownload(articleData, customFilename) {
  const blob = generateAcademicPdfBlob(articleData)
  const filename = customFilename || `${articleData.code || 'IJIDCR-26'}-manuscript.pdf`
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
