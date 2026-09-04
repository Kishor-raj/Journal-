import apiClient from './apiClient'

const BASE = '/notifications'

export function getNotificationHistory(params = {}) {
  const query = new URLSearchParams()
  if (params.page) query.append('page', params.page)
  if (params.limit) query.append('limit', params.limit)
  if (params.status) query.append('status', params.status)
  if (params.template_key) query.append('template_key', params.template_key)
  if (params.recipient_email) query.append('recipient_email', params.recipient_email)
  if (params.event_key) query.append('event_key', params.event_key)
  if (params.manuscript_id) query.append('manuscript_id', params.manuscript_id)
  const qs = query.toString()
  return apiClient.get(`${BASE}/deliveries${qs ? `?${qs}` : ''}`)
}

export function getNotificationDetail(id) {
  return apiClient.get(`${BASE}/deliveries/${id}`)
}

export function getEmailStats() {
  return apiClient.get(`${BASE}/stats`)
}

export function getEmailProviderHealth() {
  return apiClient.get(`${BASE}/health`)
}

export function getEmailTemplates() {
  return apiClient.get(`${BASE}/templates`)
}

export function validateEmailTemplates() {
  return apiClient.get(`${BASE}/templates/validate`)
}

export function getTemplateSampleVariables() {
  return apiClient.get(`${BASE}/templates/sample-variables`)
}

export function updateEmailTemplate(key, data) {
  return apiClient.patch(`${BASE}/templates/${key}`, data)
}

export function previewEmailTemplate(key, variables = {}) {
  return apiClient.post(`${BASE}/templates/${key}/preview`, { variables })
}

export function sendTemplateTestEmail(key, to) {
  return apiClient.post(`${BASE}/templates/${key}/test`, { to })
}

export function sendGenericTestEmail({ to, subject, html, text }) {
  return apiClient.post(`${BASE}/test`, { to, subject, html, text })
}

export function retryNotification(id) {
  return apiClient.post(`${BASE}/retry/${id}`)
}

export function retryAllFailed(limit = 25) {
  return apiClient.post(`${BASE}/retry-all`, { limit })
}

export function runEmailWorker() {
  return apiClient.post(`${BASE}/worker/run`)
}