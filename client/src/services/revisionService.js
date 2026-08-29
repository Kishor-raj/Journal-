import apiClient from './apiClient'

export function getMyRevisions() {
  return apiClient.get('/revisions/mine')
}

export function getRevisionRequest(requestId) {
  return apiClient.get(`/revisions/${requestId}`)
}

export function getRevisionsByManuscript(manuscriptId) {
  return apiClient.get(`/revisions/manuscript/${manuscriptId}`)
}

export function submitRevisionResponse(requestId, data) {
  return apiClient.post(`/revisions/${requestId}/respond`, data)
}
