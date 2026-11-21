import { promises as fs } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import JSZip from 'jszip'
import { DOMParser, XMLSerializer } from '@xmldom/xmldom'
import { AppError } from '../../shared/errors/AppError.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// EB Garamond font family
const EB_GARAMOND = 'EB Garamond'

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

// Space reserved after an author name so the ORCID icon stamped onto page 1
// during PDF post-processing (published-manuscript.renderer.js) sits in its own
// gap instead of overlapping the next author when several share a line.
const ORCID_ICON_SPACER = '    '

/**
 * Formats the author list and affiliations block according to the IJIDCR reference design.
 */
export function formatAuthorsAndAffiliations(authors = []) {
  if (!Array.isArray(authors) || authors.length === 0) {
    return {
      authorsLine: 'Author(s)',
      authorEntries: ['Author(s)'],
      affiliationsLine: '',
      correspondingLine: '',
      authorItems: [],
    }
  }

  // Deduplicate affiliations
  const affiliationMap = new Map()
  let affIndex = 1

  const authorItems = []
  const authorEntries = authors.map((a) => {
    const name = [a.first_name, a.last_name].filter(Boolean).join(' ') || a.name || 'Author'
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
    const displayName = `${name}${superTag}${star}`
    const rawOrcid = a.orcid_id || a.orcid || ''
    const validOrcid = typeof rawOrcid === 'string'
      ? rawOrcid.replace(/^https?:\/\/orcid\.org\//i, '').replace(/^orcid\.org\//i, '').trim().toUpperCase()
      : null
    const orcidUrl = validOrcid && /^\d{4}-\d{4}-\d{4}-[\dX]{4}$/.test(validOrcid)
      ? `https://orcid.org/${validOrcid}`
      : (String(rawOrcid).startsWith('http') ? rawOrcid : null)

    authorItems.push({
      ...a,
      name,
      displayName,
      superTag,
      star,
      orcid: validOrcid,
      orcidUrl,
    })

    return displayName
  })

  // Format affiliations
  const affItems = Array.from(affiliationMap.entries()).map(([key, idx]) => {
    return `${toSuperscript(idx)}${key}`
  })

  const correspondingAuthor = authors.find((a) => a.is_corresponding) || authors[0]
  const corrEmail = correspondingAuthor?.email || ''

  return {
    authorsLine: authorEntries.join(', '),
    authorEntries,
    affiliationsLine: affItems.join(' | '),
    correspondingLine: corrEmail ? `Corresponding Author: ${corrEmail}` : '',
    authorItems,
  }
}

/**
 * Builds the received/revised/accepted/published string.
 * Formats across two lines when published is present:
 * Line 1: Received: ... | Accepted: ...
 * Line 2: Published: ...
 */
export function buildDatesLine(dates = {}) {
  const { received, revised, accepted, published } = dates || {}
  const line1Parts = []
  const recStr = formatPublicationDate(received)
  if (recStr) line1Parts.push(`Received: ${recStr}`)

  const revStr = formatPublicationDate(revised)
  if (revStr) line1Parts.push(`Revised: ${revStr}`)

  const accStr = formatPublicationDate(accepted)
  if (accStr) line1Parts.push(`Accepted: ${accStr}`)

  const pubStr = formatPublicationDate(published)

  if (line1Parts.length === 0 && !pubStr) {
    const today = formatPublicationDate(new Date())
    return `Received: ${today} | Accepted: ${today}\nPublished: ${today}`
  }

  const line1 = line1Parts.join(' | ')
  if (pubStr) {
    return line1 ? `${line1}\nPublished: ${pubStr}` : `Published: ${pubStr}`
  }

  return line1
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
  // Keep intentional spacing (e.g. the ORCID icon gap) when Word/LibreOffice
  // would otherwise collapse it.
  if (typeof text === 'string' && /^\s|\s$|\s{2,}/.test(text)) {
    tNode.setAttributeNS('http://www.w3.org/XML/1998/namespace', 'xml:space', 'preserve')
  }
}

/**
 * Helper to set font on a run element.
 */
export function setRunFont(doc, runNode, fontName) {
  if (!runNode) return
  const prefix = runNode.prefix || doc.documentElement?.prefix || 'w'
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
  for (const attr of ['asciiTheme', 'hAnsiTheme', 'cstheme', 'eastAsiaTheme']) {
    if (rFonts.hasAttributeNS(W_NS, attr)) rFonts.removeAttributeNS(W_NS, attr)
    if (rFonts.hasAttribute(`${prefix}:${attr}`)) rFonts.removeAttribute(`${prefix}:${attr}`)
    if (rFonts.hasAttribute(`w:${attr}`)) rFonts.removeAttribute(`w:${attr}`)
  }
}

/**
 * Helper to set default run font on a paragraph element.
 */
export function setParagraphFont(doc, pNode, fontName) {
  if (!pNode) return
  const prefix = pNode.prefix || doc.documentElement?.prefix || 'w'
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
  for (const attr of ['asciiTheme', 'hAnsiTheme', 'cstheme', 'eastAsiaTheme']) {
    if (rFonts.hasAttributeNS(W_NS, attr)) rFonts.removeAttributeNS(W_NS, attr)
    if (rFonts.hasAttribute(`${prefix}:${attr}`)) rFonts.removeAttribute(`${prefix}:${attr}`)
    if (rFonts.hasAttribute(`w:${attr}`)) rFonts.removeAttribute(`w:${attr}`)
  }
}

/**
 * Enforces a global font across all paragraphs and runs throughout
 * the OpenXML document (including titles, headings, body, tables, and footers).
 */
export function enforceGlobalFont(doc, fontName = EB_GARAMOND) {
  if (!doc) return
  const paragraphs = Array.from(doc.getElementsByTagNameNS(W_NS, 'p'))
  for (const p of paragraphs) {
    setParagraphFont(doc, p, fontName)
  }
  const runs = Array.from(doc.getElementsByTagNameNS(W_NS, 'r'))
  for (const r of runs) {
    setRunFont(doc, r, fontName)
  }
}

/**
 * Helper to set text color on a run element.
 */
export function setRunColor(doc, runNode, hexColor) {
  if (!runNode) return
  const prefix = runNode.prefix || doc.documentElement?.prefix || 'w'
  let rPr = runNode.getElementsByTagNameNS(W_NS, 'rPr')[0]
  if (!rPr) {
    rPr = doc.createElementNS(W_NS, `${prefix}:rPr`)
    runNode.insertBefore(rPr, runNode.firstChild)
  }
  let color = rPr.getElementsByTagNameNS(W_NS, 'color')[0]
  if (!color) {
    color = doc.createElementNS(W_NS, `${prefix}:color`)
    rPr.appendChild(color)
  }
  color.setAttributeNS(W_NS, `${prefix}:val`, hexColor)
}

/**
 * Helper to set default run text color on a paragraph element.
 */
export function setParagraphColor(doc, pNode, hexColor) {
  if (!pNode) return
  const prefix = pNode.prefix || doc.documentElement?.prefix || 'w'
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
  let color = rPr.getElementsByTagNameNS(W_NS, 'color')[0]
  if (!color) {
    color = doc.createElementNS(W_NS, `${prefix}:color`)
    rPr.appendChild(color)
  }
  color.setAttributeNS(W_NS, `${prefix}:val`, hexColor)
}

/**
 * Helper to set font size on a run element (in half-points, e.g. 20 = 10pt).
 */
export function setRunFontSize(doc, runNode, halfPoints) {
  if (!runNode) return
  const prefix = runNode.prefix || doc.documentElement?.prefix || 'w'
  let rPr = runNode.getElementsByTagNameNS(W_NS, 'rPr')[0]
  if (!rPr) {
    rPr = doc.createElementNS(W_NS, `${prefix}:rPr`)
    runNode.insertBefore(rPr, runNode.firstChild)
  }
  let sz = rPr.getElementsByTagNameNS(W_NS, 'sz')[0]
  if (!sz) {
    sz = doc.createElementNS(W_NS, `${prefix}:sz`)
    rPr.appendChild(sz)
  }
  sz.setAttributeNS(W_NS, `${prefix}:val`, String(halfPoints))

  let szCs = rPr.getElementsByTagNameNS(W_NS, 'szCs')[0]
  if (!szCs) {
    szCs = doc.createElementNS(W_NS, `${prefix}:szCs`)
    rPr.appendChild(szCs)
  }
  szCs.setAttributeNS(W_NS, `${prefix}:val`, String(halfPoints))
}

/**
 * Helper to set default run font size on a paragraph element (in half-points, e.g. 20 = 10pt).
 */
export function setParagraphFontSize(doc, pNode, halfPoints) {
  if (!pNode) return
  const prefix = pNode.prefix || doc.documentElement?.prefix || 'w'
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
  let sz = rPr.getElementsByTagNameNS(W_NS, 'sz')[0]
  if (!sz) {
    sz = doc.createElementNS(W_NS, `${prefix}:sz`)
    rPr.appendChild(sz)
  }
  sz.setAttributeNS(W_NS, `${prefix}:val`, String(halfPoints))

  let szCs = rPr.getElementsByTagNameNS(W_NS, 'szCs')[0]
  if (!szCs) {
    szCs = doc.createElementNS(W_NS, `${prefix}:szCs`)
    rPr.appendChild(szCs)
  }
  szCs.setAttributeNS(W_NS, `${prefix}:val`, String(halfPoints))
}

/**
 * Helper to set paragraph spacing (e.g. before, after in dxa, where 20 dxa = 1 pt).
 */
export function setParagraphSpacing(doc, pNode, { before, after, line, lineRule } = {}) {
  if (!pNode) return
  const prefix = pNode.prefix || doc.documentElement?.prefix || 'w'
  let pPr = pNode.getElementsByTagNameNS(W_NS, 'pPr')[0]
  if (!pPr) {
    pPr = doc.createElementNS(W_NS, `${prefix}:pPr`)
    pNode.insertBefore(pPr, pNode.firstChild)
  }
  let spacing = pPr.getElementsByTagNameNS(W_NS, 'spacing')[0]
  if (!spacing) {
    spacing = doc.createElementNS(W_NS, `${prefix}:spacing`)
    pPr.insertBefore(spacing, pPr.firstChild)
  }
  if (before !== undefined) {
    spacing.setAttributeNS(W_NS, `${prefix}:before`, String(before))
  }
  if (after !== undefined) {
    spacing.setAttributeNS(W_NS, `${prefix}:after`, String(after))
  }
  if (line !== undefined) {
    spacing.setAttributeNS(W_NS, `${prefix}:line`, String(line))
  }
  if (lineRule !== undefined) {
    spacing.setAttributeNS(W_NS, `${prefix}:lineRule`, String(lineRule))
  }
}

/**
 * Sets text on a run element, converting newline '\n' characters into '<w:br/>' line breaks.
 */
export function setRunWithBreaks(doc, runNode, text) {
  if (!runNode) return
  const prefix = runNode.prefix || doc.documentElement?.prefix || 'w'
  const children = Array.from(runNode.childNodes)
  for (const child of children) {
    const name = child.localName || ''
    if (name === 't' || name === 'br') {
      runNode.removeChild(child)
    }
  }
  const lines = String(text || '').split('\n')
  for (let i = 0; i < lines.length; i++) {
    const t = doc.createElementNS(W_NS, `${prefix}:t`)
    t.setAttribute('xml:space', 'preserve')
    t.textContent = lines[i]
    runNode.appendChild(t)
    if (i < lines.length - 1) {
      const br = doc.createElementNS(W_NS, `${prefix}:br`)
      runNode.appendChild(br)
    }
  }
}

/**
 * Sets multi-line dates inside a textbox paragraph (Tw Cen MT bold 8.5pt, separated by <w:br/>).
 */
export function setDatesInParagraph(doc, pNode, datesLine) {
  if (!pNode) return
  const prefix = pNode.prefix || doc.documentElement?.prefix || 'w'
  const children = Array.from(pNode.childNodes)
  for (const child of children) {
    if (child.nodeType === 1 && (child.localName || '').toLowerCase() === 'ppr') {
      continue
    }
    pNode.removeChild(child)
  }

  const r = doc.createElementNS(W_NS, `${prefix}:r`)
  const rPr = doc.createElementNS(W_NS, `${prefix}:rPr`)
  const rFonts = doc.createElementNS(W_NS, `${prefix}:rFonts`)
  rFonts.setAttributeNS(W_NS, `${prefix}:ascii`, EB_GARAMOND)
  rFonts.setAttributeNS(W_NS, `${prefix}:hAnsi`, EB_GARAMOND)
  rFonts.setAttributeNS(W_NS, `${prefix}:cs`, EB_GARAMOND)
  rPr.appendChild(rFonts)

  const bold = doc.createElementNS(W_NS, `${prefix}:b`)
  rPr.appendChild(bold)

  const sz = doc.createElementNS(W_NS, `${prefix}:sz`)
  sz.setAttributeNS(W_NS, `${prefix}:val`, '17') // 8.5 pt
  rPr.appendChild(sz)

  const szCs = doc.createElementNS(W_NS, `${prefix}:szCs`)
  szCs.setAttributeNS(W_NS, `${prefix}:val`, '17')
  rPr.appendChild(szCs)

  r.appendChild(rPr)

  const lines = String(datesLine || '').split('\n').filter(Boolean)
  for (let idx = 0; idx < lines.length; idx++) {
    const t = doc.createElementNS(W_NS, `${prefix}:t`)
    t.setAttribute('xml:space', 'preserve')
    t.textContent = lines[idx]
    r.appendChild(t)

    if (idx < lines.length - 1) {
      const br = doc.createElementNS(W_NS, `${prefix}:br`)
      r.appendChild(br)
    }
  }

  pNode.appendChild(r)
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
 * Completely removes any legacy Crossref badge shapes and text ("Crossref", "for updates")
 * from the DOCX body. This ensures the old logo is never rendered into the intermediate PDF
 * behind the official "Metadata from Crossref" logo asset.
 *
 * @param {Document} doc - DOM document
 * @param {Element} body - w:body element
 */
export function removeLegacyCrossrefLogo(doc, body) {
  if (!body) return

  // 1. Remove all runs containing Crossref or "for updates" text or associated drawing/pict shapes
  const runs = Array.from(body.getElementsByTagNameNS(W_NS, 'r'))
  for (const r of runs) {
    const text = (r.textContent || '').trim()
    const hasDrawing =
      r.getElementsByTagNameNS(W_NS, 'drawing').length > 0 ||
      r.getElementsByTagNameNS(W_NS, 'pict').length > 0
    if (
      text.includes('Crossref') ||
      text.includes('for updates') ||
      (hasDrawing && (text.includes('Cross') || text.includes('update')))
    ) {
      if (r.parentNode) {
        r.parentNode.removeChild(r)
      }
    }
  }

  // 2. Remove any residual paragraphs that only contained the Crossref badge text
  const paragraphs = Array.from(body.getElementsByTagNameNS(W_NS, 'p'))
  for (const p of paragraphs) {
    const text = (p.textContent || '').trim()
    if (text === 'Crossref' || text === 'for updates' || text === 'Crossref for updates') {
      if (p.parentNode) {
        p.parentNode.removeChild(p)
      }
    }
  }
}

/**
 * Legacy wrapper: ensures the legacy Crossref shape is removed from the DOCX.
 */
export function repositionCrossrefLogo(doc, body, _relsDoc = null, _doiUrl = null) {
  removeLegacyCrossrefLogo(doc, body)
}

// Attempt to replace Crossref logo with new image from Crossref CDN
// Note: DOCX files cannot directly reference external URLs for images.
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
 * Checks whether a paragraph or element is empty (no text, no images, no drawings, no tables).
 */
export function isElementEmpty(element) {
  if (!element) return true
  const text = (element.textContent || '').trim()
  if (text) return false
  const drawings =
    element.getElementsByTagNameNS(WP_NS, 'anchor').length ||
    element.getElementsByTagNameNS(W_NS, 'drawing').length
  if (drawings > 0) return false
  const picts = element.getElementsByTagNameNS(W_NS, 'pict').length
  if (picts > 0) return false
  const tables = element.getElementsByTagNameNS(W_NS, 'tbl').length
  if (tables > 0) return false
  return true
}

/**
 * Sanitizes author body elements to prevent premature column / page breaks,
 * embedded section breaks, and pageBreakBefore flags that leave empty columns.
 */
export function sanitizeAuthorBodyElement(doc, element) {
  if (!element) return

  // 1. Strip embedded sectPr inside pPr
  const sectPrs = Array.from(element.getElementsByTagNameNS(W_NS, 'sectPr'))
  for (const sp of sectPrs) {
    if (sp.parentNode) sp.parentNode.removeChild(sp)
  }

  // 2. Strip manual column breaks and page breaks
  const brs = Array.from(element.getElementsByTagNameNS(W_NS, 'br'))
  for (const br of brs) {
    const type = br.getAttributeNS(W_NS, 'type') || br.getAttribute('w:type')
    if (type === 'column' || type === 'page') {
      if (br.parentNode) br.parentNode.removeChild(br)
    }
  }

  const pBreaks = Array.from(element.getElementsByTagNameNS(W_NS, 'lastRenderedPageBreak'))
  for (const pb of pBreaks) {
    if (pb.parentNode) pb.parentNode.removeChild(pb)
  }

  // 3. Strip pageBreakBefore inside pPr
  const pbBefores = Array.from(element.getElementsByTagNameNS(W_NS, 'pageBreakBefore'))
  for (const pbb of pbBefores) {
    if (pbb.parentNode) pbb.parentNode.removeChild(pbb)
  }

  // 4. Sanitize negative paragraph indents to prevent content shifting into margins
  const pPr = element.getElementsByTagNameNS(W_NS, 'pPr')[0]
  if (pPr) {
    const inds = Array.from(pPr.getElementsByTagNameNS(W_NS, 'ind'))
    for (const ind of inds) {
      const left = parseInt(ind.getAttributeNS(W_NS, 'left') || ind.getAttribute('w:left') || '0', 10)
      if (left < 0) {
        ind.setAttributeNS(W_NS, `${ind.prefix || 'w'}:left`, '0')
      }
      const firstLine = parseInt(ind.getAttributeNS(W_NS, 'firstLine') || ind.getAttribute('w:firstLine') || '0', 10)
      if (firstLine < 0) {
        ind.setAttributeNS(W_NS, `${ind.prefix || 'w'}:firstLine`, '0')
      }
    }
  }
}

/**
 * Extracts body paragraphs, headings, tables, and figures from author document,
 * stripping front-matter (title, authors, abstract, keywords) to prevent duplicate titles,
 * and sanitizing breaks to ensure two-column layout does not produce empty column spaces.
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

    // Skip top-level section properties (we use template's section structure)
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

    // Sanitize element to eliminate stray column/page breaks and embedded sectPr
    sanitizeAuthorBodyElement(authorDoc, child)

    // Skip stray blank lines right at the start of body or consecutive blank lines
    const empty = isElementEmpty(child)
    if (empty) {
      if (bodyElements.length === 0 || isElementEmpty(bodyElements[bodyElements.length - 1])) {
        continue
      }
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
    const fallbackList = children.filter((n) => {
      const tagName = n.localName || n.nodeName.split(':').pop()
      if (tagName === 'sectPr') return false
      const text = (n.textContent || '').trim()
      if (!text) return false
      if (titleText && isMatchingTitle(text, titleText)) return false
      const lower = text.toLowerCase()
      if (lower.startsWith('abstract') || lower.startsWith('keywords:') || lower.startsWith('correspondence')) return false
      return true
    })
    for (const elem of fallbackList) {
      sanitizeAuthorBodyElement(authorDoc, elem)
      if (!isElementEmpty(elem)) {
        bodyElements.push(elem)
      }
    }
  }

  // Pop any trailing empty paragraphs to prevent empty column space at the end
  while (bodyElements.length > 0 && isElementEmpty(bodyElements[bodyElements.length - 1])) {
    bodyElements.pop()
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
      // 1.1 DrawingML dates shape (wps:wsp)
      const wsps = Array.from(p.getElementsByTagNameNS('*', 'wsp'))
      for (const wsp of wsps) {
        // Skip Crossref drawing shape
        const wspText = wsp.textContent || ''
        if (wspText.includes('Crossref')) continue

        // Remove fill & line border (Item 2: remove white rectangle box behind dates)
        let spPr = wsp.getElementsByTagNameNS('*', 'spPr')[0]
        if (spPr) {
          // Remove existing fills
          const fills = Array.from(spPr.childNodes).filter((n) => n.nodeType === 1 && (n.localName || '').endsWith('Fill'))
          for (const f of fills) spPr.removeChild(f)
          const noFill = doc.createElementNS(A_NS, 'a:noFill')
          spPr.appendChild(noFill)

          // Border outline: noFill
          let ln = spPr.getElementsByTagNameNS('*', 'ln')[0]
          if (!ln) {
            ln = doc.createElementNS(A_NS, 'a:ln')
            spPr.appendChild(ln)
          } else {
            while (ln.firstChild) ln.removeChild(ln.firstChild)
          }
          const lnNoFill = doc.createElementNS(A_NS, 'a:noFill')
          ln.appendChild(lnNoFill)

          // Widen shape extent to 410pt (5207000 EMU) and height to 28pt (355600 EMU) to fit Received | Accepted | Published cleanly
          const ext = spPr.getElementsByTagNameNS('*', 'ext')[0]
          if (ext) {
            ext.setAttribute('cx', '5207000')
            ext.setAttribute('cy', '355600')
          }
        }

        // Remove shape theme styles / shadow effects
        const style = wsp.getElementsByTagNameNS('*', 'style')[0]
        if (style && style.parentNode) {
          style.parentNode.removeChild(style)
        }

        // Set body padding to 0 so full width is available
        const bodyPr = wsp.getElementsByTagNameNS('*', 'bodyPr')[0]
        if (bodyPr) {
          bodyPr.setAttribute('lIns', '0')
          bodyPr.setAttribute('tIns', '0')
          bodyPr.setAttribute('rIns', '0')
          bodyPr.setAttribute('bIns', '0')
        }

        // Update anchor extent, remove shadow effects extent, and align to 0 margin (no negative offset)
        let parent = wsp.parentNode
        while (parent && parent !== p) {
          if ((parent.localName || '').toLowerCase() === 'anchor') {
            const ext = parent.getElementsByTagNameNS('*', 'extent')[0]
            if (ext) {
              ext.setAttribute('cx', '5207000')
              ext.setAttribute('cy', '355600')
            }
            const effectExt = parent.getElementsByTagNameNS('*', 'effectExtent')[0]
            if (effectExt) {
              effectExt.setAttribute('l', '0')
              effectExt.setAttribute('t', '0')
              effectExt.setAttribute('r', '0')
              effectExt.setAttribute('b', '0')
            }
            parent.setAttribute('distL', '0')
            parent.setAttribute('distR', '0')
            const posH = parent.getElementsByTagNameNS('*', 'positionH')[0]
            if (posH) {
              const posOffset = posH.getElementsByTagNameNS('*', 'posOffset')[0]
              if (posOffset) {
                posOffset.textContent = '0'
              }
            }
            break
          }
          parent = parent.parentNode
        }

        // Update text run inside txbx
        const txbx = wsp.getElementsByTagNameNS(W_NS, 'txbxContent')[0] || wsp.getElementsByTagNameNS('*', 'txbxContent')[0]
        if (txbx) {
          let innerP = txbx.getElementsByTagNameNS(W_NS, 'p')[0]
          if (!innerP) {
            innerP = doc.createElementNS(W_NS, 'w:p')
            txbx.appendChild(innerP)
          }
          setDatesInParagraph(doc, innerP, datesLine)
          datesUpdated = true
        }
      }

      // 1.2 VML fallback rect (Rectangle 2)
      const vmlRects = Array.from(p.getElementsByTagNameNS(VML_NS, 'rect'))
      for (const rect of vmlRects) {
        const id = rect.getAttribute('id') || ''
        if (id.includes('Rectangle 2') || (!id.includes('Rectangle 1') && !rect.textContent.includes('Crossref'))) {
          rect.setAttribute('fillcolor', 'none')
          rect.setAttribute('filled', 'f')
          rect.setAttribute('stroked', 'f')
          rect.setAttribute('strokecolor', 'none')
          let style = rect.getAttribute('style') || ''
          style = style.replace(/width:[^;]+;/i, 'width:410pt;')
          style = style.replace(/margin-left:[^;]+;/i, 'margin-left:0pt;')
          style = style.replace(/height:[^;]+;/i, 'height:28pt;')
          rect.setAttribute('style', style)
          const shadows = Array.from(rect.getElementsByTagNameNS(VML_NS, 'shadow'))
          for (const s of shadows) {
            s.setAttribute('on', 'f')
          }
          const txbx = rect.getElementsByTagNameNS(W_NS, 'txbxContent')[0] || rect.getElementsByTagNameNS('*', 'txbxContent')[0]
          if (txbx) {
            let innerP = txbx.getElementsByTagNameNS(W_NS, 'p')[0]
            if (innerP) {
              setDatesInParagraph(doc, innerP, datesLine)
            }
          }
        }
      }
    }

    // 2. Also check if any standalone paragraph outside txbxContent contains Received:
    if ((p.parentNode?.localName || '') !== 'txbxContent') {
      if (text.includes('Received: 8 August 2019') || text.includes('Received:')) {
        const runs = Array.from(p.getElementsByTagNameNS(W_NS, 'r'))
        for (let i = 0; i < runs.length; i++) {
          if (runs[i].getElementsByTagNameNS('*', 'drawing').length > 0 || runs[i].getElementsByTagNameNS('*', 'pict').length > 0) continue
          const rText = getText(runs[i])
          if (rText.includes('Received:')) {
            setRunWithBreaks(doc, runs[i], datesLine)
            datesUpdated = true
          }
        }
      }
    }
  }

  return datesUpdated
}

/**
 * Updates footer1.xml to ensure ASGARD branding styling and right-aligned page numbering.
 */
export function updateFooter(footerDoc) {
  if (!footerDoc) return
  const paragraphs = Array.from(footerDoc.getElementsByTagNameNS(W_NS, 'p'))
  for (const p of paragraphs) {
    const text = (p.textContent || '').trim()
    if (text.includes('ASGARD')) {
      const prefix = p.prefix || 'w'

      // 1. Set right tab stop at 10037 dxa
      let pPr = p.getElementsByTagNameNS(W_NS, 'pPr')[0]
      if (!pPr) {
        pPr = footerDoc.createElementNS(W_NS, `${prefix}:pPr`)
        p.insertBefore(pPr, p.firstChild)
      }
      let tabs = pPr.getElementsByTagNameNS(W_NS, 'tabs')[0]
      if (!tabs) {
        tabs = footerDoc.createElementNS(W_NS, `${prefix}:tabs`)
        pPr.appendChild(tabs)
      }
      let rightTab = null
      const tabList = Array.from(tabs.getElementsByTagNameNS(W_NS, 'tab'))
      for (const t of tabList) {
        if ((t.getAttributeNS(W_NS, 'val') || t.getAttribute(`${prefix}:val`)) === 'right') {
          rightTab = t
          break
        }
      }
      if (!rightTab) {
        rightTab = footerDoc.createElementNS(W_NS, `${prefix}:tab`)
        tabs.appendChild(rightTab)
      }
      rightTab.setAttributeNS(W_NS, `${prefix}:val`, 'right')
      rightTab.setAttributeNS(W_NS, `${prefix}:pos`, '10037')

      // 2. Format ASGARD run with EB Garamond and Navy blue color
      const runs = Array.from(p.getElementsByTagNameNS(W_NS, 'r'))
      let asgardRun = null
      for (const r of runs) {
        const rText = (r.textContent || '').trim()
        if (rText.includes('ASGARD')) {
          asgardRun = r
          setRunFont(footerDoc, r, EB_GARAMOND)
          setRunColor(footerDoc, r, '0B1B3A')
        } else if (asgardRun && !r.getElementsByTagNameNS(W_NS, 'fldSimple').length && !r.getElementsByTagNameNS(W_NS, 'tab').length) {
          // Remove stray spacer runs after ASGARD
          if (r.parentNode) r.parentNode.removeChild(r)
        }
      }

      // 3. Check if page number field already exists
      let hasPageField = false
      const flds = Array.from(p.getElementsByTagNameNS(W_NS, 'fldSimple'))
      for (const fld of flds) {
        const instr = fld.getAttributeNS(W_NS, 'instr') || fld.getAttribute('w:instr') || ''
        if (instr.includes('PAGE')) {
          hasPageField = true
          break
        }
      }

      if (!hasPageField) {
        // Tab run to jump to right tab stop
        const tabRun = footerDoc.createElementNS(W_NS, `${prefix}:r`)
        const tabEl = footerDoc.createElementNS(W_NS, `${prefix}:tab`)
        tabRun.appendChild(tabEl)
        p.appendChild(tabRun)

        // "Page " label run
        const labelRun = footerDoc.createElementNS(W_NS, `${prefix}:r`)
        const labelRPr = footerDoc.createElementNS(W_NS, `${prefix}:rPr`)
        const labelFonts = footerDoc.createElementNS(W_NS, `${prefix}:rFonts`)
        labelFonts.setAttributeNS(W_NS, `${prefix}:ascii`, EB_GARAMOND)
        labelFonts.setAttributeNS(W_NS, `${prefix}:hAnsi`, EB_GARAMOND)
        labelFonts.setAttributeNS(W_NS, `${prefix}:cs`, EB_GARAMOND)
        labelRPr.appendChild(labelFonts)
        const labelColor = footerDoc.createElementNS(W_NS, `${prefix}:color`)
        labelColor.setAttributeNS(W_NS, `${prefix}:val`, '0B1B3A')
        labelRPr.appendChild(labelColor)
        const labelBold = footerDoc.createElementNS(W_NS, `${prefix}:b`)
        labelRPr.appendChild(labelBold)
        const labelSz = footerDoc.createElementNS(W_NS, `${prefix}:sz`)
        labelSz.setAttributeNS(W_NS, `${prefix}:val`, '20')
        labelRPr.appendChild(labelSz)
        labelRun.appendChild(labelRPr)
        const labelT = footerDoc.createElementNS(W_NS, `${prefix}:t`)
        labelT.setAttribute('xml:space', 'preserve')
        labelT.textContent = 'Page '
        labelRun.appendChild(labelT)
        p.appendChild(labelRun)

        // Dynamic PAGE field
        const fldSimple = footerDoc.createElementNS(W_NS, `${prefix}:fldSimple`)
        fldSimple.setAttributeNS(W_NS, `${prefix}:instr`, 'PAGE')
        const fieldRun = footerDoc.createElementNS(W_NS, `${prefix}:r`)
        const fieldRPr = footerDoc.createElementNS(W_NS, `${prefix}:rPr`)
        const fieldFonts = footerDoc.createElementNS(W_NS, `${prefix}:rFonts`)
        fieldFonts.setAttributeNS(W_NS, `${prefix}:ascii`, EB_GARAMOND)
        fieldFonts.setAttributeNS(W_NS, `${prefix}:hAnsi`, EB_GARAMOND)
        fieldFonts.setAttributeNS(W_NS, `${prefix}:cs`, EB_GARAMOND)
        fieldRPr.appendChild(fieldFonts)
        const fieldColor = footerDoc.createElementNS(W_NS, `${prefix}:color`)
        fieldColor.setAttributeNS(W_NS, `${prefix}:val`, '0B1B3A')
        fieldRPr.appendChild(fieldColor)
        const fieldBold = footerDoc.createElementNS(W_NS, `${prefix}:b`)
        fieldRPr.appendChild(fieldBold)
        const fieldSz = footerDoc.createElementNS(W_NS, `${prefix}:sz`)
        fieldSz.setAttributeNS(W_NS, `${prefix}:val`, '20')
        fieldRPr.appendChild(fieldSz)
        fieldRun.appendChild(fieldRPr)
        const fieldT = footerDoc.createElementNS(W_NS, `${prefix}:t`)
        fieldT.textContent = '1'
        fieldRun.appendChild(fieldT)
        fldSimple.appendChild(fieldRun)
        p.appendChild(fldSimple)
      }
    }
  }
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
  ).toUpperCase().trim()
  const articleId = manuscript.submission_number || `IJIDCR-${String(manuscript.id || '26-00001').slice(0, 10)}`
  const volume = publication.volume || 1
  const issue = publication.issue || 1
  const year = publication.publication_year || (publication.published_at ? new Date(publication.published_at).getFullYear() : new Date().getFullYear())

  // DOI display rule: ensure canonical DOI URL and display text are always present
  const rawDoi = publication.doi || manuscript.doi || context.doi || ''
  const { doiUrl, doiText } = deriveCanonicalDoiUrl(rawDoi, manuscript.submission_number, manuscript.id)

  const datesLine = buildDatesLine(dates)
  const { authorsLine, authorEntries = [], authorItems = [], affiliationsLine, correspondingLine } = formatAuthorsAndAffiliations(authors)

  // Only reserve an icon gap for authors whose ORCID will actually be stamped.
  const orcidGap = (idx) => {
    const url = authorItems[idx]?.orcidUrl || ''
    return url.startsWith('https://orcid.org/') ? ORCID_ICON_SPACER : ''
  }

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
    if ((p.parentNode?.localName || '') === 'txbxContent') {
      continue
    }
    const text = (p.textContent || '').trim()

    // Replace Subject/Category and DOI on Line 1
    if (text.includes('RESEARCH ARTICLE') || text.includes('DOI:') || text.includes('10.68968')) {
      // 1. Remove underline from paragraph properties (pPr) if present
      const pPr = p.getElementsByTagNameNS(W_NS, 'pPr')[0]
      if (pPr) {
        const uEls = Array.from(pPr.getElementsByTagNameNS(W_NS, 'u'))
        for (const u of uEls) {
          pPr.removeChild(u)
        }
      }

      const runs = p.getElementsByTagNameNS(W_NS, 'r')
      for (let i = 0; i < runs.length; i++) {
        const rText = getText(runs[i])
        if (rText.includes('RESEARCH ARTICLE')) {
          setText(doc, runs[i], subjectCategory)
          setRunFont(doc, runs[i], EB_GARAMOND)
          setRunColor(doc, runs[i], 'C4A24C') // rgb(196, 162, 76) - Subject/Category color
          // Make Subject/Category bold
          let rPr = runs[i].getElementsByTagNameNS(W_NS, 'rPr')[0]
          if (!rPr) {
            rPr = doc.createElementNS(W_NS, `${runs[i].prefix || 'w'}:rPr`)
            runs[i].insertBefore(rPr, runs[i].firstChild)
          }
          let bEl = rPr.getElementsByTagNameNS(W_NS, 'b')[0]
          if (!bEl) {
            bEl = doc.createElementNS(W_NS, `${runs[i].prefix || 'w'}:b`)
            rPr.appendChild(bEl)
          }
          // Ensure ONLY this run has underline
          rPr = runs[i].getElementsByTagNameNS(W_NS, 'rPr')[0]
          if (!rPr) {
            rPr = doc.createElementNS(W_NS, `${runs[i].prefix || 'w'}:rPr`)
            runs[i].insertBefore(rPr, runs[i].firstChild)
          }
          let uEl = rPr.getElementsByTagNameNS(W_NS, 'u')[0]
          if (!uEl) {
            uEl = doc.createElementNS(W_NS, `${runs[i].prefix || 'w'}:u`)
            rPr.appendChild(uEl)
          }
          uEl.setAttributeNS(W_NS, `${runs[i].prefix || 'w'}:val`, 'single')
        } else if (rText.includes('DOI:') || rText.includes('10.68968')) {
          setText(doc, runs[i], doiText)
          const rPr = runs[i].getElementsByTagNameNS(W_NS, 'rPr')[0]
          if (rPr) {
            const uEls = Array.from(rPr.getElementsByTagNameNS(W_NS, 'u'))
            for (const u of uEls) rPr.removeChild(u)
          }
        } else {
          // Spacer runs between Category and DOI must NOT have underline
          const rPr = runs[i].getElementsByTagNameNS(W_NS, 'rPr')[0]
          if (rPr) {
            const uEls = Array.from(rPr.getElementsByTagNameNS(W_NS, 'u'))
            for (const u of uEls) rPr.removeChild(u)
          }
        }
      }
      // If spacer runs exist between Subject/Category and DOI, normalize so they fit on Line 1
      if (runs.length >= 6) {
        if (runs[1]) {
          const rPr = runs[1].getElementsByTagNameNS(W_NS, 'rPr')[0]
          if (rPr) {
            const uEls = Array.from(rPr.getElementsByTagNameNS(W_NS, 'u'))
            for (const u of uEls) rPr.removeChild(u)
          }
          setText(doc, runs[1], '')
        }
        setText(doc, runs[3], '                            ')
        if (runs.length > 4) {
          setText(doc, runs[4], '')
        }
      }
    }

    // Journal Title (INTERNATIONAL JOURNAL OF INTELLIGENT DIGITAL COMPUTING RESEARCH)
    if (text.includes('INTERNATIONAL JOURNAL OF INTELLIGENT DIGITAL COMPUTING RESEARCH')) {
      setParagraphFont(doc, p, EB_GARAMOND)
      setParagraphColor(doc, p, '0B1B3A')
      setParagraphFontSize(doc, p, 26) // 13pt (increased from 11pt / sz="22") ensures prominent, authoritative header presence
      const pPr = p.getElementsByTagNameNS(W_NS, 'pPr')[0]
      if (pPr) {
        let spacing = pPr.getElementsByTagNameNS(W_NS, 'spacing')[0]
        if (!spacing) {
          spacing = doc.createElementNS(W_NS, 'w:spacing')
          pPr.appendChild(spacing)
        }
        spacing.setAttributeNS(W_NS, 'w:line', '280')
        spacing.setAttributeNS(W_NS, 'w:lineRule', 'auto')
      }
      const runs = p.getElementsByTagNameNS(W_NS, 'r')
      for (let i = 0; i < runs.length; i++) {
        setRunFont(doc, runs[i], EB_GARAMOND)
        setRunColor(doc, runs[i], '0B1B3A')
        setRunFontSize(doc, runs[i], 26)
      }
    }

    // Replace Article ID & Vol / Issue
    if (text.includes('Article ID: IJIDCR-26-00002') || text.includes('Article ID:')) {
      const runs = p.getElementsByTagNameNS(W_NS, 'r')
      for (let i = 0; i < runs.length; i++) {
        const rText = getText(runs[i])
        if (rText.includes('Article ID:')) {
          setText(doc, runs[i], `Article ID: ${articleId}         Vol. ${volume}, Issue ${issue} (${year})`)
          setRunFont(doc, runs[i], EB_GARAMOND)
        }
      }
    }

    // Replace Title
    if (text.includes('AI-ENABLED SMART CAMPUS')) {
      setParagraphFont(doc, p, EB_GARAMOND)
      setParagraphFontSize(doc, p, 28) // 14pt (decreased from 16pt / sz=32 to improve visual hierarchy and line space)
      setParagraphSpacing(doc, p, { before: 360, after: 120, line: 360, lineRule: 'auto' }) // 18pt space between dates block and title
      const runs = p.getElementsByTagNameNS(W_NS, 'r')
      if (runs.length > 0) {
        setText(doc, runs[0], titleText)
        setRunFont(doc, runs[0], EB_GARAMOND)
        setRunFontSize(doc, runs[0], 28)
        setRunColor(doc, runs[0], 'C4A24C') // rgb(196, 162, 76) - Manuscript/Category color
        for (let j = 1; j < runs.length; j++) {
          setText(doc, runs[j], '')
        }
      }
    }

    // Replace Authors
    if (text.includes('Dr. A. Kumar¹')) {
      const runs = p.getElementsByTagNameNS(W_NS, 'r')
      if (runs.length > 0) {
        if (authorEntries.length <= 1) {
          setText(doc, runs[0], (authorEntries[0] || authorsLine) + orcidGap(0))
        } else {
          setText(doc, runs[0], (authorEntries[0] || authorsLine) + ',' + orcidGap(0))
        }
        // Set EB Garamond font and increased size for author names
        setRunFont(doc, runs[0], EB_GARAMOND)
        setRunFontSize(doc, runs[0], 24) // 12pt (increased from 11pt template default)
        for (let j = 1; j < runs.length; j++) {
          setText(doc, runs[j], '')
        }
      }
    } else if (text.includes('Dr. B. Priya²')) {
      const runs = p.getElementsByTagNameNS(W_NS, 'r')
      if (authorEntries.length >= 2) {
        const comma = authorEntries.length > 2 ? ',' : ''
        if (runs.length > 0) {
          setText(doc, runs[0], authorEntries[1] + comma + orcidGap(1))
          // Set EB Garamond font and increased size for author names
          setRunFont(doc, runs[0], EB_GARAMOND)
          setRunFontSize(doc, runs[0], 24)
          for (let j = 1; j < runs.length; j++) setText(doc, runs[j], '')
        }
      } else {
        for (let j = 0; j < runs.length; j++) setText(doc, runs[j], '')
      }
    } else if (text.includes('Mr. C. Arun³')) {
      const runs = p.getElementsByTagNameNS(W_NS, 'r')
      if (authorEntries.length >= 3) {
        const remaining = authorEntries.slice(2).map((entry, relIdx) => {
          const idx = relIdx + 2
          const comma = idx < authorEntries.length - 1 ? ',' : ''
          return `${entry}${comma}${orcidGap(idx)}`
        }).join(' ')
        if (runs.length > 0) {
          setText(doc, runs[0], remaining)
          // Set EB Garamond font and increased size for author names
          setRunFont(doc, runs[0], EB_GARAMOND)
          setRunFontSize(doc, runs[0], 24)
          for (let j = 1; j < runs.length; j++) setText(doc, runs[j], '')
        }
      } else {
        for (let j = 0; j < runs.length; j++) setText(doc, runs[j], '')
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

    // Ensure column break separates sidebar from ABSTRACT so two-column section never leaves Column 2 empty
    if (text.includes('ABSTRACT')) {
      let hasColBr = false
      const brs = Array.from(p.getElementsByTagNameNS(W_NS, 'br'))
      for (const br of brs) {
        const bType = br.getAttributeNS(W_NS, 'type') || br.getAttribute('w:type')
        if (bType === 'column') {
          hasColBr = true
          break
        }
      }
      if (!hasColBr) {
        const prefix = p.prefix || 'w'
        const colBrRun = doc.createElementNS(W_NS, `${prefix}:r`)
        const colBr = doc.createElementNS(W_NS, `${prefix}:br`)
        colBr.setAttributeNS(W_NS, `${prefix}:type`, 'column')
        colBrRun.appendChild(colBr)
        p.insertBefore(colBrRun, p.firstChild)
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

  // 6.2 Enforce EB Garamond as global font across entire document (all paragraphs, runs, tables, headings, body)
  enforceGlobalFont(doc, EB_GARAMOND)

  // 7. Update Footer XML for near-footer logo ASGARD font and page numbering
  if (footer1XmlStr) {
    const footerDoc = parser.parseFromString(footer1XmlStr, 'text/xml')
    updateFooter(footerDoc)
    enforceGlobalFont(footerDoc, EB_GARAMOND)
    targetZip.file('word/footer1.xml', serializer.serializeToString(footerDoc))
  }

  // 8. Ensure styles.xml and theme use EB Garamond as global defaults
  let stylesXmlStr = await targetZip.file('word/styles.xml')?.async('string')
  if (stylesXmlStr) {
    stylesXmlStr = stylesXmlStr
      .replaceAll('Times New Roman', EB_GARAMOND)
      .replaceAll('Tw Cen MT', EB_GARAMOND)
      .replaceAll('Calibri', EB_GARAMOND)
      .replaceAll('Cambria', EB_GARAMOND)
    targetZip.file('word/styles.xml', stylesXmlStr)
  }
  let stylesEffXmlStr = await targetZip.file('word/stylesWithEffects.xml')?.async('string')
  if (stylesEffXmlStr) {
    stylesEffXmlStr = stylesEffXmlStr
      .replaceAll('Times New Roman', EB_GARAMOND)
      .replaceAll('Tw Cen MT', EB_GARAMOND)
      .replaceAll('Calibri', EB_GARAMOND)
      .replaceAll('Cambria', EB_GARAMOND)
    targetZip.file('word/stylesWithEffects.xml', stylesEffXmlStr)
  }
  let themeXmlStr = await targetZip.file('word/theme/theme1.xml')?.async('string')
  if (themeXmlStr) {
    themeXmlStr = themeXmlStr
      .replaceAll('Calibri', EB_GARAMOND)
      .replaceAll('Cambria', EB_GARAMOND)
      .replaceAll('Times New Roman', EB_GARAMOND)
    targetZip.file('word/theme/theme1.xml', themeXmlStr)
  }

  // 9. Ensure EB Garamond is in fontTable.xml
  if (fontTableXmlStr) {
    if (!fontTableXmlStr.includes(EB_GARAMOND)) {
      fontTableXmlStr = fontTableXmlStr.replace(
        '</w:fonts>',
        `<w:font w:name="${EB_GARAMOND}"><w:panose1 w:val="02040603050406030204"/><w:charset w:val="00"/><w:family w:val="roman"/><w:pitch w:val="variable"/><w:sig w:usb0="E00002FF" w:usb1="400004FF" w:usb2="00000000" w:usb3="00000000" w:csb0="0000019F" w:csb1="00000000"/></w:font></w:fonts>`
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
