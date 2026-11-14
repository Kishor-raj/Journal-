import { describe, it, expect } from 'vitest'
import { promises as fs } from 'fs'
import path from 'path'
import JSZip from 'jszip'
import { PDFDocument, PDFName } from 'pdf-lib'
import {
  formatPublicationDate,
  formatAuthorsAndAffiliations,
  buildDatesLine,
  deriveCanonicalDoiUrl,
  isMatchingTitle,
  normalizeSectionMargins,
  sanitizeAndFitTables,
  renderPublicationDocx,
} from './publication-docx.renderer.js'
import { convertDocxToPdf } from './document-converter.js'

describe('Publication DOCX Renderer (Master Template Engine)', () => {
  describe('Helper Formatting Functions', () => {
    it('formats date strings into D MMMM YYYY standard', () => {
      expect(formatPublicationDate('2026-11-13T00:00:00Z')).toBe('13 November 2026')
      expect(formatPublicationDate(null)).toBeNull()
      expect(formatPublicationDate('invalid-date')).toBeNull()
    })

    it('formats author list, superscript affiliations, and corresponding author email', () => {
      const authors = [
        { first_name: 'Jane', last_name: 'Doe', email: 'jdoe@univ.edu', department: 'CS Dept', institution: 'MIT', country: 'USA', is_corresponding: true },
        { first_name: 'John', last_name: 'Smith', email: 'jsmith@univ.edu', department: 'AI Lab', institution: 'Stanford Univ', country: 'USA', is_corresponding: false },
        { first_name: 'Alice', last_name: 'Brown', email: 'abrown@univ.edu', department: 'CS Dept', institution: 'MIT', country: 'USA', is_corresponding: false },
      ]

      const formatted = formatAuthorsAndAffiliations(authors)
      expect(formatted.authorsLine).toContain('Jane Doe¹*')
      expect(formatted.authorsLine).toContain('John Smith²')
      expect(formatted.authorsLine).toContain('Alice Brown¹') // reuses index 1 for identical affiliation
      expect(formatted.affiliationsLine).toContain('¹CS Dept, MIT, USA')
      expect(formatted.affiliationsLine).toContain('²AI Lab, Stanford Univ, USA')
      expect(formatted.correspondingLine).toBe('Corresponding Author: jdoe@univ.edu')
    })

    it('builds dates line omitting missing optional dates without fabricating data', () => {
      const allDates = buildDatesLine({
        received: '2026-01-10T00:00:00Z',
        revised: '2026-02-15T00:00:00Z',
        accepted: '2026-03-01T00:00:00Z',
      })
      expect(allDates).toBe('Received: 10 January 2026 | Revised: 15 February 2026 | Accepted: 1 March 2026')

      const noRevision = buildDatesLine({
        received: '2026-01-10T00:00:00Z',
        revised: null,
        accepted: '2026-03-01T00:00:00Z',
      })
      expect(noRevision).toBe('Received: 10 January 2026 | Accepted: 1 March 2026')
      expect(noRevision).not.toContain('Revised')
    })

    it('derives canonical DOI URL and display text correctly', () => {
      const explicit = deriveCanonicalDoiUrl('10.68968/IJIDCR_00004', 'IJIDCR-26-00004', 'uuid-1')
      expect(explicit.cleanDoi).toBe('10.68968/IJIDCR_00004')
      expect(explicit.doiUrl).toBe('https://doi.org/10.68968/IJIDCR_00004')
      expect(explicit.doiText).toBe('DOI: 10.68968/IJIDCR_00004')

      const withPrefix = deriveCanonicalDoiUrl('https://doi.org/10.68968/IJIDCR_00004')
      expect(withPrefix.cleanDoi).toBe('10.68968/IJIDCR_00004')
      expect(withPrefix.doiUrl).toBe('https://doi.org/10.68968/IJIDCR_00004')

      const fallback = deriveCanonicalDoiUrl(null, 'IJIDCR-26-00005', 'uuid-2')
      expect(fallback.cleanDoi).toBe('10.68968/IJIDCR_26_00005')
      expect(fallback.doiUrl).toBe('https://doi.org/10.68968/IJIDCR_26_00005')
    })

    it('accurately matches manuscript titles while ignoring case, punctuation, and prefix', () => {
      expect(isMatchingTitle('Deep Residual Learning for Image Recognition', 'Deep Residual Learning for Image Recognition')).toBe(true)
      expect(isMatchingTitle('Title: Deep Residual Learning for Image Recognition.', 'DEEP RESIDUAL LEARNING FOR IMAGE RECOGNITION')).toBe(true)
      expect(isMatchingTitle('Different Paper Title', 'Deep Residual Learning')).toBe(false)
      expect(isMatchingTitle('', 'Title')).toBe(false)
      expect(isMatchingTitle(null, null)).toBe(false)
    })
  })

  describe('Document Generation & Open XML Integrity', () => {
    it('generates a valid DOCX package matching IJIDCR master template structure', async () => {
      const refPath = path.resolve(process.cwd(), '../docs/reference/IJIDCR -Paper Published design.docx')
      let sourceBuf
      try {
        sourceBuf = await fs.readFile(refPath)
      } catch {
        // Fallback minimal docx buffer for isolated unit test
        const zip = new JSZip()
        zip.file('[Content_Types].xml', '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>')
        zip.file('word/document.xml', '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>1. Introduction\nSample body content.</w:t></w:r></w:p></w:body></w:document>')
        sourceBuf = await zip.generateAsync({ type: 'nodebuffer' })
      }

      const context = {
        manuscript: {
          id: 'test-m-1',
          submission_number: 'IJIDCR-26-00099',
          title: 'Deep Residual Learning for Image Recognition',
          abstract: 'We present a residual learning framework to ease the training of networks that are substantially deeper than those used previously.',
          keywords: ['Deep Learning', 'Residual Networks', 'Computer Vision'],
          article_type: 'Research Article',
        },
        publication: {
          volume: 2,
          issue: 2,
          publication_year: 2026,
          doi: '10.68968/IJIDCR_26099',
          doi_status: 'registered',
          doi_environment: 'production',
        },
        authors: [
          { first_name: 'Kaiming', last_name: 'He', email: 'khe@research.org', department: 'Vision Lab', institution: 'Research AI', country: 'USA', is_corresponding: true },
        ],
        dates: {
          received: '2026-01-01T00:00:00Z',
          revised: null,
          accepted: '2026-02-01T00:00:00Z',
        },
        journal: {
          name: 'International Journal of Intelligent Digital Computing Research',
          short_name: 'IJIDCR',
        },
      }

      const formattedDocx = await renderPublicationDocx({ sourceDocxBuffer: sourceBuf, context })
      expect(Buffer.isBuffer(formattedDocx)).toBe(true)
      expect(formattedDocx.length).toBeGreaterThan(10000)

      // Verify Open XML package contents
      const zip = await JSZip.loadAsync(formattedDocx)
      expect(zip.file('[Content_Types].xml')).toBeDefined()
      expect(zip.file('word/document.xml')).toBeDefined()
      expect(zip.file('word/footer1.xml')).toBeDefined()

      const docXml = await zip.file('word/document.xml').async('string')
      expect(docXml).toContain('DEEP RESIDUAL LEARNING FOR IMAGE RECOGNITION')
      expect(docXml).toContain('IJIDCR-26-00099')
      expect(docXml).toContain('10.68968/IJIDCR_26099')
      expect(docXml).toContain('Kaiming He')
      expect(docXml).toContain('Vision Lab, Research AI, USA')
      expect(docXml).toContain('We present a residual learning framework')
      expect(docXml).toContain('Deep Learning; Residual Networks; Computer Vision')

      // Verify converting to PDF succeeds
      const pdfBuf = await convertDocxToPdf(formattedDocx)
      expect(Buffer.isBuffer(pdfBuf)).toBe(true)
      expect(pdfBuf.slice(0, 5).toString('utf-8')).toMatch(/^%PDF-/)
    }, 15000)

    it('applies Cormorant Garamond font to journal header, article type, article ID/vol/issue, paper title, and footer ASGARD', async () => {
      const refPath = path.resolve(process.cwd(), '../docs/reference/IJIDCR -Paper Published design.docx')
      let sourceBuf
      try {
        sourceBuf = await fs.readFile(refPath)
      } catch {
        const zip = new JSZip()
        zip.file('[Content_Types].xml', '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>')
        zip.file('word/document.xml', '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>1. Introduction\nSample body content.</w:t></w:r></w:p></w:body></w:document>')
        sourceBuf = await zip.generateAsync({ type: 'nodebuffer' })
      }

      const context = {
        manuscript: {
          id: 'test-font-uuid',
          submission_number: 'IJIDCR-26-00100',
          title: 'Quantum Machine Learning in Cybersecurity',
          abstract: 'An investigation into quantum algorithms.',
          keywords: ['Quantum Computing', 'Cybersecurity'],
          article_type: 'Research Article',
        },
        publication: {
          volume: 2,
          issue: 3,
          publication_year: 2026,
          doi: '10.68968/IJIDCR_26100',
          doi_status: 'registered',
        },
        authors: [
          { first_name: 'David', last_name: 'Clark', email: 'dclark@oxford.edu', department: 'Cyber', institution: 'Oxford', country: 'UK', is_corresponding: true },
        ],
        dates: {
          received: '2026-02-01T00:00:00Z',
          revised: null,
          accepted: '2026-03-01T00:00:00Z',
        },
      }

      const formattedDocx = await renderPublicationDocx({ sourceDocxBuffer: sourceBuf, context })
      const zip = await JSZip.loadAsync(formattedDocx)

      // 1. fontTable.xml contains Cormorant Garamond
      const fontTableXml = await zip.file('word/fontTable.xml').async('string')
      expect(fontTableXml).toContain('Cormorant Garamond')

      // 2. footer1.xml contains Cormorant Garamond for ASGARD run
      const footerXml = await zip.file('word/footer1.xml').async('string')
      expect(footerXml).toContain('ASGARD')
      expect(footerXml).toContain('Cormorant Garamond')

      // 3. document.xml contains Cormorant Garamond for all target elements
      const docXml = await zip.file('word/document.xml').async('string')
      expect(docXml).toContain('Cormorant Garamond')
      expect(docXml).toContain('QUANTUM MACHINE LEARNING IN CYBERSECURITY')
      expect(docXml).toContain('IJIDCR-26-00100')
      expect(docXml).toContain('RESEARCH ARTICLE')
      expect(docXml).toContain('INTERNATIONAL JOURNAL OF INTELLIGENT DIGITAL COMPUTING RESEARCH')
    })

    it('displays DOI on published document even when doi_status is reserved or doi is omitted', async () => {
      const refPath = path.resolve(process.cwd(), '../docs/reference/IJIDCR -Paper Published design.docx')
      let sourceBuf
      try {
        sourceBuf = await fs.readFile(refPath)
      } catch {
        const zip = new JSZip()
        zip.file('[Content_Types].xml', '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>')
        zip.file('word/document.xml', '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>1. Introduction\nSample body content.</w:t></w:r></w:p></w:body></w:document>')
        sourceBuf = await zip.generateAsync({ type: 'nodebuffer' })
      }

      // 1. Reserved DOI status should always be displayed
      const contextReserved = {
        manuscript: {
          id: 'test-reserved-uuid',
          submission_number: 'IJIDCR-26-00101',
          title: 'Graph Neural Networks in Drug Discovery',
          article_type: 'Research Article',
        },
        publication: {
          volume: 1,
          issue: 1,
          publication_year: 2026,
          doi: '10.68968/IJIDCR_26101',
          doi_status: 'reserved',
        },
        authors: [
          { first_name: 'Sarah', last_name: 'Connor', email: 'sconnor@tech.org', is_corresponding: true },
        ],
        dates: { received: '2026-01-01', accepted: '2026-02-01' },
      }

      const docxReserved = await renderPublicationDocx({ sourceDocxBuffer: sourceBuf, context: contextReserved })
      const zipReserved = await JSZip.loadAsync(docxReserved)
      const docXmlReserved = await zipReserved.file('word/document.xml').async('string')
      expect(docXmlReserved).toContain('DOI: 10.68968/IJIDCR_26101')

      // 2. Omitted publication.doi falls back to canonical submission_number DOI
      const contextOmitted = {
        manuscript: {
          id: 'test-omitted-uuid',
          submission_number: 'IJIDCR-26-00102',
          title: 'Autonomous Systems in Urban Transit',
          article_type: 'Research Article',
        },
        publication: {
          volume: 1,
          issue: 1,
          publication_year: 2026,
        },
        authors: [
          { first_name: 'Alex', last_name: 'Murphy', email: 'amurphy@metro.org', is_corresponding: true },
        ],
        dates: { received: '2026-01-01', accepted: '2026-02-01' },
      }

      const docxOmitted = await renderPublicationDocx({ sourceDocxBuffer: sourceBuf, context: contextOmitted })
      const zipOmitted = await JSZip.loadAsync(docxOmitted)
      const docXmlOmitted = await zipOmitted.file('word/document.xml').async('string')
      expect(docXmlOmitted).toContain('DOI: 10.68968/IJIDCR_26_00102')
    })

    it('positions Crossref logo to the right of Article ID and above topic without collision', async () => {
      const refPath = path.resolve(process.cwd(), '../docs/reference/IJIDCR -Paper Published design.docx')
      let sourceBuf
      try {
        sourceBuf = await fs.readFile(refPath)
      } catch {
        const zip = new JSZip()
        zip.file('[Content_Types].xml', '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>')
        zip.file('word/document.xml', '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>1. Introduction\nSample body content.</w:t></w:r></w:p></w:body></w:document>')
        sourceBuf = await zip.generateAsync({ type: 'nodebuffer' })
      }

      const context = {
        manuscript: {
          id: 'test-crossref-pos-uuid',
          submission_number: 'IJIDCR-26-00103',
          title: 'AN EXPERIMENTAL INVESTIGATION OF HIGHLY SCALABLE DEEP LEARNING ARCHITECTURES FOR REAL TIME MULTIMODAL SENTIMENT ANALYSIS IN LARGE SCALE STREAMING PLATFORMS',
          article_type: 'Research Article',
        },
        publication: {
          volume: 2,
          issue: 1,
          publication_year: 2026,
          doi: '10.68968/IJIDCR_26103',
          doi_status: 'reserved',
        },
        authors: [
          { first_name: 'Elena', last_name: 'Rostova', email: 'erostova@uni.edu', is_corresponding: true },
        ],
        dates: { received: '2026-01-01', accepted: '2026-02-01' },
      }

      const formattedDocx = await renderPublicationDocx({ sourceDocxBuffer: sourceBuf, context })
      const zip = await JSZip.loadAsync(formattedDocx)
      const docXml = await zip.file('word/document.xml').async('string')

      // Verify Crossref compact size and offsets place it on the right side
      expect(docXml).toContain('posOffset>5537200</')
      expect(docXml).toContain('posOffset>-30000</')
      expect(docXml).toContain('Crossref')
      expect(docXml).toContain('for updates')
      expect(docXml).toContain('rIdDoiCrossref')
      expect(docXml).toContain('<w:hyperlink')

      const relsXml = await zip.file('word/_rels/document.xml.rels').async('string')
      expect(relsXml).toContain('Target="https://doi.org/10.68968/IJIDCR_26103"')
      expect(relsXml).toContain('TargetMode="External"')

      // Verify converting to PDF succeeds with 0 errors and generates interactive link annotations
      const pdfBuf = await convertDocxToPdf(formattedDocx)
      expect(Buffer.isBuffer(pdfBuf)).toBe(true)
      expect(pdfBuf.slice(0, 5).toString('utf-8')).toMatch(/^%PDF-/)

      const pdfDoc = await PDFDocument.load(pdfBuf)
      const p1 = pdfDoc.getPages()[0]
      const annots = p1.node.Annots()
      expect(annots ? annots.size() : 0).toBeGreaterThanOrEqual(1)
      let foundDoiLink = false
      for (let i = 0; i < (annots ? annots.size() : 0); i++) {
        const annot = pdfDoc.context.lookup(annots.get(i))
        const uri = annot.get(PDFName.of('A'))?.get(PDFName.of('URI'))?.value
        if (uri && uri.includes('10.68968/IJIDCR_26103')) {
          foundDoiLink = true
          break
        }
      }
      expect(foundDoiLink).toBe(true)
    }, 15000)

    it('renders Received and Accepted dates inside the date box in the published document', async () => {
      const refPath = path.resolve(process.cwd(), '../docs/reference/IJIDCR -Paper Published design.docx')
      let sourceBuf
      try {
        sourceBuf = await fs.readFile(refPath)
      } catch {
        const zip = new JSZip()
        zip.file('[Content_Types].xml', '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>')
        zip.file('word/document.xml', '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>1. Introduction\nSample body content.</w:t></w:r></w:p></w:body></w:document>')
        sourceBuf = await zip.generateAsync({ type: 'nodebuffer' })
      }

      const context = {
        manuscript: {
          id: 'test-dates-uuid',
          submission_number: 'IJIDCR-26-00104',
          title: 'Federated Learning for Privacy-Preserving Healthcare Informatics',
          article_type: 'Research Article',
        },
        publication: {
          volume: 2,
          issue: 2,
          publication_year: 2026,
          doi: '10.68968/IJIDCR_26104',
          doi_status: 'reserved',
        },
        authors: [
          { first_name: 'Alan', last_name: 'Turing', email: 'aturing@cam.ac.uk', is_corresponding: true },
        ],
        dates: {
          received: '2026-01-15T00:00:00Z',
          revised: '2026-02-10T00:00:00Z',
          accepted: '2026-02-28T00:00:00Z',
        },
      }

      const formattedDocx = await renderPublicationDocx({ sourceDocxBuffer: sourceBuf, context })
      const zip = await JSZip.loadAsync(formattedDocx)
      const docXml = await zip.file('word/document.xml').async('string')

      expect(docXml).toContain('Received: 15 January 2026')
      expect(docXml).toContain('Revised: 10 February 2026')
      expect(docXml).toContain('Accepted: 28 February 2026')

      const pdfBuf = await convertDocxToPdf(formattedDocx)
      expect(Buffer.isBuffer(pdfBuf)).toBe(true)
      expect(pdfBuf.slice(0, 5).toString('utf-8')).toMatch(/^%PDF-/)
    }, 15000)

    it('ensures author document title and front-matter are not duplicated into the article body', async () => {
      // Author document that contains title, authors, abstract, and introduction
      const zip = new JSZip()
      zip.file('[Content_Types].xml', '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>')
      zip.file('word/document.xml', `
        <w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
          <w:body>
            <w:p><w:r><w:t>Deep Residual Learning for Image Recognition</w:t></w:r></w:p>
            <w:p><w:r><w:t>Kaiming He, Xiangyu Zhang</w:t></w:r></w:p>
            <w:p><w:r><w:t>Microsoft Research</w:t></w:r></w:p>
            <w:p><w:r><w:t>Abstract</w:t></w:r></w:p>
            <w:p><w:r><w:t>We present a residual learning framework to ease the training of networks.</w:t></w:r></w:p>
            <w:p><w:r><w:t>Keywords: Deep Learning; ResNet</w:t></w:r></w:p>
            <w:p><w:r><w:t>1. Introduction</w:t></w:r></w:p>
            <w:p><w:r><w:t>Deeper neural networks are more difficult to train.</w:t></w:r></w:p>
          </w:body>
        </w:document>
      `)
      const authorDocxBuf = await zip.generateAsync({ type: 'nodebuffer' })

      const context = {
        manuscript: {
          id: 'test-single-title-id',
          submission_number: 'IJIDCR-26-00105',
          title: 'Deep Residual Learning for Image Recognition',
          abstract: 'We present a residual learning framework to ease the training of networks.',
          keywords: ['Deep Learning', 'ResNet'],
          article_type: 'Research Article',
        },
        publication: {
          volume: 2,
          issue: 2,
          publication_year: 2026,
        },
      }

      const formattedDocx = await renderPublicationDocx({ sourceDocxBuffer: authorDocxBuf, context })
      const outZip = await JSZip.loadAsync(formattedDocx)
      const docXml = await outZip.file('word/document.xml').async('string')

      // Title must appear only once (in the template title header, NOT duplicated in body)
      const allTitleOccurrences = docXml.match(/Deep Residual Learning for Image Recognition/gi) || []
      expect(allTitleOccurrences.length).toBe(1)
      expect(docXml).toContain('1. Introduction')
      expect(docXml).toContain('Deeper neural networks are more difficult to train.')

      // Verify converting to PDF succeeds
      const pdfBuf = await convertDocxToPdf(formattedDocx)
      expect(Buffer.isBuffer(pdfBuf)).toBe(true)
      expect(pdfBuf.slice(0, 5).toString('utf-8')).toMatch(/^%PDF-/)
    }, 15000)

    it('normalizes section top margins to >= 720 to prevent inner content from appearing in header part', async () => {
      const zip = new JSZip()
      zip.file('[Content_Types].xml', '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>')
      zip.file('word/document.xml', `
        <w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
          <w:body>
            <w:p><w:r><w:t>1. Introduction</w:t></w:r></w:p>
            <w:p><w:r><w:t>This is body text on subsequent pages.</w:t></w:r></w:p>
          </w:body>
        </w:document>
      `)
      const authorDocxBuf = await zip.generateAsync({ type: 'nodebuffer' })

      const context = {
        manuscript: {
          id: 'test-margin-id',
          submission_number: 'IJIDCR-26-00106',
          title: 'Section Margin Normalization Test',
          abstract: 'Testing section margin normalization in rendered publication documents.',
        },
      }

      const formattedDocx = await renderPublicationDocx({ sourceDocxBuffer: authorDocxBuf, context })
      const outZip = await JSZip.loadAsync(formattedDocx)
      const docXml = await outZip.file('word/document.xml').async('string')

      // All pgMar top attributes must be >= 720 (no top="0")
      const topMatches = Array.from(docXml.matchAll(/(?:w:|ns0:)?top="([^"]*)"/g))
      expect(topMatches.length).toBeGreaterThan(0)
      for (const match of topMatches) {
        const topVal = parseInt(match[1], 10)
        expect(topVal).toBeGreaterThanOrEqual(720)
      }
    }, 15000)

    it('renders Subject/Category field (e.g. Original Research or Review Article) at the top of the published document', async () => {
      const zip = new JSZip()
      zip.file('[Content_Types].xml', '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>')
      zip.file('word/document.xml', `
        <w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
          <w:body>
            <w:p><w:r><w:t>1. Introduction</w:t></w:r></w:p>
          </w:body>
        </w:document>
      `)
      const authorDocxBuf = await zip.generateAsync({ type: 'nodebuffer' })

      // 1. Tests mapping category_name (e.g. 'Original Research')
      const context1 = {
        manuscript: {
          id: 'test-subject-cat-1',
          submission_number: 'IJIDCR-26-00107',
          title: 'Federated Anomaly Detection Systems',
          category_name: 'Original Research',
          article_type: 'Cybersecurity',
        },
      }

      const docx1 = await renderPublicationDocx({ sourceDocxBuffer: authorDocxBuf, context: context1 })
      const outZip1 = await JSZip.loadAsync(docx1)
      const xml1 = await outZip1.file('word/document.xml').async('string')
      expect(xml1).toContain('ORIGINAL RESEARCH')

      // 2. Tests mapping category_name (e.g. 'Review Article')
      const context2 = {
        manuscript: {
          id: 'test-subject-cat-2',
          submission_number: 'IJIDCR-26-00108',
          title: 'A Survey on Deep Learning for Healthcare',
          category_name: 'Review Article',
          article_type: 'Healthcare Informatics',
        },
      }

      const docx2 = await renderPublicationDocx({ sourceDocxBuffer: authorDocxBuf, context: context2 })
      const outZip2 = await JSZip.loadAsync(docx2)
      const xml2 = await outZip2.file('word/document.xml').async('string')
      expect(xml2).toContain('REVIEW ARTICLE')
    }, 15000)

    it('sanitizes tables to prevent bleeding outside left side margin (removes tblpPr, fixes negative tblInd, constrains width)', async () => {
      // Author document containing a wide table with floating positioning and negative indent
      const zip = new JSZip()
      zip.file('[Content_Types].xml', '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>')
      zip.file('word/document.xml', `
        <w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
          <w:body>
            <w:p><w:r><w:t>1. Introduction</w:t></w:r></w:p>
            <w:tbl>
              <w:tblPr>
                <w:tblpPr w:leftFromText="180" w:rightFromText="180" w:vertAnchor="text" w:horzAnchor="page" w:tblpX="-1200" w:tblpY="1500"/>
                <w:tblW w:w="10500" w:type="dxa"/>
                <w:jc w:val="center"/>
                <w:tblInd w:w="-720" w:type="dxa"/>
              </w:tblPr>
              <w:tblGrid>
                <w:gridCol w:w="2100"/>
                <w:gridCol w:w="2100"/>
                <w:gridCol w:w="2100"/>
                <w:gridCol w:w="2100"/>
                <w:gridCol w:w="2100"/>
              </w:tblGrid>
              <w:tr>
                <w:tc><w:tcPr><w:tcW w:w="2100" w:type="dxa"/><w:noWrap/></w:tcPr><w:p><w:r><w:t>Method</w:t></w:r></w:p></w:tc>
                <w:tc><w:tcPr><w:tcW w:w="2100" w:type="dxa"/><w:noWrap/></w:tcPr><w:p><w:r><w:t>Metric 1</w:t></w:r></w:p></w:tc>
                <w:tc><w:tcPr><w:tcW w:w="2100" w:type="dxa"/><w:noWrap/></w:tcPr><w:p><w:r><w:t>Metric 2</w:t></w:r></w:p></w:tc>
                <w:tc><w:tcPr><w:tcW w:w="2100" w:type="dxa"/><w:noWrap/></w:tcPr><w:p><w:r><w:t>Metric 3</w:t></w:r></w:p></w:tc>
                <w:tc><w:tcPr><w:tcW w:w="2100" w:type="dxa"/><w:noWrap/></w:tcPr><w:p><w:r><w:t>Metric 4</w:t></w:r></w:p></w:tc>
              </w:tr>
            </w:tbl>
          </w:body>
        </w:document>
      `)
      const authorDocxBuf = await zip.generateAsync({ type: 'nodebuffer' })

      const context = {
        manuscript: {
          id: 'test-table-sanitization',
          submission_number: 'IJIDCR-26-00109',
          title: 'Table Boundary Protection Test',
          category_name: 'Original Research',
        },
      }

      const formattedDocx = await renderPublicationDocx({ sourceDocxBuffer: authorDocxBuf, context })
      const outZip = await JSZip.loadAsync(formattedDocx)
      const docXml = await outZip.file('word/document.xml').async('string')

      // 1. Floating positioning (tblpPr) must be completely removed
      expect(docXml).not.toContain('<w:tblpPr')
      expect(docXml).not.toContain('tblpX')

      // 2. Negative table indent must be neutralized to 0 (no negative w)
      const tblIndMatches = Array.from(docXml.matchAll(/<w:tblInd[^>]*w="([^"]*)"/g))
      for (const m of tblIndMatches) {
        expect(parseInt(m[1], 10)).toBeGreaterThanOrEqual(0)
      }

      // 3. Table alignment must be set to left to prevent center-expansion outside left margin
      expect(docXml).toContain('<w:jc w:val="left"/>')

      // 4. Table width must not exceed single column max (4950 dxa)
      const tblWMatches = Array.from(docXml.matchAll(/<w:tblW[^>]*w="([^"]*)"[^>]*w:type="dxa"/g))
      for (const m of tblWMatches) {
        expect(parseInt(m[1], 10)).toBeLessThanOrEqual(4950)
      }

      // 5. Converting to PDF succeeds cleanly
      const pdfBuf = await convertDocxToPdf(formattedDocx)
      expect(Buffer.isBuffer(pdfBuf)).toBe(true)
      expect(pdfBuf.slice(0, 5).toString('utf-8')).toMatch(/^%PDF-/)
    }, 15000)
  })
})
