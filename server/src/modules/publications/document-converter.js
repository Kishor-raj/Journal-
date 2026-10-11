import { execFile, execSync } from 'child_process'
import { promises as fs } from 'fs'
import path from 'path'
import os from 'os'
import crypto from 'crypto'

let cachedRunner = null

export function detectLibreOfficeRunner() {
  if (cachedRunner) return cachedRunner

  if (process.env.SOFFICE_PATH) {
    cachedRunner = { command: process.env.SOFFICE_PATH, args: [] }
    return cachedRunner
  }

  // 1. Check if soffice or libreoffice is in PATH
  for (const bin of ['soffice', 'libreoffice']) {
    try {
      execSync(`which ${bin}`, { stdio: 'pipe' })
      cachedRunner = { command: bin, args: [] }
      return cachedRunner
    } catch {
      // not in PATH
    }
  }

  // 2. Check direct standard paths
  const candidatePaths = [
    '/usr/bin/soffice',
    '/usr/bin/libreoffice',
    '/usr/local/bin/soffice',
    '/usr/lib/libreoffice/program/soffice',
  ]
  for (const p of candidatePaths) {
    try {
      execSync(`test -x "${p}"`, { stdio: 'pipe' })
      cachedRunner = { command: p, args: [] }
      return cachedRunner
    } catch {
      // not found
    }
  }

  // 3. Check Flatpak LibreOffice
  try {
    execSync('flatpak info org.libreoffice.LibreOffice', { stdio: 'pipe' })
    cachedRunner = {
      command: 'flatpak',
      args: ['run', '--filesystem=/tmp', 'org.libreoffice.LibreOffice'],
    }
    return cachedRunner
  } catch {
    // flatpak not available
  }

  return null
}

export function isConverterAvailable() {
  return Boolean(detectLibreOfficeRunner())
}

/**
 * Converts a DOCX or DOC buffer to PDF buffer using headless LibreOffice.
 *
 * @param {Buffer} docxBuffer - input document buffer
 * @param {Object} [options]
 * @param {number} [options.timeoutMs=60000] - maximum conversion timeout
 * @param {string} [options.originalExtension='docx']
 * @returns {Promise<Buffer>} converted PDF buffer
 */
export async function convertDocxToPdf(docxBuffer, options = {}) {
  if (!Buffer.isBuffer(docxBuffer) || docxBuffer.length === 0) {
    throw new Error('Invalid input: DOCX buffer is empty or missing.')
  }

  const runner = detectLibreOfficeRunner()
  if (!runner) {
    throw new Error('LibreOffice headless converter is not installed or available on the host/container.')
  }

  const timeoutMs = options.timeoutMs || 60000
  const ext = (options.originalExtension || 'docx').replace(/^\./, '').toLowerCase()
  const runId = crypto.randomBytes(8).toString('hex')
  const workDir = path.join(os.tmpdir(), `doc2pdf-${runId}`)
  const profileDir = path.join(workDir, 'lo-profile')
  const inputFilePath = path.join(workDir, `input.${ext}`)

  await fs.mkdir(profileDir, { recursive: true })

  try {
    await fs.writeFile(inputFilePath, docxBuffer)

    // Build LibreOffice arguments
    // -env:UserInstallation guarantees an isolated profile so concurrent conversions never collide
    const loArgs = [
      ...runner.args,
      `-env:UserInstallation=file://${profileDir.replace(/\\/g, '/')}`,
      '--headless',
      '--convert-to',
      'pdf',
      inputFilePath,
      '--outdir',
      workDir,
    ]

    await new Promise((resolve, reject) => {
      execFile(
        runner.command,
        loArgs,
        {
          timeout: timeoutMs,
          maxBuffer: 10 * 1024 * 1024,
        },
        (error, stdout, stderr) => {
          if (error) {
            const safeMsg = stderr ? stderr.toString().trim() : error.message
            return reject(new Error(`DOCX to PDF conversion failed: ${safeMsg}`))
          }
          resolve({ stdout, stderr })
        }
      )
    })

    const expectedPdfPath = path.join(workDir, 'input.pdf')
    const pdfExists = await fs
      .stat(expectedPdfPath)
      .then(() => true)
      .catch(() => false)

    if (!pdfExists) {
      throw new Error('DOCX to PDF conversion failed: expected output PDF was not produced.')
    }

    const pdfBuffer = await fs.readFile(expectedPdfPath)
    if (pdfBuffer.length === 0) {
      throw new Error('DOCX to PDF conversion failed: produced PDF is empty.')
    }

    return pdfBuffer
  } finally {
    // Clean up temporary workspace directory
    try {
      await fs.rm(workDir, { recursive: true, force: true })
    } catch {
      // Ignore cleanup error
    }
  }
}
