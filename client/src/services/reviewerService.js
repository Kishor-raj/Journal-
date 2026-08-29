import apiClient from './apiClient'

export function getInvitations() {
  return apiClient.get('/reviewer/invitations')
}

export function getDashboard() {
  return apiClient.get('/reviewer/dashboard')
}

export function respondToInvitation(invitationId, data) {
  return apiClient.patch(`/reviewer/invitations/${invitationId}`, data)
}

export function getAssignments() {
  return apiClient.get('/reviewer/assignments')
}

export function getAssignment(assignmentId) {
  return apiClient.get(`/reviewer/assignments/${assignmentId}`)
}

export function getManuscript(manuscriptId) {
  return apiClient.get(`/reviewer/manuscripts/${manuscriptId}`)
}

export function submitReview(assignmentId, data) {
  return apiClient.post('/reviewer/reviews', { assignment_id: assignmentId, ...data })
}

export function getExtensionRequests() {
  return apiClient.get('/reviewer/extensions')
}

export function requestExtension(assignmentId, data) {
  return apiClient.post(`/reviewer/assignments/${assignmentId}/extension`, data)
}
