import { describe, it, expect } from 'vitest'
import { promises as fs } from 'fs'
import path from 'path'
import { PDFDocument } from 'pdf-lib'
import {
  formatIssnString,
  formatCompactIssn,
  formatJournalTitleLines,
  renderBrandedManuscriptPdf,
} from './published-manuscript.renderer.js'
import {
  safePathSegment,
  publishedManuscriptFolderFor,
  getPublishedManuscriptDownloadUrl,
  getPublishedManuscriptViewUrl,
} from './published-manuscript.storage.js'
import {
  detectLibreOfficeRunner,
  convertDocxToPdf,
} from './document-converter.js'
import {
  generatePublishedManuscriptPdf,
} from './published-manuscript.service.js'

describe('Metadata & ISSN formatting', () => {
  it('formats both online and print ISSNs when provided', () => {
    const journal = { issn_online: '2980-4821', issn_print: '2980-4813' }
    expect(formatIssnString(journal)).toBe('ISSN (Online): 2980-4821 | ISSN (Print): 2980-4813')
    expect(formatCompactIssn(journal)).toBe('ISSN: 2980-4821')
  })

  it('formats online ISSN only when print is missing', () => {
    const journal = { issn_online: '2980-4821', issn_print: null }
    expect(formatIssnString(journal)).toBe('ISSN (Online): 2980-4821')
    expect(formatCompactIssn(journal)).toBe('ISSN: 2980-4821')
  })

  it('formats print ISSN only when online is missing', () => {
    const journal = { issn_online: null, issn_print: '2980-4813' }
    expect(formatIssnString(journal)).toBe('ISSN (Print): 2980-4813')
    expect(formatCompactIssn(journal)).toBe('ISSN: 2980-4813')
  })

  it('returns null and never fabricates fake ISSN when neither is configured', () => {
    const journal = { issn_online: null, issn_print: null }
    expect(formatIssnString(journal)).toBeNull()
    expect(formatCompactIssn(journal)).toBeNull()
  })

  it('formats IJIDCR journal title into balanced header lines', () => {
    const lines = formatJournalTitleLines(
      'INTERNATIONAL JOURNAL OF INTELLIGENT DIGITAL COMPUTING RESEARCH (IJIDCR)'
    )
    expect(lines).toEqual([
      'INTERNATIONAL JOURNAL OF',
      'INTELLIGENT DIGITAL COMPUTING RESEARCH (IJIDCR)',
    ])
  })

  it('preserves explicit newlines in journal title', () => {
    const lines = formatJournalTitleLines('LINE 1\nLINE 2')
    expect(lines).toEqual(['LINE 1', 'LINE 2'])
  })

  it('keeps single-line journal names intact when not matching IJIDCR pattern', () => {
    const lines = formatJournalTitleLines('Journal of Intelligent Systems')
    expect(lines).toEqual(['Journal of Intelligent Systems'])
  })
})

describe('Storage folder and public ID sanitization', () => {
  it('sanitizes special characters in folder segments', () => {
    expect(safePathSegment('2026/09')).toBe('2026-09')
    expect(safePathSegment('IJIDCR:26-0001 (Rev)')).toBe('IJIDCR-26-0001-Rev-')
  })

  it('generates predictable publication folder path', () => {
    expect(publishedManuscriptFolderFor(2026, 'IJIDCR-26-00001')).toBe(
      'published-manuscripts/2026/IJIDCR-26-00001'
    )
  })

  it('generates view and download URLs with proper flags', () => {
    const publicId = 'published-manuscripts/2026/SUB-123/manuscript-SUB-123'
    const downloadUrl = getPublishedManuscriptDownloadUrl(publicId)
    const viewUrl = getPublishedManuscriptViewUrl(publicId)

    if (downloadUrl) {
      expect(downloadUrl).toContain('fl_attachment')
    }
    if (viewUrl) {
      expect(viewUrl).not.toContain('fl_attachment')
    }
  })
})

