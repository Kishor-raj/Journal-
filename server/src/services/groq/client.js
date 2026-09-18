import { env } from '../../config/env.js'

const DEFAULT_TIMEOUT_MS = 60_000
const MAX_RETRIES = 3
const RETRY_DELAY_MS = 2_000

function maskKey(key) {
  if (!key) return '<not set>'
  return key.slice(0, 6) + '...' + key.slice(-4)
}

let cachedWorkingGroqModel = null

const PREFERRED_GROQ_MODELS = [
  'openai/gpt-oss-120b',
  'openai/gpt-oss-20b',
  'qwen/qwen3.6-27b',
  'qwen/qwen3.8-27b',
  'llama-3.3-70b-versatile',
  'llama-3.1-8b-instant',
]

async function discoverWorkingGroqModel(apiKey) {
  if (cachedWorkingGroqModel) return cachedWorkingGroqModel
  try {
    const res = await fetch('https://api.groq.com/openai/v1/models', {
      headers: { 'Authorization': `Bearer ${apiKey}` },
    })
    if (res.ok) {
      const data = await res.json()
      const availableIds = (data?.data || []).map((m) => m.id)
      console.log(`[GROQ] Available models for this key: ${availableIds.slice(0, 15).join(', ')}`)

      for (const pref of PREFERRED_GROQ_MODELS) {
        if (availableIds.includes(pref)) {
          console.log(`[GROQ] Selected auto-discovered model: ${pref}`)
          cachedWorkingGroqModel = pref
          return pref
        }
      }

      // Fallback: pick any text model that isn't whisper, guard, or embed
      const textModel = availableIds.find((id) =>
        !id.includes('whisper') &&
        !id.includes('guard') &&
        !id.includes('embed')
      )
      if (textModel) {
        console.log(`[GROQ] Selected generic text model: ${textModel}`)
        cachedWorkingGroqModel = textModel
        return textModel
      }
    } else {
      console.warn(`[GROQ] Failed to query models endpoint: ${res.status} ${res.statusText}`)
    }
  } catch (err) {
    console.warn(`[GROQ] Model auto-discovery error: ${err.message}`)
  }

  return 'openai/gpt-oss-120b'
}

export function getAiConfig() {
  return {
    provider: 'groq',
    model: cachedWorkingGroqModel || env.GROQ_MODEL || 'openai/gpt-oss-120b',
    configured: Boolean(env.GROQ_API_KEY),
    keyPreview: maskKey(env.GROQ_API_KEY),
  }
}

export const getGroqConfig = getAiConfig

async function generateGroqContent({ prompt, systemInstruction, model, temperature = 0.2, maxOutputTokens = 2048, timeoutMs, responseMimeType }) {
  const apiKey = env.GROQ_API_KEY
  if (!apiKey) {
    throw new Error('Groq API key not configured. Set GROQ_API_KEY in environment.')
  }

  let activeModel = model || cachedWorkingGroqModel || env.GROQ_MODEL
  // If activeModel is the inaccessible 'llama-3.3-70b-versatile', auto-discover immediately
  if (!activeModel || activeModel === 'llama-3.3-70b-versatile') {
    activeModel = await discoverWorkingGroqModel(apiKey)
  }

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

  const sendRequest = async (currentModel) => {
    requestBody.model = currentModel
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

      return { response, data }
    } finally {
      clearTimeout(timer)
    }
  }

  let { response, data } = await sendRequest(activeModel)

  // Auto-heal on 404 (model deprecated, restricted, or renamed)
  if (response.status === 404) {
    const errMessage = typeof data === 'object' && data?.error?.message ? data.error.message : String(data)
    if (errMessage.includes('does not exist') || errMessage.includes('not have access') || errMessage.includes('model')) {
      console.warn(`[GROQ] Model '${activeModel}' not accessible: ${errMessage}. Attempting auto-discovery...`)
      cachedWorkingGroqModel = null
      const newModel = await discoverWorkingGroqModel(apiKey)
      if (newModel && newModel !== activeModel) {
        activeModel = newModel
        console.log(`[GROQ] Retrying completion with discovered model '${activeModel}'...`)
        const retryResult = await sendRequest(activeModel)
        response = retryResult.response
        data = retryResult.data
      }
    }
  }

  // Auto-heal on 400 if response_format is unsupported by specific model
  if (response.status === 400 && requestBody.response_format) {
    const errMessage = typeof data === 'object' && data?.error?.message ? data.error.message : String(data)
    if (errMessage.includes('response_format') || errMessage.includes('json_object')) {
      console.warn(`[GROQ] Model '${activeModel}' does not support response_format: ${errMessage}. Retrying without response_format...`)
      delete requestBody.response_format
      const retryResult = await sendRequest(activeModel)
      response = retryResult.response
      data = retryResult.data
    }
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

  cachedWorkingGroqModel = activeModel

  return {
    text: content,
    model: activeModel,
    usage: {
      promptTokenCount: data?.usage?.prompt_tokens || 0,
      candidatesTokenCount: data?.usage?.completion_tokens || 0,
      totalTokenCount: data?.usage?.total_tokens || 0,
    },
  }
}

export async function generateContent({ prompt, systemInstruction, model, temperature = 0.3, maxOutputTokens = 2048, timeout, responseMimeType } = {}) {
  const timeoutMs = timeout || DEFAULT_TIMEOUT_MS

  let lastError = null
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await generateGroqContent({ prompt, systemInstruction, model, temperature, maxOutputTokens, timeoutMs, responseMimeType })
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
        console.warn(`[AI_CLIENT] Retryable error (groq) (attempt ${attempt + 1}/${MAX_RETRIES}): ${err.message}. Retrying in ${delay}ms...`)
        await new Promise((resolve) => setTimeout(resolve, delay))
        continue
      }

      console.error(`[AI_CLIENT] Error (groq): ${err.message}`)
      throw err
    }
  }

  throw lastError
}

export function isConfigured() {
  return Boolean(env.GROQ_API_KEY)
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