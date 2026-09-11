import { GoogleGenAI } from '@google/genai'
import { env } from '../../config/env.js'

let client = null

const DEFAULT_TIMEOUT_MS = 60_000
const MAX_RETRIES = 3
const RETRY_DELAY_MS = 2_000

function getClient() {
  if (!client && env.GEMINI_API_KEY) {
    client = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY })
  }
  return client
}

function maskKey(key) {
  if (!key) return '<not set>'
  return key.slice(0, 6) + '...' + key.slice(-4)
}

export function getGeminiConfig() {
  return {
    model: env.GEMINI_MODEL || 'gemini-3.6-flash',
    configured: Boolean(env.GEMINI_API_KEY),
    keyPreview: maskKey(env.GEMINI_API_KEY),
  }
}

export async function generateContent({ prompt, systemInstruction, model, temperature = 0.3, maxOutputTokens = 2048, timeout, responseMimeType } = {}) {
  const genAI = getClient()
  if (!genAI) {
    throw new Error('Gemini API key not configured')
  }

  const primaryModel = model || env.GEMINI_MODEL || 'gemini-3.6-flash'
  let activeModel = primaryModel
  const timeoutMs = timeout || DEFAULT_TIMEOUT_MS

  let lastError = null
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), timeoutMs)

      try {
        const config = {
          temperature,
          maxOutputTokens,
        }
        if (responseMimeType) {
          config.responseMimeType = responseMimeType
        }
        if (systemInstruction) {
          config.systemInstruction = systemInstruction
        }

        const response = await genAI.models.generateContent({
          model: activeModel,
          contents: prompt,
          config,
        }, { signal: controller.signal })

        clearTimeout(timer)

        const text = response.text
        if (!text) {
          throw new Error('Empty response from Gemini')
        }

        return {
          text,
          model: activeModel,
          usage: {
            promptTokenCount: response.usageMetadata?.promptTokenCount || 0,
            candidatesTokenCount: response.usageMetadata?.candidatesTokenCount || 0,
            totalTokenCount: response.usageMetadata?.totalTokenCount || 0,
          },
        }
      } finally {
        clearTimeout(timer)
      }
    } catch (err) {
      lastError = err
      const isRetryable = err?.name === 'AbortError' ||
        err?.code === 'ECONNRESET' ||
        err?.code === 'ETIMEDOUT' ||
        err?.status === 429 ||
        err?.status === 503 ||
        err?.message?.includes('503') ||
        err?.message?.includes('high demand') ||
        err?.message?.includes('UNAVAILABLE')

      if (isRetryable && attempt < MAX_RETRIES) {
        if (err?.status === 503 || err?.message?.includes('503') || err?.message?.includes('high demand') || err?.message?.includes('UNAVAILABLE')) {
          const alternate = activeModel.includes('2.5') ? 'gemini-3.6-flash' : 'gemini-2.5-flash'
          console.warn(`[GEMINI] 503 high demand on ${activeModel} — failing over to ${alternate}`)
          activeModel = alternate
        }

        const delay = RETRY_DELAY_MS * (attempt + 1)
        console.warn(`[GEMINI] Retryable error (attempt ${attempt + 1}/${MAX_RETRIES}): ${err.message}. Retrying in ${delay}ms...`)
        await new Promise((resolve) => setTimeout(resolve, delay))
        continue
      }

      const isRateLimit = err?.status === 429
      const isTimeout = err?.name === 'AbortError'
      const errorMessage = isRateLimit ? 'Gemini rate limit exceeded'
        : isTimeout ? 'Gemini request timed out'
        : `Gemini API error: ${err.message}`

      console.error(`[GEMINI] ${errorMessage}`)
      throw new Error(errorMessage)
    }
  }

  throw lastError
}

export function isConfigured() {
  return Boolean(env.GEMINI_API_KEY)
}

export function extractAndParseJSON(text) {
  if (!text || typeof text !== 'string') throw new Error('Empty text')

  let cleaned = text.trim()
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim()
  }

  try {
    return JSON.parse(cleaned)
  } catch {
    // continue to cleaning
  }

  const firstBrace = cleaned.indexOf('{')
  const lastBrace = cleaned.lastIndexOf('}')
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    cleaned = cleaned.slice(firstBrace, lastBrace + 1)
  }

  // Remove parenthetical notes after booleans or numbers: ': false (note)' -> ': false'
  cleaned = cleaned.replace(/:\s*(true|false)\s*\([^)]*\)/gi, ': $1')
  cleaned = cleaned.replace(/:\s*([0-9.]+)\s*\([^)]*\)/g, ': $1')
  // Remove single line comments // ...
  cleaned = cleaned.replace(/\/\/.*$/gm, '')
  // Remove trailing commas before } or ]
  cleaned = cleaned.replace(/,\s*([}\]])/g, '$1')

  return JSON.parse(cleaned)
}
