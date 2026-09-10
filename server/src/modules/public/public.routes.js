import { Router } from 'express'
import * as publicService from './public.service.js'
import { getCertificateVerification, downloadPublicCertificatePdf } from '../publications/publication.service.js'

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

// GET /api/public/published/:id/authors — authors for one published article
router.get('/published/:id/authors', async (req, res) => {
  const authors = await publicService.getPublishedArticleAuthors(req.params.id)
  res.json(authors)
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

export default router
