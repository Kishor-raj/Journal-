import apiClient from './apiClient.js'

export const publicService = {
  getPublishedArticles: () => apiClient.get('/public/published'),
  getCurrentIssueArticles: () => apiClient.get('/public/current-issue'),
  getFeaturedArticles: (limit = 6) => apiClient.get(`/public/featured?limit=${limit}`),
  getCertificateVerification: (token) => apiClient.get(`/public/verify/${token}`),
}
