import { promises as fs } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import JSZip from 'jszip'
import { DOMParser, XMLSerializer } from '@xmldom/xmldom'
import { AppError } from '../../shared/errors/AppError.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const TEMPLATE_PATH = path.resolve(__dirname, '../../assets/templates/IJIDCR_Publication_Template.docx')

const W_NS = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'
const R_NS = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'
const WP_NS = 'http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing'
const A_NS = 'http://schemas.openxmlformats.org/drawingml/2006/main'
const VML_NS = 'urn:schemas-microsoft-com:vml'

/**
 * Formats a Date object or ISO string to standard publication date 'D MMMM YYYY'.
 */
export function formatPublicationDate(dateInput) {
  if (!dateInput) return null
  const d = new Date(dateInput)
  if (isNaN(d.getTime())) return null
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
}

/**
 * Superscript digits mapping for author affiliation indices.
 */
const SUPERSCRIPTS = ['⁰', '¹', '²', '³', '⁴', '⁵', '⁶', '⁷', '⁸', '⁹']
function toSuperscript(num) {
  return String(num)
    .split('')
    .map((ch) => SUPERSCRIPTS[parseInt(ch, 10)] || ch)
    .join('')
}

/**
 * Formats the author list and affiliations block according to the IJIDCR reference design.
 */
export function formatAuthorsAndAffiliations(authors = []) {
  if (!Array.isArray(authors) || authors.length === 0) {
    return {
      authorsLine: 'Author(s)',
      affiliationsLine: '',
      correspondingLine: '',
    }
  }

  // Deduplicate affiliations
  const affiliationMap = new Map()
  let affIndex = 1

  const authorEntries = authors.map((a) => {
    const name = [a.first_name, a.last_name].filter(Boolean).join(' ') || 'Author'
    const affParts = [a.department, a.institution, a.country].filter(Boolean).map((s) => s.trim())
    const affKey = affParts.join(', ')

    let superTag = ''
    if (affKey) {
      if (!affiliationMap.has(affKey)) {
        affiliationMap.set(affKey, affIndex++)
      }
      superTag = toSuperscript(affiliationMap.get(affKey))
    }

    const star = a.is_corresponding ? '*' : ''
    return `${name}${superTag}${star}`
  })

  // Format affiliations
  const affItems = Array.from(affiliationMap.entries()).map(([key, idx]) => {
    return `${toSuperscript(idx)}${key}`
  })

  const correspondingAuthor = authors.find((a) => a.is_corresponding) || authors[0]
  const corrEmail = correspondingAuthor?.email || ''

  return {
    authorsLine: authorEntries.join(', '),
    affiliationsLine: affItems.join(' | '),
    correspondingLine: corrEmail ? `Corresponding Author: ${corrEmail}` : '',
  }
}

/**
 * Builds the received/revised/accepted string.
 */
export function buildDatesLine(dates = {}) {
  const { received, revised, accepted } = dates || {}
  const parts = []
  const recStr = formatPublicationDate(received)
  if (recStr) parts.push(`Received: ${recStr}`)

  const revStr = formatPublicationDate(revised)
  if (revStr) parts.push(`Revised: ${revStr}`)

  const accStr = formatPublicationDate(accepted)
  if (accStr) parts.push(`Accepted: ${accStr}`)

  if (parts.length === 0) {
    const today = formatPublicationDate(new Date())
    return `Received: ${today} | Accepted: ${today}`
  }

  return parts.join(' | ')
}

/**
 * Helper to get text content from a DOM element.
 */
function getText(node) {
  if (!node) return ''
  return node.textContent || ''
}

/**
 * Helper to set text inside the first w:t child of an element, or creates one.
 */
function setText(doc, element, text) {
  if (!element) return
  let tNode = element.getElementsByTagNameNS(W_NS, 't')[0]
  if (!tNode) {
    tNode = doc.createElementNS(W_NS, 'w:t')
    element.appendChild(tNode)
  }
  tNode.textContent = text
}

/**
 * Helper to set font on a run element.
 */
export function setRunFont(doc, runNode, fontName) {
  if (!runNode) return
  const prefix = runNode.prefix || doc.documentElement.prefix || 'w'
  let rPr = runNode.getElementsByTagNameNS(W_NS, 'rPr')[0]
  if (!rPr) {
    rPr = doc.createElementNS(W_NS, `${prefix}:rPr`)
    runNode.insertBefore(rPr, runNode.firstChild)
  }
  let rFonts = rPr.getElementsByTagNameNS(W_NS, 'rFonts')[0]
  if (!rFonts) {
    rFonts = doc.createElementNS(W_NS, `${prefix}:rFonts`)
    rPr.insertBefore(rFonts, rPr.firstChild)
  }
  rFonts.setAttributeNS(W_NS, `${prefix}:ascii`, fontName)
  rFonts.setAttributeNS(W_NS, `${prefix}:hAnsi`, fontName)
  rFonts.setAttributeNS(W_NS, `${prefix}:cs`, fontName)
}

/**
 * Helper to set default run font on a paragraph element.
 */
export function setParagraphFont(doc, pNode, fontName) {
  if (!pNode) return
  const prefix = pNode.prefix || doc.documentElement.prefix || 'w'
  let pPr = pNode.getElementsByTagNameNS(W_NS, 'pPr')[0]
  if (!pPr) {
    pPr = doc.createElementNS(W_NS, `${prefix}:pPr`)
    pNode.insertBefore(pPr, pNode.firstChild)
  }
  let rPr = pPr.getElementsByTagNameNS(W_NS, 'rPr')[0]
  if (!rPr) {
    rPr = doc.createElementNS(W_NS, `${prefix}:rPr`)
    pPr.appendChild(rPr)
  }
  let rFonts = rPr.getElementsByTagNameNS(W_NS, 'rFonts')[0]
  if (!rFonts) {
    rFonts = doc.createElementNS(W_NS, `${prefix}:rFonts`)
    rPr.insertBefore(rFonts, rPr.firstChild)
  }
  rFonts.setAttributeNS(W_NS, `${prefix}:ascii`, fontName)
  rFonts.setAttributeNS(W_NS, `${prefix}:hAnsi`, fontName)
  rFonts.setAttributeNS(W_NS, `${prefix}:cs`, fontName)
}

