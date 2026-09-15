import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import { sendEmail } from '../email/email.service.js'
import { escapeHtml } from '../email/email.utils.js'
import { env } from '../../config/env.js'
import { authenticate } from '../../middleware/authenticate.js'
import { requireRole } from '../../middleware/authorize.js'
import {
  validateContactInput,
  createInquiry,
  markNotificationSent,
  markNotificationFailed,
  getInquiries,
  getInquiryById,
  updateInquiryStatus,
} from './contact.service.js'
import pool from '../../config/db.js'

const router = Router()

const contactSubmitLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Too many inquiries submitted from this IP. Please try again later.', code: 'RATE_LIMITED' },
})

const contactAdminLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 300,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: 'Too many requests. Please try again later.', code: 'RATE_LIMITED' },
})

function buildNotificationEmail(inquiry) {
  const html = `
    <div style="font-family: Arial, Helvetica, sans-serif; color: #1C2233; max-width: 640px; margin: 0 auto;">
      <h2 style="color: #0B1B3A; border-bottom: 2px solid #C4A24C; padding-bottom: 12px;">New Contact Inquiry</h2>
      <table style="border-collapse: collapse; width: 100%; margin-top: 16px;">
        <tr><td style="padding: 8px 0; color: #6B7288; width: 130px; font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em;">Name</td><td style="padding: 8px 0; font-size: 15px;">${escapeHtml(inquiry.full_name)}</td></tr>
        <tr><td style="padding: 8px 0; color: #6B7288; width: 130px; font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em;">Email</td><td style="padding: 8px 0; font-size: 15px;">${escapeHtml(inquiry.email)}</td></tr>
        <tr><td style="padding: 8px 0; color: #6B7288; width: 130px; font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em;">Institution</td><td style="padding: 8px 0; font-size: 15px;">${escapeHtml(inquiry.institution || '—')}</td></tr>
        <tr><td style="padding: 8px 0; color: #6B7288; width: 130px; font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em;">Country</td><td style="padding: 8px 0; font-size: 15px;">${escapeHtml(inquiry.country || '—')}</td></tr>
        <tr><td style="padding: 8px 0; color: #6B7288; font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em;">Category</td><td style="padding: 8px 0; font-size: 15px;">${escapeHtml(inquiry.category)}</td></tr>
        <tr><td style="padding: 8px 0; color: #6B7288; font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em;">Subject</td><td style="padding: 8px 0; font-size: 15px;">${escapeHtml(inquiry.subject)}</td></tr>
      </table>
      <div style="margin-top: 16px; padding: 16px; background: #FDFCF9; border-left: 3px solid #C4A24C;">
        <div style="color: #6B7288; font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 8px;">Message</div>
        <div style="font-size: 15px; line-height: 1.6; white-space: pre-wrap;">${escapeHtml(inquiry.message)}</div>
      </div>
    </div>
  `
  const text = [
    'New Contact Inquiry',
    '',
    `Name: ${inquiry.full_name}`,
    `Email: ${inquiry.email}`,
    `Institution: ${inquiry.institution || '—'}`,
    `Country: ${inquiry.country || '—'}`,
    `Category: ${inquiry.category}`,
    `Subject: ${inquiry.subject}`,
    '',
    'Message:',
    inquiry.message,
  ].join('\n')

  return { html, text }
}

router.post('/',
  contactSubmitLimiter,
  async (req, res) => {
    const body = req.body || {}

    const honeypot = typeof body.website === 'string' ? body.website.trim() : ''
    if (honeypot) {
      return res.status(201).json({
        success: true,
        message: 'Your inquiry has been submitted successfully.',
      })
    }

    const validation = validateContactInput(body)
    if (!validation.valid) {
      return res.status(400).json({ error: validation.errors, code: 'VALIDATION_ERROR' })
    }

    const inquiry = await createInquiry({ ...validation.data, honeypot: honeypot || null })

    try {
      const recipient = env.CONTACT_RECIPIENT_EMAIL || env.EMAIL_REPLY_TO || env.EMAIL_FROM_ADDRESS
      if (recipient) {
        const { html, text } = buildNotificationEmail({ ...inquiry, institution: validation.data.institution, country: validation.data.country, message: validation.data.message })
        const result = await sendEmail({
          to: recipient,
          subject: 'New Contact Inquiry — Asgard Journal',
          html,
          text,
          replyTo: validation.data.email,
          metadata: { contact_inquiry_id: inquiry.id },
        })

        if (result?.success) {
          await markNotificationSent(inquiry.id)
        } else {
          throw new Error(result?.error || 'Email send failed')
        }
      }
    } catch (emailErr) {
      console.error('Contact notification email failed:', emailErr.message)
      await markNotificationFailed(inquiry.id, emailErr.message)
    }

    return res.status(201).json({
      success: true,
      message: 'Your inquiry has been submitted successfully.',
    })
  }
)

router.get('/',
  authenticate,
  requireRole('admin'),
  contactAdminLimiter,
  async (req, res) => {
    const { page, limit, status, search } = req.query
    const data = await getInquiries({ page, limit, status, search })
    res.json(data)
  }
)

router.get('/:id',
  authenticate,
  requireRole('admin'),
  contactAdminLimiter,
  async (req, res) => {
    const inquiry = await getInquiryById(req.params.id)
    if (!inquiry) {
      return res.status(404).json({ error: 'Inquiry not found.' })
    }
    res.json(inquiry)
  }
)

router.patch('/:id/status',
  authenticate,
  requireRole('admin'),
  contactAdminLimiter,
  async (req, res) => {
    const { status } = req.body || {}
    if (!status) {
      return res.status(400).json({ error: 'Status is required.' })
    }
    const updated = await updateInquiryStatus(req.params.id, status)
    if (!updated) {
      return res.status(400).json({ error: 'Invalid status or inquiry not found.' })
    }

    await pool.query(
      `INSERT INTO audit_logs (actor_user_id, action, entity_type, entity_id, new_values, ip_address, user_agent)
       VALUES ($1, 'contact_inquiry_status_change', 'contact_inquiry', $2, $3, $4, $5)`,
      [req.user.uid, updated.id, JSON.stringify({ status }), req.ip, req.get('user-agent') || null]
    )

    res.json({ success: true, inquiry: updated })
  }
)

export default router