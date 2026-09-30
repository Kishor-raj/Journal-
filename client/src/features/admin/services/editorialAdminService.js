import apiClient from '../../../services/apiClient.js'

export async function fetchAdminApplications(params = {}) {
  return apiClient.get('/admin/editorial-applications', { params })
}

export async function fetchApplicationDetail(id) {
  return apiClient.get(`/admin/editorial-applications/${id}`)
}

export async function updateVerification(id, data) {
  return apiClient.patch(`/admin/editorial-applications/${id}/verification`, data)
}

export async function requestClarification(id, message) {
  return apiClient.post(`/admin/editorial-applications/${id}/clarification`, { message })
}

export async function updateApplicationStatus(id, status, remarks) {
  return apiClient.post(`/admin/editorial-applications/${id}/status`, { status, remarks })
}

export async function approveApplication(id, data) {
  return apiClient.post(`/admin/editorial-applications/${id}/approve`, data)
}

export async function rejectApplication(id, data) {
  return apiClient.post(`/admin/editorial-applications/${id}/reject`, data)
}

export async function resendInvitation(id) {
  return apiClient.post(`/admin/editorial-applications/${id}/resend-invitation`)
}

export async function fetchAllEditorialMembers() {
  return apiClient.get('/admin/editorial-applications/members')
}

export async function updateEditorialMember(memberId, data) {
  return apiClient.patch(`/admin/editorial-applications/members/${memberId}`, data)
}

export async function deleteEditorialMember(memberId) {
  return apiClient.delete(`/admin/editorial-applications/members/${memberId}`)
}
