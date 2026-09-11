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

export function getActiveProvider() {
  const explicit = (env.AI_PROVIDER || '').toLowerCase()
  if (explicit === 'groq') return 'groq'
  if (explicit === 'gemini') return 'gemini'
  if (env.GROQ_API_KEY) return 'groq'
  if (env.GEMINI_API_KEY) return 'gemini'
  return 'groq'
}

export function getGeminiConfig() {
  const provider = getActiveProvider()
  if (provider === 'groq') {
    return {
      provider: 'groq',
      model: env.GROQ_MODEL || 'llama-3.3-70b-versatile',
      configured: Boolean(env.GROQ_API_KEY),
      keyPreview: maskKey(env.GROQ_API_KEY),
    }
  }
  const configuredModel = env.GEMINI_MODEL || 'gemini-3.6-flash'
  const model = (configuredModel.includes('2.0') || configuredModel.includes('2.5')) ? 'gemini-3.6-flash' : configuredModel
  return {
    provider: 'gemini',
    model,
    configured: Boolean(env.GEMINI_API_KEY),
    keyPreview: maskKey(env.GEMINI_API_KEY),
  }
}

export const getAiConfig = getGeminiConfig

async function generateGroqContent({ prompt, systemInstruction, model, temperature = 0.2, maxOutputTokens = 2048, timeoutMs, responseMimeType }) {
  const apiKey = env.GROQ_API_KEY
  if (!apiKey) {
    throw new Error('Groq API key not configured. Set GROQ_API_KEY in environment.')
  }

  const activeModel = model || env.GROQ_MODEL || 'llama-3.3-70b-versatile'

  const messages = []
  if (systemInstruction) {
    messages.push({ role: 'system', content: systemInstruction })
  }
  messages.push({ role: 'user', content: prompt })

  const requestBody = {
    model: activeModel,
    messages,
    temperature,
    max_tokens: maxOutputTokens,
  }

  if (responseMimeType === 'application/json') {
    requestBody.response_format = { type: 'json_object' }
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    })

    const text = await response.text()
    let data
    try {
      data = JSON.parse(text)
    } catch {
      data = text
    }

    if (!response.ok) {
      const errMessage = typeof data === 'object' && data?.error?.message ? data.error.message : (typeof data === 'string' ? data : JSON.stringify(data))
      const error = new Error(`Groq API ${response.status}: ${errMessage}`)
      error.status = response.status
      error.statusCode = response.status
      throw error
    }

    const content = data?.choices?.[0]?.message?.content
    if (!content) {
      throw new Error('Empty response from Groq API')
    }

    return {
      text: content,
      model: activeModel,
      usage: {
        promptTokenCount: data?.usage?.prompt_tokens || 0,
        candidatesTokenCount: data?.usage?.completion_tokens || 0,
        totalTokenCount: data?.usage?.total_tokens || 0,
      },
    }
  } finally {
    clearTimeout(timer)
  }
}

async function generateGeminiContent({ prompt, systemInstruction, model, temperature = 0.3, maxOutputTokens = 2048, timeoutMs, responseMimeType }) {
  const genAI = getClient()
  if (!genAI) {
    throw new Error('Gemini API key not configured')
  }

  let primaryModel = model || env.GEMINI_MODEL || 'gemini-3.6-flash'
  if (primaryModel.includes('2.0') || primaryModel.includes('2.5')) {
    primaryModel = 'gemini-3.6-flash'
  }
  const activeModel = primaryModel

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
}

export async function generateContent({ prompt, systemInstruction, model, temperature = 0.3, maxOutputTokens = 2048, timeout, responseMimeType } = {}) {
  const provider = getActiveProvider()
  const timeoutMs = timeout || DEFAULT_TIMEOUT_MS

  let lastError = null
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      if (provider === 'groq') {
        return await generateGroqContent({ prompt, systemInstruction, model, temperature, maxOutputTokens, timeoutMs, responseMimeType })
      } else {
        return await generateGeminiContent({ prompt, systemInstruction, model, temperature, maxOutputTokens, timeoutMs, responseMimeType })
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
        const delay = RETRY_DELAY_MS * Math.pow(2, attempt)
        console.warn(`[AI_CLIENT] Retryable error (${provider}) (attempt ${attempt + 1}/${MAX_RETRIES}): ${err.message}. Retrying in ${delay}ms...`)
        await new Promise((resolve) => setTimeout(resolve, delay))
        continue
      }

      console.error(`[AI_CLIENT] Error (${provider}): ${err.message}`)
      throw err
    }
  }

  throw lastError
}

export function isConfigured() {
  return Boolean(env.GROQ_API_KEY || env.GEMINI_API_KEY)
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

  try {
    return JSON.parse(cleaned)
  } catch {
    // Resilient fallback for truncated JSON: extract present fields via regex
    const classificationMatch = text.match(/"classification"\s*:\s*"([^"]+)"/)
    if (classificationMatch) {
      const intentMatch = text.match(/"intent"\s*:\s*"([^"]+)"/)
      const confidenceMatch = text.match(/"confidence"\s*:\s*([0-9.]+)/)
      const sensitiveMatch = text.match(/"sensitive_topic"\s*:\s*(true|false)/)
      const approvalMatch = text.match(/"requires_human_approval"\s*:\s*(true|false)/)
      const subNumMatch = text.match(/"submission_number"\s*:\s*"([^"]+)"/)

      return {
        classification: classificationMatch[1],
        intent: intentMatch ? intentMatch[1] : 'Inquiry regarding manuscript',
        confidence: confidenceMatch ? parseFloat(confidenceMatch[1]) : 0.95,
        sensitive_topic: sensitiveMatch ? sensitiveMatch[1] === 'true' : false,
        requires_human_approval: approvalMatch ? approvalMatch[1] === 'true' : false,
        extracted_data: subNumMatch ? { submission_number: subNumMatch[1] } : {},
      }
    }

    const bodyMatch = text.match(/"body"\s*:\s*"([^"]+)"/)
    if (bodyMatch) {
      const subjectMatch = text.match(/"subject"\s*:\s*"([^"]+)"/)
      return {
        subject: subjectMatch ? subjectMatch[1] : null,
        body: bodyMatch[1],
        confidence: 0.95,
        approval_required: false,
      }
    }

    throw new Error(`Failed to parse JSON: ${text.slice(0, 100)}`)
  }
}