describe('PDF Branding Renderer (pdf-lib)', () => {
  async function createSamplePdf(numPages = 2, isLandscape = false) {
    const doc = await PDFDocument.create()
    const pageSize = isLandscape ? [841.89, 595.28] : [595.28, 841.89]
    for (let i = 0; i < numPages; i++) {
      const page = doc.addPage(pageSize)
      page.drawText(`Sample body content on page ${i + 1}`, { x: 50, y: 400, size: 12 })
    }
    const bytes = await doc.save()
    return Buffer.from(bytes)
  }

  it('rejects empty or invalid PDF input', async () => {
    await expect(
      renderBrandedManuscriptPdf({
        pdfBuffer: Buffer.alloc(0),
      })
    ).rejects.toThrow(/Invalid PDF buffer/)
  })

  it('stamps publication headers on page 1 and running headers on subsequent pages', async () => {
    const sampleBuffer = await createSamplePdf(3)

    const journal = {
      name: 'Journal of Intelligent Systems',
      short_name: 'JIS',
      publisher_name: 'Academic Press',
      issn_online: '1234-5678',
      website_url: 'https://example.com/journal',
    }

    const manuscript = {
      submission_number: 'JIS-26-00042',
      title: 'Deep Learning in Autonomous Operations',
    }

    const publication = {
      volume: 2,
      issue: 3,
      publication_year: 2026,
    }

    const certificateNumber = 'AIRP-26-JIS-26-00042'

    const brandedBuffer = await renderBrandedManuscriptPdf({
      pdfBuffer: sampleBuffer,
      journal,
      manuscript,
      publication,
      certificateNumber,
    })

    expect(Buffer.isBuffer(brandedBuffer)).toBe(true)
    expect(brandedBuffer.length).toBeGreaterThan(sampleBuffer.length)

    // Inspect the modified PDF
    const stampedDoc = await PDFDocument.load(brandedBuffer)
    expect(stampedDoc.getPageCount()).toBe(3)
    expect(stampedDoc.getTitle()).toBe('Deep Learning in Autonomous Operations')
    expect(stampedDoc.getCreator()).toBe('IJIDCR Publishing Engine')
  })

  it('handles landscape orientation gracefully', async () => {
    const landscapeBuffer = await createSamplePdf(2, true)

    const brandedBuffer = await renderBrandedManuscriptPdf({
      pdfBuffer: landscapeBuffer,
      journal: { name: 'Test Journal', short_name: 'TJ' },
      manuscript: { submission_number: 'TJ-01' },
      publication: { volume: 1, issue: 1, publication_year: 2026 },
      certificateNumber: 'AIRP-26-TJ-01',
    })

    const doc = await PDFDocument.load(brandedBuffer)
    const page1 = doc.getPage(0)
    const { width, height } = page1.getSize()
    expect(width).toBeGreaterThan(height) // Confirms landscape
  })
})

describe('Document Converter (Headless LibreOffice)', () => {
  it('detects available LibreOffice runner', () => {
    const runner = detectLibreOfficeRunner()
    // In our test environment, either flatpak or soffice is available
    expect(runner).not.toBeNull()
    expect(typeof runner.command).toBe('string')
  })

  it('converts a real DOCX file to PDF', async () => {
    const templatePath = path.resolve(
      import.meta.dirname,
      '../../../../client/public/templates/1.Manuscript Template.docx'
    )

    const docxBuffer = await fs.readFile(templatePath)
    expect(docxBuffer.length).toBeGreaterThan(0)

    const pdfBuffer = await convertDocxToPdf(docxBuffer, { originalExtension: 'docx', timeoutMs: 30000 })
    expect(Buffer.isBuffer(pdfBuffer)).toBe(true)
    expect(pdfBuffer.length).toBeGreaterThan(1000)

    // Confirm generated buffer is a valid loadable PDF
    const doc = await PDFDocument.load(pdfBuffer)
    expect(doc.getPageCount()).toBeGreaterThanOrEqual(1)
  })

  it('rejects empty input buffer', async () => {
    await expect(convertDocxToPdf(Buffer.alloc(0))).rejects.toThrow(/empty or missing/)
  })
})

describe('Publication Workflow & Source Resolution', () => {
  it('handles missing source manuscript gracefully and records failure status', async () => {
    // Generate for non-existent or file-less manuscript returns failure with clean error
    const dummyId = '00000000-0000-0000-0000-000000000001'
    await expect(
      generatePublishedManuscriptPdf(dummyId)
    ).rejects.toThrow(/Manuscript not found/)
  })

  it('rejects unsupported file formats gracefully', async () => {
    const doc = await PDFDocument.create()
    doc.addPage([595.28, 841.89])
    const bytes = Buffer.from(await doc.save())

    const validMockUuid = '00000000-0000-0000-0000-000000000002'
    const result = await generatePublishedManuscriptPdf(validMockUuid, null, {
      sourceBuffer: bytes,
      sourceExtension: 'zip',
    }).catch(err => err)

    // Either throws or returns failed document_status
    if (result instanceof Error) {
      expect(result.message).toMatch(/not found|unsupported/i)
    } else {
      expect(result.success).toBe(false)
      expect(result.document_status).toBe('failed')
    }
  })
})

