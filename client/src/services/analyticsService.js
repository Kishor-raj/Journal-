import apiClient from './apiClient.js'

export const analyticsService = {
  recordVisit: () => apiClient.post('/analytics/visit', {}),
}