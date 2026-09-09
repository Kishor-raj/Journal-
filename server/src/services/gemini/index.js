import { classifyEmail } from './classifier.js'
import { generateReply } from './replyGenerator.js'
import { getGeminiConfig, isConfigured } from './client.js'
import { CLASSIFICATION_PROMPT_VERSION } from './prompts.js'
import { REPLY_PROMPT_VERSION } from './replyGenerator.js'

export { classifyEmail, generateReply, getGeminiConfig, isConfigured }
export { CLASSIFICATION_PROMPT_VERSION, REPLY_PROMPT_VERSION }
export { EMAIL_CATEGORIES, VALID_CLASSIFICATIONS } from './prompts.js'
