import apiClient from './apiClient'

export function getQueue() {
  return apiClient.get('/editorial/queue')
}

export function getDashboardStats() {
  return apiClient.get('/editorial/dashboard')
}

export function getReviewerManagement() {
  return apiClient.get('/editorial/reviewers')
}

export function getDecisionList() {
  return apiClient.get('/editorial/decisions')
}

export function getEditorNotifications() {
  return apiClient.get('/editorial/notifications')
}

export function getManuscript(manuscriptId) {
  return apiClient.get(`/editorial/manuscripts/${manuscriptId}`)
}

export function claimManuscript(manuscriptId) {
  return apiClient.post('/editorial/assignments', { manuscript_id: manuscriptId })
}

export function getEligibleReviewers(manuscriptId) {
  return apiClient.get(`/editorial/manuscripts/${manuscriptId}/eligible-reviewers`)
}

export function inviteReviewer(manuscriptId, data) {
  return apiClient.post(`/editorial/manuscripts/${manuscriptId}/invite-reviewer`, data)
}

export function getAssignments(manuscriptId) {
  return apiClient.get(`/editorial/manuscripts/${manuscriptId}/assignments`)
}

export function setReviewerDeadline(manuscriptId, assignmentId, deadline) {
  return apiClient.patch(`/editorial/manuscripts/${manuscriptId}/assignments/${assignmentId}/deadline`, { deadline })
}

export function getExtensionRequests(manuscriptId) {
  return apiClient.get(`/editorial/manuscripts/${manuscriptId}/extensions`)
}

export function submitDecision(manuscriptId, data) {
  return apiClient.post(`/editorial/manuscripts/${manuscriptId}/decision`, data)
}

export function handleExtension(extensionId, approved) {
  return apiClient.patch(`/editorial/extensions/${extensionId}`, { approved })
}

export function getAcceptedManuscripts() {
  return apiClient.get('/editorial/accepted')
}