/**
 * Derives the canonical DOI string, URL, and formatted display line.
 */
export function deriveCanonicalDoiUrl(rawDoi, submissionNumber, manuscriptId) {
  let cleanDoi = ''
  if (rawDoi && typeof rawDoi === 'string') {
    cleanDoi = rawDoi.replace(/^https?:\/\/doi\.org\//i, '').replace(/^doi:\s*/i, '').trim()
  }
  if (!cleanDoi) {
    if (submissionNumber) {
      cleanDoi = `10.68968/${submissionNumber.replace(/-/g, '_')}`
    } else {
      cleanDoi = `10.68968/IJIDCR_${String(manuscriptId || '26_00001').replace(/-/g, '_').slice(0, 10)}`
    }
  }
  return {
    cleanDoi,
    doiUrl: `https://doi.org/${cleanDoi}`,
    doiText: `DOI: ${cleanDoi}`,
  }
}

/**
 * Formats a single Crossref paragraph inside the badge shape.
 */
function formatCrossrefParagraph(doc, p, text, halfPtSize, rId = null) {
  const prefix = p.prefix || 'w'
  while (p.firstChild) {
    p.removeChild(p.firstChild)
  }

  const pPr = doc.createElementNS(W_NS, `${prefix}:pPr`)
  const jc = doc.createElementNS(W_NS, `${prefix}:jc`)
  jc.setAttributeNS(W_NS, `${prefix}:val`, 'center')
  pPr.appendChild(jc)

  const spacing = doc.createElementNS(W_NS, `${prefix}:spacing`)
  spacing.setAttributeNS(W_NS, `${prefix}:line`, '180')
  spacing.setAttributeNS(W_NS, `${prefix}:lineRule`, 'auto')
  spacing.setAttributeNS(W_NS, `${prefix}:before`, '0')
  spacing.setAttributeNS(W_NS, `${prefix}:after`, '0')
  pPr.appendChild(spacing)
  p.appendChild(pPr)

  const r = doc.createElementNS(W_NS, `${prefix}:r`)
  const rPr = doc.createElementNS(W_NS, `${prefix}:rPr`)
  const b = doc.createElementNS(W_NS, `${prefix}:b`)
  rPr.appendChild(b)

  const sz = doc.createElementNS(W_NS, `${prefix}:sz`)
  sz.setAttributeNS(W_NS, `${prefix}:val`, String(halfPtSize))
  rPr.appendChild(sz)

  const szCs = doc.createElementNS(W_NS, `${prefix}:szCs`)
  szCs.setAttributeNS(W_NS, `${prefix}:val`, String(halfPtSize))
  rPr.appendChild(szCs)

  const rFonts = doc.createElementNS(W_NS, `${prefix}:rFonts`)
  rFonts.setAttributeNS(W_NS, `${prefix}:ascii`, 'Tw Cen MT')
  rFonts.setAttributeNS(W_NS, `${prefix}:hAnsi`, 'Tw Cen MT')
  rPr.appendChild(rFonts)

  r.appendChild(rPr)

  const t = doc.createElementNS(W_NS, `${prefix}:t`)
  t.textContent = text
  r.appendChild(t)

  if (rId) {
    const hlink = doc.createElementNS(W_NS, `${prefix}:hyperlink`)
    hlink.setAttributeNS(R_NS, 'r:id', rId)
    hlink.appendChild(r)
    p.appendChild(hlink)
  } else {
    p.appendChild(r)
  }
}

/**
 * Ensures the Crossref badge is styled to compact size (52x26 pt), positioned
 * to the right side of Article ID above topic, and configured as a clickable DOI hyperlink.
 */
export function repositionCrossrefLogo(doc, body, relsDoc = null, doiUrl = null) {
  const paragraphs = Array.from(body.getElementsByTagNameNS(W_NS, 'p'))
  let articleIdP = null
  let crossrefRun = null
  let crossrefP = null

  for (const p of paragraphs) {
    const text = (p.textContent || '').trim()
    if (text.includes('Article ID:')) {
      articleIdP = p
    }
    const runs = Array.from(p.getElementsByTagNameNS(W_NS, 'r'))
    for (const r of runs) {
      const rText = r.textContent || ''
      if (
        rText.includes('Crossref') &&
        (r.getElementsByTagNameNS(W_NS, 'drawing').length > 0 ||
         r.getElementsByTagNameNS(W_NS, 'pict').length > 0)
      ) {
        crossrefRun = r
        crossrefP = p
        break
      }
    }
  }

  if (!crossrefRun) return

  // Register external hyperlink relationship in relsDoc if provided
  if (relsDoc && doiUrl) {
    const rels = relsDoc.getElementsByTagName('Relationship')
    let existingRel = null
    for (let i = 0; i < rels.length; i++) {
      if (rels[i].getAttribute('Id') === 'rIdDoiCrossref') {
        existingRel = rels[i]
        break
      }
    }
    if (!existingRel) {
      existingRel = relsDoc.createElement('Relationship')
      existingRel.setAttribute('Id', 'rIdDoiCrossref')
      existingRel.setAttribute('Type', 'http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink')
      existingRel.setAttribute('TargetMode', 'External')
      relsDoc.documentElement.appendChild(existingRel)
    }
    existingRel.setAttribute('Target', doiUrl)
  }

  // Update DrawingML extent to compact dimensions: 52 pt width (660400 EMUs), 26 pt height (330200 EMUs)
  const extents = Array.from(crossrefRun.getElementsByTagNameNS(WP_NS, 'extent'))
  for (const ext of extents) {
    ext.setAttribute('cx', '660400')
    ext.setAttribute('cy', '330200')
  }
  const aExtents = Array.from(crossrefRun.getElementsByTagNameNS(A_NS, 'ext'))
  for (const ext of aExtents) {
    ext.setAttribute('cx', '660400')
    ext.setAttribute('cy', '330200')
  }

  // Position drawing to the far right margin and vertically aligned with Article ID box
  const posH = crossrefRun.getElementsByTagNameNS(WP_NS, 'positionH')[0]
  if (posH) {
    posH.setAttribute('relativeFrom', 'column')
    let offset = posH.getElementsByTagNameNS(WP_NS, 'posOffset')[0]
    if (!offset) {
      const prefix = posH.prefix ? `${posH.prefix}:` : ''
      offset = doc.createElementNS(WP_NS, `${prefix}posOffset`)
      posH.appendChild(offset)
    }
    offset.textContent = '5537200'
  }

  const posV = crossrefRun.getElementsByTagNameNS(WP_NS, 'positionV')[0]
  if (posV) {
    posV.setAttribute('relativeFrom', 'paragraph')
    let offset = posV.getElementsByTagNameNS(WP_NS, 'posOffset')[0]
    if (!offset) {
      const prefix = posV.prefix ? `${posV.prefix}:` : ''
      offset = doc.createElementNS(WP_NS, `${prefix}posOffset`)
      posV.appendChild(offset)
    }
    offset.textContent = '-30000'
  }

  // Add click action to DrawingML docPr
  if (relsDoc && doiUrl) {
    const docPrList = Array.from(crossrefRun.getElementsByTagNameNS(WP_NS, 'docPr'))
    if (docPrList.length === 0) {
      docPrList.push(...Array.from(crossrefRun.getElementsByTagName('wp:docPr')))
    }
    for (const docPr of docPrList) {
      let hlinkClick = docPr.getElementsByTagNameNS(A_NS, 'hlinkClick')[0] || docPr.getElementsByTagName('a:hlinkClick')[0]
      if (!hlinkClick) {
        hlinkClick = doc.createElementNS(A_NS, 'a:hlinkClick')
        docPr.appendChild(hlinkClick)
      }
      hlinkClick.setAttributeNS(R_NS, 'r:id', 'rIdDoiCrossref')
    }
  }

  // Format text content inside shape as 2 compact lines with hyperlink
  const txbxList = Array.from(crossrefRun.getElementsByTagNameNS(W_NS, 'txbxContent'))
  for (const txbx of txbxList) {
    let pList = Array.from(txbx.getElementsByTagNameNS(W_NS, 'p'))
    if (pList.length === 0) pList = Array.from(txbx.getElementsByTagNameNS('*', 'p'))

    const rId = relsDoc && doiUrl ? 'rIdDoiCrossref' : null
    if (pList.length >= 2) {
      formatCrossrefParagraph(doc, pList[0], 'Crossref', 15, rId)
      formatCrossrefParagraph(doc, pList[1], 'for updates', 13, rId)
    } else if (pList.length === 1) {
      const p1 = pList[0]
      const prefix = p1.prefix || 'w'
      formatCrossrefParagraph(doc, p1, 'Crossref', 15, rId)
      const p2 = doc.createElementNS(W_NS, `${prefix}:p`)
      formatCrossrefParagraph(doc, p2, 'for updates', 13, rId)
      txbx.appendChild(p2)
    }
  }

  // Tight internal margins (padding) inside shape
  const bodyPrList = Array.from(crossrefRun.getElementsByTagNameNS('*', 'bodyPr'))
  for (const bodyPr of bodyPrList) {
    bodyPr.setAttribute('lIns', '12700')
    bodyPr.setAttribute('tIns', '12700')
    bodyPr.setAttribute('rIns', '12700')
    bodyPr.setAttribute('bIns', '12700')
  }

  // Update VML Fallback rect style and href if present
  const vmlRects = Array.from(crossrefRun.getElementsByTagNameNS(VML_NS, 'rect'))
  for (const rect of vmlRects) {
    let style = rect.getAttribute('style') || ''
    style = style.replace(/margin-left:[^;]+;/i, 'margin-left:436.0pt;')
    style = style.replace(/margin-top:[^;]+;/i, 'margin-top:-2.4pt;')
    style = style.replace(/width:[^;]+;/i, 'width:52pt;')
    style = style.replace(/height:[^;]+;/i, 'height:26pt;')
    if (!style.includes('margin-left:436.0pt;')) {
      style = `margin-left:436.0pt;${style}`
    }
    if (!style.includes('margin-top:-2.4pt;')) {
      style = `margin-top:-2.4pt;${style}`
    }
    if (!style.includes('width:52pt;')) {
      style = `width:52pt;${style}`
    }
    if (!style.includes('height:26pt;')) {
      style = `height:26pt;${style}`
    }
    rect.setAttribute('style', style)
    if (doiUrl) {
      rect.setAttribute('href', doiUrl)
    }
  }

  // If crossref was in a separate paragraph below, move it into the Article ID paragraph
  if (articleIdP && crossrefP && crossrefP !== articleIdP) {
    articleIdP.appendChild(crossrefRun)
    const remainingText = (crossrefP.textContent || '').trim()
    if (!remainingText || remainingText === 'Crossref for updates' || remainingText === 'Crossref') {
      if (crossrefP.parentNode) {
        crossrefP.parentNode.removeChild(crossrefP)
      }
    }
  }
}

/**
 * Copies embedded images from author package into the publication package.
 */
async function copyAuthorMedia(authorZip, targetZip, targetRelsDoc, targetTypesDoc) {
  const relIdMap = new Map()

  const authorRelsXml = await authorZip.file('word/_rels/document.xml.rels')?.async('string')
  if (!authorRelsXml) return relIdMap

  const authorRelsDoc = new DOMParser().parseFromString(authorRelsXml, 'text/xml')
  const authorRels = authorRelsDoc.getElementsByTagName('Relationship')

  // Find highest existing rId in target
  const targetRels = targetRelsDoc.getElementsByTagName('Relationship')
  let maxRId = 20
  for (let i = 0; i < targetRels.length; i++) {
    const id = targetRels[i].getAttribute('Id') || ''
    const num = parseInt(id.replace(/\D/g, ''), 10)
    if (!isNaN(num) && num > maxRId) maxRId = num
  }

  for (let i = 0; i < authorRels.length; i++) {
    const rel = authorRels[i]
    const type = rel.getAttribute('Type') || ''
    const target = rel.getAttribute('Target') || ''
    const oldId = rel.getAttribute('Id') || ''

    if (type.includes('image')) {
      const authorImgPath = target.startsWith('media/') ? `word/${target}` : `word/${target.replace(/^..\//, '')}`
      const imgFile = authorZip.file(authorImgPath)
      if (imgFile) {
        maxRId += 1
        const newId = `rId${maxRId}`
        const ext = path.extname(target) || '.png'
        const newFilename = `auth_img_${maxRId}${ext}`
        const newTargetPath = `media/${newFilename}`

        const imgBuffer = await imgFile.async('nodebuffer')
        targetZip.file(`word/${newTargetPath}`, imgBuffer)

        // Add to target rels
        const newRel = targetRelsDoc.createElement('Relationship')
        newRel.setAttribute('Id', newId)
        newRel.setAttribute('Type', type)
        newRel.setAttribute('Target', newTargetPath)
        targetRelsDoc.documentElement.appendChild(newRel)

        // Ensure extension in [Content_Types].xml
        const cleanExt = ext.replace(/^\./, '').toLowerCase()
        const typesRoot = targetTypesDoc.documentElement
        const defaults = typesRoot.getElementsByTagName('Default')
        let hasExt = false
        for (let j = 0; j < defaults.length; j++) {
          if (defaults[j].getAttribute('Extension')?.toLowerCase() === cleanExt) {
            hasExt = true
            break
          }
        }
        if (!hasExt) {
          const newDef = targetTypesDoc.createElement('Default')
          newDef.setAttribute('Extension', cleanExt)
          newDef.setAttribute('ContentType', cleanExt === 'jpg' ? 'image/jpeg' : `image/${cleanExt}`)
          typesRoot.appendChild(newDef)
        }

        relIdMap.set(oldId, newId)
      }
    }
  }

  return relIdMap
}

/**
 * Compares two title strings ignoring case, punctuation, and 'title:' prefix.
 */
export function isMatchingTitle(text, title) {
  if (!text || !title) return false
  const cleanText = text
    .toLowerCase()
    .replace(/^title:\s*/i, '')
    .replace(/[^a-z0-9]/g, '')
  const cleanTitle = title
    .toLowerCase()
    .replace(/^title:\s*/i, '')
    .replace(/[^a-z0-9]/g, '')
  if (cleanText.length < 5 || cleanTitle.length < 5) return false
  return cleanText === cleanTitle
}

/**
 * Extracts body paragraphs, headings, tables, and figures from author document,
 * stripping front-matter (title, authors, abstract, keywords) to prevent duplicate titles.
 */
async function extractAuthorBodyElements(authorZip, relIdMap, parser, context = {}) {
  const authorDocXml = await authorZip.file('word/document.xml')?.async('string')
  if (!authorDocXml) return []

  const authorDoc = parser.parseFromString(authorDocXml, 'text/xml')
  const authorBody = authorDoc.getElementsByTagNameNS(W_NS, 'body')[0]
  if (!authorBody) return []

  const titleText = context.manuscript?.title || ''

  const children = Array.from(authorBody.childNodes).filter((n) => n.nodeType === 1) // Element nodes
  const bodyElements = []
  let reachedMainContent = false

  for (const child of children) {
    const tagName = child.localName || child.nodeName.split(':').pop()

    // Skip section properties (we use template's section structure)
    if (tagName === 'sectPr') continue

    const text = (child.textContent || '').trim()

    // If this paragraph matches the manuscript title, skip it unconditionally to prevent duplicate titles
    if (titleText && isMatchingTitle(text, titleText)) {
      continue
    }

    // Detect if this is front-matter (title, authors, abstract, keywords) to avoid duplicating
    if (!reachedMainContent) {
      const lower = text.toLowerCase()
      if (
        lower.startsWith('1. ') ||
        lower.startsWith('1 ') ||
        lower === 'introduction' ||
        lower.startsWith('1. introduction') ||
        lower.startsWith('section 1') ||
        lower.startsWith('i. introduction') ||
        lower.startsWith('1.0') ||
        lower.startsWith('1. background') ||
        lower === 'background' ||
        lower.startsWith('1. overview') ||
        lower === 'overview'
      ) {
        reachedMainContent = true
      } else {
        // Skip all front-matter before main content (title, authors, affiliations, abstract, keywords, blanks)
        continue
      }
    }

    // Skip stray blank lines right at the start of body
    if (!text && bodyElements.length === 0) {
      continue
    }

    // Update image embed references with new rel IDs
    const blips = child.getElementsByTagNameNS('*', 'blip')
    for (let i = 0; i < blips.length; i++) {
      const blip = blips[i]
      const oldEmbed = blip.getAttributeNS(R_NS, 'embed') || blip.getAttribute('r:embed')
      if (oldEmbed && relIdMap.has(oldEmbed)) {
        blip.setAttribute('r:embed', relIdMap.get(oldEmbed))
      }
    }

    bodyElements.push(child)
  }

  // If we never hit an 'Introduction' marker, treat non-empty elements as body but filter out title and front-matter
  if (bodyElements.length === 0 && children.length > 0) {
    return children.filter((n) => {
      const tagName = n.localName || n.nodeName.split(':').pop()
      if (tagName === 'sectPr') return false
      const text = (n.textContent || '').trim()
      if (!text) return false
      if (titleText && isMatchingTitle(text, titleText)) return false
      const lower = text.toLowerCase()
      if (lower.startsWith('abstract') || lower.startsWith('keywords:') || lower.startsWith('correspondence')) return false
      return true
    })
  }

  return bodyElements
}

/**
 * Ensures all section margins have adequate top margin (>= 720 dxa / 36 pt / 0.5 in).
 * This prevents LibreOffice Writer / Word from placing body text on continuous sections
 * into the top header zone (e.g. yMin = 0.45 pt).
 */
export function normalizeSectionMargins(doc) {
  const pgMars = Array.from(doc.getElementsByTagNameNS(W_NS, 'pgMar'))
  for (const pgMar of pgMars) {
    const prefix = pgMar.prefix || 'w'
    const topStr = pgMar.getAttributeNS(W_NS, 'top') || pgMar.getAttribute(`${prefix}:top`) || pgMar.getAttribute('top') || '0'
    const topNum = parseInt(topStr, 10)
    if (isNaN(topNum) || topNum < 720) {
      pgMar.setAttributeNS(W_NS, `${prefix}:top`, '720')
      if (!pgMar.getAttributeNS(W_NS, 'header') && !pgMar.getAttribute(`${prefix}:header`)) {
        pgMar.setAttributeNS(W_NS, `${prefix}:header`, '360')
      }
    }
  }
}

/**
 * Sanitizes and fits all tables to ensure they never bleed outside the margins.
 * Specifically:
 * 1. Removes floating table positioning (<w:tblpPr>) which causes tables to jump outside margins.
 * 2. Neutralizes negative table indents (<w:tblInd w:w="<0"/>) by resetting to 0.
 * 3. Enforces left alignment (<w:jc w:val="left"/>) so tables align with the column left margin.
 * 4. Scales oversized table columns (<w:gridCol>) and cells (<w:tcW>) so total width fits MAX_COLUMN_WIDTH (4950 dxa).
 * 5. Removes <w:noWrap> on cells and sets fixed table layout to prevent LibreOffice table expansion.
 * 6. Compacts cell font size if table is scaled, ensuring clear readability inside 2-column boundaries.
 */
export function sanitizeAndFitTables(doc, maxColumnWidthDxa = 4950) {
  const tables = Array.from(doc.getElementsByTagNameNS(W_NS, 'tbl'))

  for (const tbl of tables) {
    const prefix = tbl.prefix || 'w'

    // 1. Get or create tblPr
    let tblPr = tbl.getElementsByTagNameNS(W_NS, 'tblPr')[0]
    if (!tblPr) {
      tblPr = doc.createElementNS(W_NS, `${prefix}:tblPr`)
      tbl.insertBefore(tblPr, tbl.firstChild)
    }

    // 2. Remove floating positioning tblpPr (floating tables escape margins in multi-column)
    const tblpPrs = Array.from(tblPr.getElementsByTagNameNS(W_NS, 'tblpPr'))
    for (const p of tblpPrs) {
      tblPr.removeChild(p)
    }

    // 3. Ensure left alignment so table starts at column left margin, never negative
    let jc = tblPr.getElementsByTagNameNS(W_NS, 'jc')[0]
    if (!jc) {
      jc = doc.createElementNS(W_NS, `${prefix}:jc`)
      tblPr.appendChild(jc)
    }
    jc.setAttributeNS(W_NS, `${prefix}:val`, 'left')

    // 4. Ensure table indent tblInd is >= 0 (never negative)
    let tblInd = tblPr.getElementsByTagNameNS(W_NS, 'tblInd')[0]
    if (tblInd) {
      const indVal = parseInt(tblInd.getAttributeNS(W_NS, 'w') || tblInd.getAttribute(`${prefix}:w`) || '0', 10)
      if (indVal < 0) {
        tblInd.setAttributeNS(W_NS, `${prefix}:w`, '0')
      }
    } else {
      tblInd = doc.createElementNS(W_NS, `${prefix}:tblInd`)
      tblInd.setAttributeNS(W_NS, `${prefix}:w`, '0')
      tblInd.setAttributeNS(W_NS, `${prefix}:type`, 'dxa')
      tblPr.appendChild(tblInd)
    }

    // 5. Measure gridCol widths
    const tblGrid = tbl.getElementsByTagNameNS(W_NS, 'tblGrid')[0]
    const gridCols = tblGrid ? Array.from(tblGrid.getElementsByTagNameNS(W_NS, 'gridCol')) : []
    let totalGridWidth = 0
    const colWidths = []

    for (const col of gridCols) {
      const wVal = parseInt(col.getAttributeNS(W_NS, 'w') || col.getAttribute(`${prefix}:w`) || '0', 10)
      colWidths.push(wVal)
      totalGridWidth += wVal
    }

    // Check tblW
    let tblW = tblPr.getElementsByTagNameNS(W_NS, 'tblW')[0]
    const tblWVal = tblW ? parseInt(tblW.getAttributeNS(W_NS, 'w') || tblW.getAttribute(`${prefix}:w`) || '0', 10) : 0
    const effectiveTotalWidth = Math.max(totalGridWidth, tblWVal)

    const shouldScale = effectiveTotalWidth > maxColumnWidthDxa
    const scaleFactor = shouldScale ? maxColumnWidthDxa / effectiveTotalWidth : 1

    if (shouldScale) {
      // Scale gridCol
      for (let c = 0; c < gridCols.length; c++) {
        const newW = Math.max(150, Math.round(colWidths[c] * scaleFactor))
        gridCols[c].setAttributeNS(W_NS, `${prefix}:w`, String(newW))
      }

      // Set tblW to maxColumnWidthDxa
      if (!tblW) {
        tblW = doc.createElementNS(W_NS, `${prefix}:tblW`)
        tblPr.appendChild(tblW)
      }
      tblW.setAttributeNS(W_NS, `${prefix}:w`, String(maxColumnWidthDxa))
      tblW.setAttributeNS(W_NS, `${prefix}:type`, 'dxa')
    }

    // Sanitize cells in all rows
    const cells = Array.from(tbl.getElementsByTagNameNS(W_NS, 'tc'))
    for (const tc of cells) {
      const tcPr = tc.getElementsByTagNameNS(W_NS, 'tcPr')[0]
      if (tcPr) {
        // If table was scaled, scale tcW
        if (shouldScale) {
          const tcW = tcPr.getElementsByTagNameNS(W_NS, 'tcW')[0]
          if (tcW) {
            const curW = parseInt(tcW.getAttributeNS(W_NS, 'w') || tcW.getAttribute(`${prefix}:w`) || '0', 10)
            if (curW > 0) {
              const scaledW = Math.max(150, Math.round(curW * scaleFactor))
              tcW.setAttributeNS(W_NS, `${prefix}:w`, String(scaledW))
              tcW.setAttributeNS(W_NS, `${prefix}:type`, 'dxa')
            }
          }
        }
        // Remove noWrap so text wraps inside narrow columns
        const noWraps = Array.from(tcPr.getElementsByTagNameNS(W_NS, 'noWrap'))
        for (const nw of noWraps) {
          tcPr.removeChild(nw)
        }
      }

      // If table is wide and scaled down, ensure text inside cells wraps and has compact font
      if (shouldScale && gridCols.length >= 4) {
        const runs = Array.from(tc.getElementsByTagNameNS(W_NS, 'r'))
        for (const r of runs) {
          const rPr = r.getElementsByTagNameNS(W_NS, 'rPr')[0]
          if (rPr) {
            const sz = rPr.getElementsByTagNameNS(W_NS, 'sz')[0]
            if (sz) {
              const szVal = parseInt(sz.getAttributeNS(W_NS, 'val') || sz.getAttribute(`${prefix}:val`) || '20', 10)
              if (szVal > 15) {
                sz.setAttributeNS(W_NS, `${prefix}:val`, '15')
              }
            }
            const szCs = rPr.getElementsByTagNameNS(W_NS, 'szCs')[0]
            if (szCs) {
              const szCsVal = parseInt(szCs.getAttributeNS(W_NS, 'val') || szCs.getAttribute(`${prefix}:val`) || '20', 10)
              if (szCsVal > 15) {
                szCs.setAttributeNS(W_NS, `${prefix}:val`, '15')
              }
            }
          }
        }
      }
    }

    // Set fixed layout to prevent expansion beyond column boundaries
    let tblLayout = tblPr.getElementsByTagNameNS(W_NS, 'tblLayout')[0]
    if (!tblLayout) {
      tblLayout = doc.createElementNS(W_NS, `${prefix}:tblLayout`)
      tblPr.appendChild(tblLayout)
    }
    tblLayout.setAttributeNS(W_NS, `${prefix}:type`, 'fixed')
  }
}

/**
 * Injects Received / Revised / Accepted dates into the date box (Rectangle 2)
 * in the publication header and replaces any existing date placeholders.
 */
export function updateDatesInDocument(doc, body, datesLine) {
  if (!datesLine) return false

  let datesUpdated = false
  const paragraphs = Array.from(body.getElementsByTagNameNS(W_NS, 'p'))

  for (const p of paragraphs) {
    const text = (p.textContent || '').trim()

    // 1. Update the date box shape (Rectangle 2) anchored in Article ID paragraph
    if (text.includes('Article ID:')) {
      const txbxList = Array.from(p.getElementsByTagNameNS(W_NS, 'txbxContent'))
      for (const txbx of txbxList) {
        // Skip Crossref drawing textbox
        if (txbx.textContent && txbx.textContent.includes('Crossref')) {
          continue
        }
        let innerP = txbx.getElementsByTagNameNS(W_NS, 'p')[0]
        if (!innerP) {
          const prefix = p.prefix || 'w'
          innerP = doc.createElementNS(W_NS, `${prefix}:p`)
          txbx.appendChild(innerP)
        }
        let innerR = innerP.getElementsByTagNameNS(W_NS, 'r')[0]
        if (!innerR) {
          const prefix = p.prefix || 'w'
          innerR = doc.createElementNS(W_NS, `${prefix}:r`)
          innerP.appendChild(innerR)
        }
        // Ensure bold Tw Cen MT styling matching reference design
        const prefix = innerR.prefix || p.prefix || 'w'
        let rPr = innerR.getElementsByTagNameNS(W_NS, 'rPr')[0]
        if (!rPr) {
          rPr = doc.createElementNS(W_NS, `${prefix}:rPr`)
          innerR.insertBefore(rPr, innerR.firstChild)
        }
        let rFonts = rPr.getElementsByTagNameNS(W_NS, 'rFonts')[0]
        if (!rFonts) {
          rFonts = doc.createElementNS(W_NS, `${prefix}:rFonts`)
          rPr.appendChild(rFonts)
        }
        rFonts.setAttributeNS(W_NS, `${prefix}:ascii`, 'Tw Cen MT')
        rFonts.setAttributeNS(W_NS, `${prefix}:hAnsi`, 'Tw Cen MT')

        let bold = rPr.getElementsByTagNameNS(W_NS, 'b')[0]
        if (!bold) {
          bold = doc.createElementNS(W_NS, `${prefix}:b`)
          rPr.appendChild(bold)
        }

        setText(doc, innerR, datesLine)
        datesUpdated = true
      }
    }

    // 2. Also check if any standalone paragraph contains Received:
    if (text.includes('Received: 8 August 2019') || text.includes('Received:')) {
      const runs = p.getElementsByTagNameNS(W_NS, 'r')
      for (let i = 0; i < runs.length; i++) {
        const rText = getText(runs[i])
        if (rText.includes('Received:')) {
          setText(doc, runs[i], datesLine)
          datesUpdated = true
        }
      }
    }
  }

  return datesUpdated
}

/**
 * Generates the journal-formatted DOCX buffer using the IJIDCR Master Template.
 *
 * @param {Object} params
 * @param {Buffer} [params.templateBuffer] - Optional custom template buffer
 * @param {Buffer} params.sourceDocxBuffer - Author submitted manuscript DOCX buffer
 * @param {Object} params.context - Publication metadata context
 * @returns {Promise<Buffer>} Formatted DOCX buffer
 */
export async function renderPublicationDocx({ templateBuffer = null, sourceDocxBuffer, context = {} }) {
  if (!Buffer.isBuffer(sourceDocxBuffer) || sourceDocxBuffer.length === 0) {
    throw new AppError('Author source manuscript DOCX buffer is required.', 400)
  }

  const tmplBuf = templateBuffer || (await fs.readFile(TEMPLATE_PATH))
  const targetZip = await JSZip.loadAsync(tmplBuf)
  const authorZip = await JSZip.loadAsync(sourceDocxBuffer)

  const parser = new DOMParser()
  const serializer = new XMLSerializer()

  // 1. Load template XML parts
  const docXmlStr = await targetZip.file('word/document.xml').async('string')
  const relsXmlStr = await targetZip.file('word/_rels/document.xml.rels').async('string')
  const typesXmlStr = await targetZip.file('[Content_Types].xml').async('string')
  const footer1XmlStr = await targetZip.file('word/footer1.xml')?.async('string')
  let fontTableXmlStr = await targetZip.file('word/fontTable.xml')?.async('string')

  const doc = parser.parseFromString(docXmlStr, 'text/xml')
  const relsDoc = parser.parseFromString(relsXmlStr, 'text/xml')
  const typesDoc = parser.parseFromString(typesXmlStr, 'text/xml')

  // 2. Copy author images & relationships
  const relIdMap = await copyAuthorMedia(authorZip, targetZip, relsDoc, typesDoc)

  // 3. Extract author body elements (pass context to filter out front-matter and prevent duplicate title)
  const extractedElements = await extractAuthorBodyElements(authorZip, relIdMap, parser, context)

  // 4. Map publication metadata
  const {
    manuscript = {},
    publication = {},
    authors = [],
    dates = {},
  } = context

  // Map Subject/Category field (e.g. 'Original Research', 'Review Article', 'Case Study')
  // Priority: category_name / category / subject_category -> fallback to article_type -> 'RESEARCH ARTICLE'
  const subjectCategory = (
    manuscript.category_name ||
    manuscript.category ||
    manuscript.subject_category ||
    manuscript.article_type ||
    'RESEARCH ARTICLE'
  ).toUpperCase()
  const articleId = manuscript.submission_number || `IJIDCR-${String(manuscript.id || '26-00001').slice(0, 10)}`
  const volume = publication.volume || 1
  const issue = publication.issue || 1
  const year = publication.publication_year || (publication.published_at ? new Date(publication.published_at).getFullYear() : new Date().getFullYear())

  // DOI display rule: ensure canonical DOI URL and display text are always present
  const rawDoi = publication.doi || manuscript.doi || context.doi || ''
  const { cleanDoi, doiUrl, doiText } = deriveCanonicalDoiUrl(rawDoi, manuscript.submission_number, manuscript.id)

  const datesLine = buildDatesLine(dates)
  const { authorsLine, affiliationsLine, correspondingLine } = formatAuthorsAndAffiliations(authors)

  const titleText = (manuscript.title || 'Untitled Manuscript').toUpperCase()
  const abstractText = (manuscript.abstract || '').trim()
  const keywordsArray = Array.isArray(manuscript.keywords)
    ? manuscript.keywords
    : (manuscript.keywords ? String(manuscript.keywords).split(/[,;]/).map((k) => k.trim()) : [])
  const keywordsLine = keywordsArray.length > 0 ? `Keywords: ${keywordsArray.join('; ')}` : ''

  const copyrightText = `© The Author(s), ${year}. Published by ASGARD International Foundation for Research And Innovation. This article is distributed under the terms of the Creative Commons Attribution 4.0 International License (CC BY 4.0).`

  // 5. Update Template Document XML
  normalizeSectionMargins(doc)
  const body = doc.getElementsByTagNameNS(W_NS, 'body')[0]
  repositionCrossrefLogo(doc, body, relsDoc, doiUrl)
  updateDatesInDocument(doc, body, datesLine)
  const paragraphs = Array.from(body.getElementsByTagNameNS(W_NS, 'p'))

  for (const p of paragraphs) {
    const text = (p.textContent || '').trim()

    // Replace Subject/Category and DOI on Line 1
    if (text.includes('RESEARCH ARTICLE') || text.includes('DOI:') || text.includes('10.68968')) {
      const runs = p.getElementsByTagNameNS(W_NS, 'r')
      for (let i = 0; i < runs.length; i++) {
        const rText = getText(runs[i])
        if (rText.includes('RESEARCH ARTICLE')) {
          setText(doc, runs[i], subjectCategory)
          setRunFont(doc, runs[i], 'Cormorant Garamond')
        } else if (rText.includes('DOI:') || rText.includes('10.68968')) {
          setText(doc, runs[i], doiText)
        }
      }
      // If spacer runs exist between Subject/Category and DOI, normalize so they fit on Line 1
      if (runs.length >= 6) {
        setText(doc, runs[3], '                            ')
        if (runs.length > 4) {
          setText(doc, runs[4], '')
        }
      }
    }

    // Journal Title (INTERNATIONAL JOURNAL OF INTELLIGENT DIGITAL COMPUTING RESEARCH)
    if (text.includes('INTERNATIONAL JOURNAL OF INTELLIGENT DIGITAL COMPUTING RESEARCH')) {
      setParagraphFont(doc, p, 'Cormorant Garamond')
      const runs = p.getElementsByTagNameNS(W_NS, 'r')
      for (let i = 0; i < runs.length; i++) {
        setRunFont(doc, runs[i], 'Cormorant Garamond')
      }
    }

    // Replace Dates
    if (text.includes('Received: 8 August 2019') || text.includes('Received:')) {
      const runs = p.getElementsByTagNameNS(W_NS, 'r')
      for (let i = 0; i < runs.length; i++) {
        const rText = getText(runs[i])
        if (rText.includes('Received:')) {
          setText(doc, runs[i], datesLine || 'Received / Accepted')
        }
      }
    }

    // Replace Article ID & Vol / Issue
    if (text.includes('Article ID: IJIDCR-26-00002') || text.includes('Article ID:')) {
      const runs = p.getElementsByTagNameNS(W_NS, 'r')
      for (let i = 0; i < runs.length; i++) {
        const rText = getText(runs[i])
        if (rText.includes('Article ID:')) {
          setText(doc, runs[i], `Article ID: ${articleId}         Vol. ${volume}, Issue ${issue} (${year})`)
          setRunFont(doc, runs[i], 'Cormorant Garamond')
        }
      }
    }

    // Replace Title
    if (text.includes('AI-ENABLED SMART CAMPUS')) {
      setParagraphFont(doc, p, 'Cormorant Garamond')
      const runs = p.getElementsByTagNameNS(W_NS, 'r')
      if (runs.length > 0) {
        setText(doc, runs[0], titleText)
        setRunFont(doc, runs[0], 'Cormorant Garamond')
        for (let j = 1; j < runs.length; j++) {
          setText(doc, runs[j], '')
        }
      }
    }

    // Replace Authors
    if (text.includes('Dr. A. Kumar¹')) {
      const runs = p.getElementsByTagNameNS(W_NS, 'r')
      if (runs.length > 0) {
        setText(doc, runs[0], authorsLine)
        for (let j = 1; j < runs.length; j++) {
          setText(doc, runs[j], '')
        }
      }
    } else if (text.includes('Dr. B. Priya²') || text.includes('Mr. C. Arun³')) {
      const runs = p.getElementsByTagNameNS(W_NS, 'r')
      for (let j = 0; j < runs.length; j++) {
        setText(doc, runs[j], '')
      }
    }

    // Replace Affiliations & Corresponding Author
    if (text.includes('Department of Computer Science') || text.includes('ABC University')) {
      const runs = p.getElementsByTagNameNS(W_NS, 'r')
      if (runs.length >= 2) {
        setText(doc, runs[0], affiliationsLine)
        setText(doc, runs[1], `\n${correspondingLine}`)
        for (let j = 2; j < runs.length; j++) {
          setText(doc, runs[j], '')
        }
      } else if (runs.length === 1) {
        setText(doc, runs[0], `${affiliationsLine}\n${correspondingLine}`)
      }
    }

    // Replace Copyright statement
    if (text.includes('© The Author(s)') && text.includes('ASGARD')) {
      const runs = p.getElementsByTagNameNS(W_NS, 'r')
      if (runs.length > 0) {
        setText(doc, runs[0], copyrightText)
        for (let j = 1; j < runs.length; j++) {
          setText(doc, runs[j], '')
        }
      }
    }

    // Replace Abstract
    if (text.includes('Smart campuses generate large volumes')) {
      const runs = p.getElementsByTagNameNS(W_NS, 'r')
      if (runs.length > 0) {
        setText(doc, runs[0], abstractText)
        for (let j = 1; j < runs.length; j++) {
          setText(doc, runs[j], '')
        }
      }
    }

    // Replace Keywords
    if (text.includes('Keywords: Artificial Intelligence')) {
      const runs = p.getElementsByTagNameNS(W_NS, 'r')
      if (runs.length > 0) {
        setText(doc, runs[0], keywordsLine)
        for (let j = 1; j < runs.length; j++) {
          setText(doc, runs[j], '')
        }
      }
    }
  }

  // 6. Section 3: Replace {{ARTICLE_BODY}} placeholder with extracted elements
  const allChildren = Array.from(body.childNodes)
  let placeholderIndex = -1
  for (let i = 0; i < allChildren.length; i++) {
    if (getText(allChildren[i]).includes('{{ARTICLE_BODY}}')) {
      placeholderIndex = i
      break
    }
  }

  if (placeholderIndex !== -1) {
    const placeholderNode = allChildren[placeholderIndex]
    // Insert all extracted elements before placeholderNode
    for (const elem of extractedElements) {
      const imported = doc.importNode(elem, true)
      body.insertBefore(imported, placeholderNode)
    }
    // Remove placeholderNode
    body.removeChild(placeholderNode)
  } else {
    // If no placeholder, insert before final sectPr
    const sectPrNodes = body.getElementsByTagNameNS(W_NS, 'sectPr')
    const finalSectPr = sectPrNodes[sectPrNodes.length - 1]
    for (const elem of extractedElements) {
      const imported = doc.importNode(elem, true)
      body.insertBefore(imported, finalSectPr)
    }
  }

  // 6.1 Sanitize and fit all tables to prevent overflow outside left/right margins
  sanitizeAndFitTables(doc)

  // 7. Update Footer XML for near-footer logo ASGARD font
  if (footer1XmlStr) {
    const footerDoc = parser.parseFromString(footer1XmlStr, 'text/xml')
    const footerRuns = Array.from(footerDoc.getElementsByTagNameNS(W_NS, 'r'))
    for (const r of footerRuns) {
      if ((r.textContent || '').includes('ASGARD')) {
        setRunFont(footerDoc, r, 'Cormorant Garamond')
      }
    }
    targetZip.file('word/footer1.xml', serializer.serializeToString(footerDoc))
  }

  // 8. Ensure Cormorant Garamond is in fontTable.xml
  if (fontTableXmlStr) {
    if (!fontTableXmlStr.includes('Cormorant Garamond')) {
      fontTableXmlStr = fontTableXmlStr.replace(
        '</w:fonts>',
        '<w:font w:name="Cormorant Garamond"><w:panose1 w:val="02040603050406030204"/><w:charset w:val="00"/><w:family w:val="roman"/><w:pitch w:val="variable"/><w:sig w:usb0="E00002FF" w:usb1="400004FF" w:usb2="00000000" w:usb3="00000000" w:csb0="0000019F" w:csb1="00000000"/></w:font></w:fonts>'
      )
    }
    targetZip.file('word/fontTable.xml', fontTableXmlStr)
  }

  // 9. Write back XML parts
  targetZip.file('word/document.xml', serializer.serializeToString(doc))
  targetZip.file('word/_rels/document.xml.rels', serializer.serializeToString(relsDoc))
  targetZip.file('[Content_Types].xml', serializer.serializeToString(typesDoc))

  return await targetZip.generateAsync({
    type: 'nodebuffer',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  })
}
