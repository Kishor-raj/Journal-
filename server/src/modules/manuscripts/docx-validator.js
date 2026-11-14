import JSZip from 'jszip'
import { AppError } from '../../shared/errors/AppError.js'

const MAX_DOCX_FILE_SIZE = 25 * 1024 * 1024 // 25 MB
const MAX_TOTAL_UNCOMPRESSED_SIZE = 100 * 1024 * 1024 // 100 MB zip-bomb defense
const MAX_ZIP_ENTRIES = 2000

/**
 * Validates that a buffer is a genuine, safe, non-macro Office Open XML (.docx) package.
 *
 * @param {Buffer} buffer
 * @param {Object} [options]
 * @returns {Promise<{ isValid: boolean, entryCount: number, uncompressedSize: number }>}
 */
export async function validateDocxBuffer(buffer, options = {}) {
  if (!Buffer.isBuffer(buffer)) {
    throw new AppError('Invalid document: input is not a buffer.', 400)
  }

  if (buffer.length < 4) {
    throw new AppError('File is too small to be a valid DOCX document.', 400)
  }

  const maxSize = options.maxFileSize || MAX_DOCX_FILE_SIZE
  if (buffer.length > maxSize) {
    throw new AppError(`File exceeds maximum allowed size of ${Math.round(maxSize / (1024 * 1024))}MB.`, 400)
  }

  // 1. Check ZIP magic header (PK\x03\x04, PK\x05\x06, or PK\x07\x08)
  const isZip = buffer[0] === 0x50 && buffer[1] === 0x4b && (
    buffer[2] === 0x03 || buffer[2] === 0x05 || buffer[2] === 0x07
  )

  // Explicitly check for PDF header (%PDF) to give a friendly error
  if (buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46) {
    throw new AppError('The uploaded file is a PDF document renamed with a .docx extension. Only genuine DOCX files are permitted.', 400)
  }

  // Check for legacy binary DOC header (0xD0CF11E0)
  if (buffer[0] === 0xd0 && buffer[1] === 0xcf && buffer[2] === 0x11 && buffer[3] === 0xe0) {
    throw new AppError('The uploaded file is a legacy Word .doc binary file. Please save and upload as .docx (Office Open XML).', 400)
  }

  if (!isZip) {
    throw new AppError('The uploaded file is not a valid Office Open XML (.docx) package.', 400)
  }

  // 2. Open ZIP archive and enforce safety limits
  let zip
  try {
    zip = await JSZip.loadAsync(buffer, { checkCRC32: true })
  } catch (zipErr) {
    throw new AppError(`Corrupt or unreadable DOCX package: ${zipErr.message}`, 400)
  }

  const entries = Object.keys(zip.files)
  if (entries.length === 0) {
    throw new AppError('Corrupt DOCX package: archive contains no files.', 400)
  }

  if (entries.length > MAX_ZIP_ENTRIES) {
    throw new AppError('DOCX package contains an excessive number of archive entries.', 400)
  }

  let totalUncompressedSize = 0

  for (const entryPath of entries) {
    // Check path traversal attempts
    if (entryPath.includes('..') || entryPath.startsWith('/') || entryPath.startsWith('\\')) {
      throw new AppError('Suspicious entry in DOCX package: path traversal detected.', 400)
    }

    const file = zip.files[entryPath]
    if (!file.dir) {
      // Estimate uncompressed size if available
      const uncompressed = file._data?.uncompressedSize || 0
      totalUncompressedSize += uncompressed
      if (totalUncompressedSize > MAX_TOTAL_UNCOMPRESSED_SIZE) {
        throw new AppError('DOCX package exceeds safe uncompressed size limits (potential ZIP bomb).', 400)
      }
    }

    // 3. Reject macro-enabled files (.docm) or executable scripts inside the package
    const lowerPath = entryPath.toLowerCase()
    if (
      lowerPath.includes('vbaproject.bin') ||
      lowerPath.includes('vbadata.xml') ||
      lowerPath.endsWith('.exe') ||
      lowerPath.endsWith('.bat') ||
      lowerPath.endsWith('.sh') ||
      lowerPath.endsWith('.cmd')
    ) {
      throw new AppError('Macro-enabled or executable content (.docm / vbaProject) is not permitted.', 400)
    }
  }

  // 4. Verify required Office Open XML parts
  const contentTypesEntry = zip.file('[Content_Types].xml')
  if (!contentTypesEntry) {
    throw new AppError('Invalid DOCX: missing [Content_Types].xml manifest.', 400)
  }

  const documentEntry = zip.file('word/document.xml')
  if (!documentEntry) {
    throw new AppError('Invalid DOCX: missing main document part word/document.xml.', 400)
  }

  // 5. Inspect Content Types for WordprocessingML
  const contentTypesXml = await contentTypesEntry.async('string')
  if (
    !contentTypesXml.includes('application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml') &&
    !contentTypesXml.includes('wordprocessingml')
  ) {
    throw new AppError('Invalid DOCX package: [Content_Types].xml does not declare a WordprocessingML document.', 400)
  }

  // Check if content types explicitly declare macro-enabled type
  if (contentTypesXml.includes('application/vnd.ms-word.document.macroEnabled.main+xml')) {
    throw new AppError('Macro-enabled Word document (.docm) detected. Please provide a standard .docx document.', 400)
  }

  // 6. Verify word/document.xml basic structural integrity
  const docXml = await documentEntry.async('string')
  if (!docXml.includes('<w:document') && !docXml.includes(':document')) {
    throw new AppError('Invalid DOCX: word/document.xml has invalid root element.', 400)
  }

  return {
    isValid: true,
    entryCount: entries.length,
    uncompressedSize: totalUncompressedSize,
  }
}
