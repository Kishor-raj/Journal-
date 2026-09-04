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

export const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: process.env.PORT || '3001',
  DATABASE_URL: process.env.DATABASE_URL,
  DATABASE_SSL: process.env.DATABASE_SSL,
  SESSION_SECRET: process.env.SESSION_SECRET,
  CLIENT_ORIGIN: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  SERVER_ORIGIN: process.env.SERVER_ORIGIN || 'http://localhost:3001',
  AUTH_CALLBACK_ORIGIN: process.env.AUTH_CALLBACK_ORIGIN,
  PUBLIC_APP_ORIGIN: process.env.PUBLIC_APP_ORIGIN || 'http://localhost:5173',
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
}
