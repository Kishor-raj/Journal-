import path from 'node:path'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import * as publicService from './public.service.js'
import { getCertificateVerification, downloadPublicCertificatePdf } from '../publications/publication.service.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const router = Router()

// GET /api/public/published  — all published articles
router.get('/published', async (req, res) => {
  const articles = await publicService.getPublishedArticles()
  res.json(articles)
})

// GET /api/public/featured  — latest N published articles for the home page
router.get('/featured', async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit, 10) || 6, 20)
  const articles = await publicService.getFeaturedArticles(limit)
  res.json(articles)
})

// GET /api/public/current-issue  — alias for published (all articles in current issue)
router.get('/current-issue', async (req, res) => {
  const articles = await publicService.getPublishedArticles()
  res.json(articles)
})

// GET /api/public/published/:id — single published article
router.get('/published/:id', async (req, res) => {
  const article = await publicService.getPublishedArticleById(req.params.id)
  if (!article) {
    return res.status(404).json({ error: 'Published article not found' })
  }
  res.json(article)
})

// GET /api/public/published/:id/authors — authors for one published article
router.get('/published/:id/authors', async (req, res) => {
  const authors = await publicService.getPublishedArticleAuthors(req.params.id)
  res.json(authors)
})

// GET /api/public/published/:id/download — download original manuscript file
router.get('/published/:id/download', async (req, res) => {
  const articles = await publicService.getPublishedArticles()
  const found = articles.find(a => String(a.id) === String(req.params.id))
  if (found && found.download_url) {
    return res.redirect(found.download_url)
  }
  res.status(404).json({ error: 'Manuscript file not found' })
})

// GET /api/public/verify/:token  — public certificate verification (no auth)
router.get('/verify/:token', async (req, res) => {
  const verification = await getCertificateVerification(req.params.token)
  res.json(verification)
})

// GET /api/public/verify/:token/download  — public certificate PDF download
router.get('/verify/:token/download', async (req, res) => {
  const { pdfBuffer, filename } = await downloadPublicCertificatePdf(req.params.token)
  res.setHeader('Content-Type', 'application/pdf')
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
  res.setHeader('Cache-Control', 'no-store, max-age=0')
  res.send(pdfBuffer)
})

// GET /api/public/editorial-board — public list of published editorial board members
router.get('/editorial-board', async (req, res) => {
  const { getPublicEditorialBoard } = await import('../editorial-board/editorial-board.service.js')
  const members = await getPublicEditorialBoard()
  res.json(members)
})

// Rate limiter for template downloads (15 min window, max 10 requests)
const templateDownloadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    if (req.accepts('html')) {
      res.status(429).send(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Download Rate Limit Exceeded</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #f8fafc; color: #1e293b; }
            .card { background: white; padding: 40px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.08); text-align: center; max-width: 480px; border-top: 4px solid #c4922e; }
            h2 { color: #0b1b3a; margin-top: 0; }
            p { color: #64748b; line-height: 1.6; }
            a { display: inline-block; margin-top: 16px; padding: 10px 20px; background: #0b1b3a; color: white; text-decoration: none; border-radius: 4px; font-weight: 600; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="card">
            <h2>Download Limit Exceeded (Max 10)</h2>
            <p>You have exceeded the maximum limit of <strong>10 template downloads</strong> per 15 minutes. Please wait before trying again.</p>
            <a href="javascript:history.back()">Go Back</a>
          </div>
        </body>
        </html>
      `)
    } else {
      res.status(429).json({
        error: 'Too Many Requests',
        message: 'Maximum 10 template downloads allowed per 15 minutes. Please try again later.',
      })
    }
  },
})

// Cloudinary template mappings (hosted on Cloudinary)
const TEMPLATE_URLS = {
  'manuscript-template': 'https://res.cloudinary.com/xcr4ymcm/raw/upload/fl_attachment/v1791648035/journal/author-templates/manuscript-template.docx',
  'author-checklist': 'https://res.cloudinary.com/xcr4ymcm/raw/upload/fl_attachment/v1791648036/journal/author-templates/author-checklist.docx',
  'copyright-form': 'https://res.cloudinary.com/xcr4ymcm/raw/upload/fl_attachment/v1791648037/journal/author-templates/copyright-form.docx',
  'reference-style-guide': 'https://res.cloudinary.com/xcr4ymcm/raw/upload/fl_attachment/v1791648038/journal/author-templates/reference-style-guide.docx',
}

const LOCAL_TEMPLATES = {
  'manuscript-template': '1.Manuscript Template.docx',
  'author-checklist': '2.Author Submission Checklist.docx',
  'copyright-form': '3.Copyright Agreement Form.docx',
  'reference-style-guide': '4.Reference Style Guide.docx',
}

// GET /api/public/templates/download  — Download docx templates with rate limiting
router.get('/templates/download', templateDownloadLimiter, (req, res) => {
  const { name } = req.query
  if (!name || (!TEMPLATE_URLS[name] && !LOCAL_TEMPLATES[name])) {
    return res.status(400).json({ error: 'Invalid or missing template name' })
  }

  // Cloudinary primary delivery
  const url = TEMPLATE_URLS[name]
  if (url) {
    const downloadUrl = url.includes('/upload/') && !url.includes('fl_attachment')
      ? url.replace('/upload/', '/upload/fl_attachment/')
      : url
    return res.redirect(downloadUrl)
  }

  // Local fallback if needed
  const localFileName = LOCAL_TEMPLATES[name]
  if (localFileName) {
    const possiblePaths = [
      path.resolve(__dirname, '../../../../client/public/templates', localFileName),
    ]
    for (const filePath of possiblePaths) {
      if (fs.existsSync(filePath)) {
        return res.download(filePath, localFileName)
      }
    }
  }

  res.status(404).json({ error: 'Template file not found' })
})

export default router
