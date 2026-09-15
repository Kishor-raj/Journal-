import apiClient from './apiClient.js'

export const contactService = {
  submitInquiry: (payload) => apiClient.post('/contact', payload),
  getInquiries: (params) => apiClient.get('/contact', { params }),
  getInquiry: (id) => apiClient.get(`/contact/${id}`),
  updateStatus: (id, status) => apiClient.patch(`/contact/${id}/status`, { status }),
}