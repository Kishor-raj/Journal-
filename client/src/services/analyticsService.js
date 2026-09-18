import apiClient from './apiClient.js'

export const analyticsService = {
  recordVisit: (visitorId) =>
    apiClient.post('/analytics/visit', { visitorId }),

  /** Fetch aggregate journal stats (no auth required). */
  getStats: () =>
    apiClient.get('/analytics/stats'),
}