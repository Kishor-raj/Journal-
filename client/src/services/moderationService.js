import apiClient from './apiClient'

export function getQueue() {
  return apiClient.get('/moderation/queue')
}

export function getDashboardStats() {
  return apiClient.get('/moderation/dashboard')
}

export function getNotifications() {
  return apiClient.get('/moderation/notifications')
}

export function getManuscript(id) {
  return apiClient.get(`/moderation/manuscripts/${id}`)
}

export function submitCheck(manuscriptId, data) {
  return apiClient.post(`/moderation/manuscripts/${manuscriptId}/check`, data)
}
