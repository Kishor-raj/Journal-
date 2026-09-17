import apiClient from './apiClient.js'

export const analyticsService = {
  recordVisit: (visitorId) =>
    apiClient.post('/analytics/visit', { visitorId }),
}