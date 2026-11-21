import { describe, it, expect, vi } from 'vitest'
import { promises as fs } from 'fs'
import path from 'path'
import { PDFDocument, PDFName } from 'pdf-lib'
import {
  formatIssnString,
  formatCompactIssn,
  formatJournalTitleLines,
  renderBrandedManuscriptPdf,
  chunkAuthorsIntoPairs,
  getAuthorHeaderForPage,
  extractValidOrcid,
  findAuthorBoxesOnPage1,
  stampPublishedManuscriptHeadersAndOrcid,
  embedCrossrefLogo,
  stampCrossrefLogoOnPage1,
  embedJournalFaviconLogo,
  stampJournalLogoOnPage1,
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
  stampCrossrefLinkAnnotation,
} from './published-manuscript.service.js'

vi.mock('../../config/db.js', () => ({
  default: {
    query: vi.fn().mockResolvedValue({ rows: [] }),
    connect: vi.fn(),
  },
}))

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

  it('stamps canonical DOI URL on page 1 publication header when doi is present', async () => {
    const sampleBuffer = await createSamplePdf(2)
    const journal = { name: 'Journal of Intelligent Systems', short_name: 'JIS' }
    const manuscript = { submission_number: 'JIS-26-00042', title: 'Deep Learning' }
    const publication = { volume: 1, issue: 1, publication_year: 2026, doi: '10.68968/IJIDCR_00001' }

    const brandedBuffer = await renderBrandedManuscriptPdf({
      pdfBuffer: sampleBuffer,
      journal,
      manuscript,
      publication,
      certificateNumber: 'AIRP-26-JIS-26-00042',
    })

    expect(Buffer.isBuffer(brandedBuffer)).toBe(true)
    const stampedDoc = await PDFDocument.load(brandedBuffer)
    expect(stampedDoc.getPageCount()).toBe(2)
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

describe('Crossref Link Annotation & Logo Stamping', () => {
  it('embeds the journal favicon logo into a PDF document', async () => {
    const doc = await PDFDocument.create()
    const img = await embedJournalFaviconLogo(doc)
    expect(img).not.toBeNull()
    expect(img.width).toBe(1254)
    expect(img.height).toBe(1254)
  })

  it('stamps the journal logo in the top-right corner above the journal name', async () => {
    const doc = await PDFDocument.create()
    const page = doc.addPage([595.28, 841.89])
    const result = await stampJournalLogoOnPage1(doc, page)
    expect(result).toBe(true)

    // Also verify with custom size and offset
    const resultCustom = await stampJournalLogoOnPage1(doc, page, {
      journalLogoSize: 60,
      journalLogoTopOffset: 96,
    })
    expect(resultCustom).toBe(true)
  })

  it('embeds the new Crossref logo image into a PDF document', async () => {
    const doc = await PDFDocument.create()
    const img = await embedCrossrefLogo(doc)
    expect(img).not.toBeNull()
    expect(img.width).toBe(800)
    expect(img.height).toBe(272)
  })

  it('stamps the new Crossref logo and covers the existing icon area on page 1', async () => {
    const doc = await PDFDocument.create()
    const page = doc.addPage([595.28, 841.89])
    const result = await stampCrossrefLogoOnPage1(doc, page, 'https://doi.org/10.68968/IJIDCR_2600001')
    expect(result).toBe(true)

    const annots = page.node.Annots()
    expect(annots).toBeDefined()
    expect(annots.size()).toBe(1)
    const annot = doc.context.lookup(annots.get(0))
    expect(annot.get(PDFName.of('Subtype'))?.asString()).toBe('/Link')
    const uri = annot.get(PDFName.of('A'))?.get(PDFName.of('URI'))?.value
    expect(uri).toBe('https://doi.org/10.68968/IJIDCR_2600001')
  })

  it('stamps an interactive link annotation pointing to the canonical DOI URL on page 1', async () => {
    const doc = await PDFDocument.create()
    doc.addPage([595.28, 841.89])
    const bytes = Buffer.from(await doc.save())

    const doiUrl = 'https://doi.org/10.68968/IJIDCR_00004'
    const stampedBuffer = await stampCrossrefLinkAnnotation(bytes, doiUrl)
    expect(Buffer.isBuffer(stampedBuffer)).toBe(true)

    const reloaded = await PDFDocument.load(stampedBuffer)
    const p1 = reloaded.getPages()[0]
    const annots = p1.node.Annots()
    expect(annots).toBeDefined()
    expect(annots.size()).toBe(1)

    const annot = reloaded.context.lookup(annots.get(0))
    const uri = annot.get(PDFName.of('A'))?.get(PDFName.of('URI'))?.value
    expect(uri).toBe('https://doi.org/10.68968/IJIDCR_00004')
  })

  it('handles invalid or empty buffers gracefully without crashing', async () => {
    const emptyBuf = await stampCrossrefLinkAnnotation(null, 'https://doi.org/test')
    expect(emptyBuf).toBeNull()

    const unparseable = Buffer.from('not-a-pdf')
    const result = await stampCrossrefLinkAnnotation(unparseable, 'https://doi.org/test')
    expect(result).toEqual(unparseable)
  })
})

describe('Author Pagination & Running Header Logic (Page 2 to n)', () => {
  it('correctly chunks authors into pairs of up to 2 authors each', () => {
    const fourAuthors = [
      { first_name: 'Dr. A.', last_name: 'Kumar' },
      { first_name: 'Dr. B.', last_name: 'Priya' },
      { first_name: 'Mr. C.', last_name: 'Arun' },
      { first_name: 'Ms. D.', last_name: 'Sharma' },
    ]
    const pairs = chunkAuthorsIntoPairs(fourAuthors)
    expect(pairs.length).toBe(2)
    expect(pairs[0].length).toBe(2)
    expect(pairs[1].length).toBe(2)
  })

  it('manages pages with 2 authors per page starting from page 2', () => {
    const authors = [
      { first_name: 'Dr. A.', last_name: 'Kumar' },
      { first_name: 'Dr. B.', last_name: 'Priya' },
      { first_name: 'Mr. C.', last_name: 'Arun' },
      { first_name: 'Ms. D.', last_name: 'Sharma' },
    ]

    // Page 2 gets first two authors
    expect(getAuthorHeaderForPage(authors, 2)).toBe('Dr. A. Kumar, Dr. B. Priya')
    // Page 3 gets balance two authors
    expect(getAuthorHeaderForPage(authors, 3)).toBe('Mr. C. Arun, Ms. D. Sharma')
    // Page 4 cycles back based on author count
    expect(getAuthorHeaderForPage(authors, 4)).toBe('Dr. A. Kumar, Dr. B. Priya')
    expect(getAuthorHeaderForPage(authors, 5)).toBe('Mr. C. Arun, Ms. D. Sharma')
  })

  it('handles odd number of authors correctly across pages', () => {
    const threeAuthors = [
      { first_name: 'Alice', last_name: 'One' },
      { first_name: 'Bob', last_name: 'Two' },
      { first_name: 'Charlie', last_name: 'Three' },
    ]

    expect(getAuthorHeaderForPage(threeAuthors, 2)).toBe('Alice One, Bob Two')
    expect(getAuthorHeaderForPage(threeAuthors, 3)).toBe('Charlie Three')
    expect(getAuthorHeaderForPage(threeAuthors, 4)).toBe('Alice One, Bob Two')
    expect(getAuthorHeaderForPage(threeAuthors, 5)).toBe('Charlie Three')
  })

  it('handles single author gracefully on all pages', () => {
    const singleAuthor = [{ first_name: 'Solo', last_name: 'Author' }]
    expect(getAuthorHeaderForPage(singleAuthor, 2)).toBe('Solo Author')
    expect(getAuthorHeaderForPage(singleAuthor, 3)).toBe('Solo Author')
  })

  it('handles string authors and empty arrays without throwing', () => {
    expect(getAuthorHeaderForPage(['Jane Doe', 'John Smith'], 2)).toBe('Jane Doe, John Smith')
    expect(getAuthorHeaderForPage([], 2)).toBe('Author(s)')
  })
})

describe('Page 2+ Head Rule & Author Stamping in PDF', () => {
  async function createTestPdf(pageCount = 3) {
    const doc = await PDFDocument.create()
    for (let i = 0; i < pageCount; i++) {
      const page = doc.addPage([595.28, 841.89])
      page.drawText(`Body on page ${i + 1}`, { x: 50, y: 500, size: 10 })
    }
    return Buffer.from(await doc.save())
  }

  it('stamps thin black horizontal line across full width of top margin and 2 authors per page', async () => {
    const pdfBuf = await createTestPdf(3)
    const authors = [
      { first_name: 'Author', last_name: 'One' },
      { first_name: 'Author', last_name: 'Two' },
      { first_name: 'Author', last_name: 'Three' },
      { first_name: 'Author', last_name: 'Four' },
    ]

    const stampedBuffer = await stampPublishedManuscriptHeadersAndOrcid({
      pdfBuffer: pdfBuf,
      authors,
      journal: { short_name: 'IJIDCR' },
    })

    expect(Buffer.isBuffer(stampedBuffer)).toBe(true)
    const reloaded = await PDFDocument.load(stampedBuffer)
    expect(reloaded.getPageCount()).toBe(3)

    // Inspect page 2 (index 1) and page 3 (index 2)
    const page2 = reloaded.getPage(1)
    expect(page2.getSize().width).toBeCloseTo(595.28, 1)

    // Verify branded manuscript pdf also includes author headers
    const brandedBuf = await renderBrandedManuscriptPdf({
      pdfBuffer: pdfBuf,
      journal: { short_name: 'IJIDCR' },
      manuscript: { submission_number: 'IJIDCR-26-00001' },
      publication: { volume: 1, issue: 1, publication_year: 2026 },
      certificateNumber: 'CERT-001',
      authors,
    })
    const reloadedBranded = await PDFDocument.load(brandedBuf)
    expect(reloadedBranded.getPageCount()).toBe(3)
  })
})

describe('Page 1 Author ORCID Icon & Clickable Redirect Annotation', () => {
  it('extracts valid ORCID from raw strings and URLs', () => {
    expect(extractValidOrcid('0000-0002-1825-0097')).toBe('0000-0002-1825-0097')
    expect(extractValidOrcid('https://orcid.org/0000-0002-1825-0097')).toBe('0000-0002-1825-0097')
    expect(extractValidOrcid('http://orcid.org/0000-0002-1825-0097')).toBe('0000-0002-1825-0097')
    expect(extractValidOrcid('invalid-orcid')).toBeNull()
    expect(extractValidOrcid(null)).toBeNull()
  })

  it('stamps ORCID link annotations redirecting to author ORCID pages for all authors with an ORCID', async () => {
    const doc = await PDFDocument.create()
    const p1 = doc.addPage([595.28, 841.89])
    p1.drawText('Correspondence', { x: 57.7, y: 602, size: 11 })
    p1.drawText('Dr. A. Kumar¹', { x: 57.7, y: 586, size: 10 })
    p1.drawText('Dr. B. Priya²', { x: 57.7, y: 570, size: 10 })
    doc.addPage([595.28, 841.89])
    const inputPdf = Buffer.from(await doc.save())

    const authors = [
      { first_name: 'Dr. A.', last_name: 'Kumar', orcid_id: '0000-0002-1825-0097' },
      { first_name: 'Dr. B.', last_name: 'Priya', orcid_id: 'https://orcid.org/0000-0001-5109-3700' },
      { first_name: 'Mr. C.', last_name: 'NoOrcid', orcid_id: null },
    ]

    const stampedBuffer = await stampPublishedManuscriptHeadersAndOrcid({
      pdfBuffer: inputPdf,
      authors,
      journal: { short_name: 'IJIDCR' },
    })

    const reloaded = await PDFDocument.load(stampedBuffer)
    const page1 = reloaded.getPage(0)
    const annots = page1.node.Annots()
    expect(annots).toBeDefined()
    // Exactly 2 link annotations for the 2 authors with valid ORCIDs
    expect(annots.size()).toBe(2)

    const annot1 = reloaded.context.lookup(annots.get(0))
    const uri1 = annot1.get(PDFName.of('A'))?.get(PDFName.of('URI'))?.value
    expect(uri1).toBe('https://orcid.org/0000-0002-1825-0097')

    const annot2 = reloaded.context.lookup(annots.get(1))
    const uri2 = annot2.get(PDFName.of('A'))?.get(PDFName.of('URI'))?.value
    expect(uri2).toBe('https://orcid.org/0000-0001-5109-3700')
  })

  it('anchors each ORCID icon to its own author name, never to header or date text', async () => {
    const doc = await PDFDocument.create()
    const p1 = doc.addPage([595.28, 841.89])
    // Header text and date line contain the letters E / P and must never match.
    p1.drawText('ORIGINAL RESEARCH', { x: 57.7, y: 790, size: 14 })
    p1.drawText('Received: 19 November 2026 | Accepted: 19 November 2026', { x: 57.7, y: 750, size: 9 })
    p1.drawText('Correspondence', { x: 57.7, y: 620, size: 11 })
    p1.drawText('Kishor SA¹,', { x: 57.7, y: 600, size: 11 })
    p1.drawText('Bharath E¹,', { x: 57.7, y: 584, size: 11 })
    p1.drawText('Eswaran A²,    Joel P²*', { x: 57.7, y: 568, size: 11 })
    const inputPdf = Buffer.from(await doc.save())

    const authors = [
      { first_name: 'Kishor', last_name: 'SA', orcid_id: '0000-0002-1825-0097' },
      { first_name: 'Bharath', last_name: 'E', orcid_id: '0000-0001-5109-3700' },
      { first_name: 'Eswaran', last_name: 'A', orcid_id: '0000-0002-1694-233X' },
      { first_name: 'Joel', last_name: 'P', orcid_id: '0000-0003-1415-9269' },
    ]

    const boxes = findAuthorBoxesOnPage1(inputPdf, authors)
    // pdftotext is required for coordinate matching; skip positional assertions
    // on hosts where it is unavailable.
    if (boxes.every((b) => b.source === 'bbox')) {
      const bySurname = Object.fromEntries(boxes.map((b) => [b.author.last_name, b]))
      for (const surname of ['SA', 'E', 'A', 'P']) {
        // bbox coords are top-based: header ≈ 40, date ≈ 80, authors ≈ 230-270.
        expect(bySurname[surname].yMin).toBeGreaterThan(150)
        expect(bySurname[surname].yMin).toBeLessThan(400)
      }
      expect(bySurname.E.xMin).toBeCloseTo(57.7, 0)
      expect(bySurname.P.xMin).toBeGreaterThan(bySurname.A.xMax)
    }

    const stamped = await stampPublishedManuscriptHeadersAndOrcid({
      pdfBuffer: inputPdf,
      authors,
      journal: { short_name: 'IJIDCR' },
    })
    const reloaded = await PDFDocument.load(stamped)
    const annots = reloaded.getPage(0).node.Annots()
    const orcidRects = []
    for (let i = 0; i < annots.size(); i++) {
      const annot = reloaded.context.lookup(annots.get(i))
      const uri = annot.get(PDFName.of('A'))?.get(PDFName.of('URI'))?.value
      if (uri?.startsWith('https://orcid.org/')) {
        orcidRects.push(annot.get(PDFName.of('Rect')).asArray().map(Number))
      }
    }
    expect(orcidRects).toHaveLength(4)
    // Icons must be in the author block (bottom-based coords), not in the
    // header (y ≈ 790) or the date line (y ≈ 750).
    for (const rect of orcidRects) {
      expect(rect[1]).toBeLessThan(630)
      expect(rect[3]).toBeLessThan(630)
    }
  })
})


