import { generateContent, extractAndParseJSON } from './client.js'
import { buildClassificationPrompt, CLASSIFICATION_PROMPT_VERSION, VALID_CLASSIFICATIONS } from './prompts.js'

export async function classifyEmail({ fromEmail, subject, bodyText, mailbox, knowledgeContext }) {
  const prompt = buildClassificationPrompt({ fromEmail, subject, bodyText, mailbox, knowledgeContext })

  const response = await generateContent({
    prompt,
    temperature: 0.1,
    maxOutputTokens: 512,
    responseMimeType: 'application/json',
  })

  let parsed
  try {
    parsed = extractAndParseJSON(response.text)
  } catch {
    throw new Error(`Failed to parse classification response: ${response.text.slice(0, 200)}`)
  }

  if (!VALID_CLASSIFICATIONS.includes(parsed.classification)) {
    parsed.classification = 'OTHER'
    parsed.confidence = 0.3
  }

  parsed.confidence = Math.min(1, Math.max(0, Number(parsed.confidence) || 0.5))
  parsed.sensitive_topic = Boolean(parsed.sensitive_topic)
  parsed.requires_human_approval = Boolean(parsed.requires_human_approval)

  if (!parsed.extracted_data || typeof parsed.extracted_data !== 'object') {
    parsed.extracted_data = {}
  }

  return {
    ...parsed,
    model: response.model,
    promptVersion: CLASSIFICATION_PROMPT_VERSION,
    usage: response.usage,
  }
}
