import { Router } from 'express'
import * as publicService from './public.service.js'
import { getCertificateVerification } from '../publications/publication.service.js'

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

// GET /api/public/verify/:token  — public certificate verification (no auth)
router.get('/verify/:token', async (req, res) => {
  const verification = await getCertificateVerification(req.params.token)
  res.json(verification)
})

export default router
