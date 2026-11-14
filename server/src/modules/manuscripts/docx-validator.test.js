import { describe, it, expect } from 'vitest'
import { promises as fs } from 'fs'
import path from 'path'
import JSZip from 'jszip'
import { validateDocxBuffer } from './docx-validator.js'

describe('DOCX Submission Validation (Byte & Package Security)', () => {
  it('accepts a genuine valid DOCX package', async () => {
    const zip = new JSZip()
    zip.file('[Content_Types].xml', '<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>')
    zip.file('word/document.xml', '<?xml version="1.0"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>Hello World</w:t></w:r></w:p></w:body></w:document>')
    
    const buffer = await zip.generateAsync({ type: 'nodebuffer' })
    const result = await validateDocxBuffer(buffer)
    expect(result.isValid).toBe(true)
    expect(result.entryCount).toBeGreaterThanOrEqual(2)
  })

  it('accepts the official reference DOCX file', async () => {
    const refPath = path.resolve(process.cwd(), '../docs/reference/IJIDCR -Paper Published design.docx')
    try {
      const buffer = await fs.readFile(refPath)
      const result = await validateDocxBuffer(buffer)
      expect(result.isValid).toBe(true)
    } catch (err) {
      if (err.code !== 'ENOENT') throw err
    }
  })

  it('rejects renamed PDF files disguised as .docx', async () => {
    const fakePdf = Buffer.from('%PDF-1.7\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF')
    await expect(validateDocxBuffer(fakePdf)).rejects.toThrow(/PDF document renamed with a .docx extension/)
  })

  it('rejects legacy .doc binary files disguised as .docx', async () => {
    const fakeDoc = Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1])
    await expect(validateDocxBuffer(fakeDoc)).rejects.toThrow(/legacy Word .doc binary file/)
  })

  it('rejects arbitrary non-ZIP files disguised as .docx', async () => {
    const fakeText = Buffer.from('Just plain text content disguised as a word document')
    await expect(validateDocxBuffer(fakeText)).rejects.toThrow(/not a valid Office Open XML/)
  })

  it('rejects corrupt ZIP packages', async () => {
    const corruptZip = Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x00, 0x00, 0x00, 0x00, 0xff, 0xff])
    await expect(validateDocxBuffer(corruptZip)).rejects.toThrow(/Corrupt or unreadable DOCX package/)
  })

  it('rejects ZIPs missing [Content_Types].xml', async () => {
    const zip = new JSZip()
    zip.file('word/document.xml', '<w:document></w:document>')
    const buffer = await zip.generateAsync({ type: 'nodebuffer' })
    await expect(validateDocxBuffer(buffer)).rejects.toThrow(/missing \[Content_Types\].xml manifest/)
  })

  it('rejects ZIPs missing word/document.xml', async () => {
    const zip = new JSZip()
    zip.file('[Content_Types].xml', '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"></Types>')
    const buffer = await zip.generateAsync({ type: 'nodebuffer' })
    await expect(validateDocxBuffer(buffer)).rejects.toThrow(/missing main document part word\/document.xml/)
  })

  it('rejects macro-enabled .docm packages containing vbaProject.bin', async () => {
    const zip = new JSZip()
    zip.file('[Content_Types].xml', '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>')
    zip.file('word/document.xml', '<w:document xmlns:w="..."></w:document>')
    zip.file('word/vbaProject.bin', Buffer.from('macro binary data'))
    const buffer = await zip.generateAsync({ type: 'nodebuffer' })
    await expect(validateDocxBuffer(buffer)).rejects.toThrow(/Macro-enabled or executable content/)
  })

  it('rejects packages with path traversal attempts', async () => {
    const zip = new JSZip()
    zip.file('../evil.xml', 'malicious')
    zip.file('[Content_Types].xml', '<Types></Types>')
    zip.file('word/document.xml', '<w:document></w:document>')
    const buffer = await zip.generateAsync({ type: 'nodebuffer' })
    await expect(validateDocxBuffer(buffer)).rejects.toThrow(/Suspicious entry.*path traversal/)
  })
})
