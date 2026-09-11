import dotenv from 'dotenv'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const envPath = path.resolve(__dirname, '../../.env')
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath })
}
dotenv.config()

const DEFAULT_ORIGIN = 'http://localhost:5173'

function toHttpsOrigin(value) {
  if (!value) return null
  const trimmed = String(value).trim().replace(/\/+$/, '')
  if (!trimmed) return null
  return trimmed.replace(/^http:/, 'https:')
}

// Derive the production app origin from the platform-provided public URL when
// the app is not explicitly configured. Explicitly setting
// PUBLIC_APP_ORIGIN / CLIENT_ORIGIN always wins — use this in a split
// deployment (API on Render + frontend elsewhere) or on Hostinger.
//
// When no explicit origin is set, prefer the frontend host (VERCEL_URL), then
// fall back to the platform URL (RENDER_EXTERNAL_URL) for single-host deploys.
function resolveAppOrigin() {
  const explicit = process.env.PUBLIC_APP_ORIGIN || process.env.CLIENT_ORIGIN
  if (explicit) return explicit.trim().replace(/\/+$/, '')

  const isProd =
    process.env.NODE_ENV === 'production' ||
    process.env.RENDER === 'true' ||
    process.env.VERCEL === '1' ||
    Boolean(process.env.RENDER_EXTERNAL_URL || process.env.VERCEL_URL)

  if (!isProd) return DEFAULT_ORIGIN

  const platformUrl =
    toHttpsOrigin(process.env.VERCEL_URL) ||
    toHttpsOrigin(process.env.RENDER_EXTERNAL_URL) ||
    DEFAULT_ORIGIN

  return platformUrl
}

const publicAppOrigin = resolveAppOrigin()

export const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: process.env.PORT || '3001',
  DATABASE_URL: process.env.DATABASE_URL,
  DATABASE_SSL: process.env.DATABASE_SSL,
  SESSION_SECRET: process.env.SESSION_SECRET,
  CLIENT_ORIGIN: publicAppOrigin,
  SERVER_ORIGIN: process.env.SERVER_ORIGIN || 'http://localhost:3001',
  AUTH_CALLBACK_ORIGIN: process.env.AUTH_CALLBACK_ORIGIN,
  PUBLIC_APP_ORIGIN: publicAppOrigin,
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
  CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY,
  CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET,
  CLOUDINARY_UPLOAD_PRESET: process.env.CLOUDINARY_UPLOAD_PRESET,
  RESEND_API_KEY: process.env.RESEND_API_KEY,
  EMAIL_PROVIDER: process.env.EMAIL_PROVIDER,
  EMAIL_ENABLED: process.env.EMAIL_ENABLED,
  EMAIL_FROM_NAME: process.env.EMAIL_FROM_NAME,
  EMAIL_FROM_ADDRESS: process.env.EMAIL_FROM_ADDRESS,
  EMAIL_REPLY_TO: process.env.EMAIL_REPLY_TO,
  EMAIL_VERIFICATION_TOKEN_TTL_MINUTES: process.env.EMAIL_VERIFICATION_TOKEN_TTL_MINUTES,
  PASSWORD_RESET_TOKEN_TTL_MINUTES: process.env.PASSWORD_RESET_TOKEN_TTL_MINUTES,
  RENDER: process.env.RENDER,
  HOSTINGER_MAIL_API_KEY: process.env.HOSTINGER_MAIL_API_KEY,
  HOSTINGER_MAILBOX: process.env.HOSTINGER_MAILBOX,
  HOSTINGER_WEBHOOK_SECRET: process.env.HOSTINGER_WEBHOOK_SECRET,
  HOSTINGER_API_BASE_URL: process.env.HOSTINGER_API_BASE_URL || 'https://email.hostinger.com/api/v1',
  GEMINI_API_KEY: process.env.GEMINI_API_KEY,
  GEMINI_MODEL: (process.env.GEMINI_MODEL && !process.env.GEMINI_MODEL.includes('2.0') && !process.env.GEMINI_MODEL.includes('2.5')) ? process.env.GEMINI_MODEL : 'gemini-3.6-flash',
  AI_EMAIL_ENABLED: process.env.AI_EMAIL_ENABLED !== 'false',
  AI_AUTO_REPLY_ENABLED: process.env.AI_AUTO_REPLY_ENABLED === 'true',
  AI_AUTO_REPLY_CONFIDENCE_THRESHOLD: parseFloat(process.env.AI_AUTO_REPLY_CONFIDENCE_THRESHOLD) || 0.90,
  AI_ROLLOUT_STAGE: process.env.AI_ROLLOUT_STAGE || 'development',
  AI_EMAIL_WORKER_INTERVAL_MS: parseInt(process.env.AI_EMAIL_WORKER_INTERVAL_MS, 10) || 20000,
  AI_WEBHOOK_RATE_LIMIT: parseInt(process.env.AI_WEBHOOK_RATE_LIMIT, 10) || 30,
  AI_DATA_RETENTION_DAYS: parseInt(process.env.AI_DATA_RETENTION_DAYS, 10) || 90,
}
