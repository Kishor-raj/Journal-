import apiClient from './apiClient'

export function getUsers(params = {}) {
  const query = new URLSearchParams()
  if (params.page) query.append('page', params.page)
  if (params.limit) query.append('limit', params.limit)
  if (params.role) query.append('role', params.role)
  if (params.status) query.append('status', params.status)
  if (params.search) query.append('search', params.search)

  const qs = query.toString()
  return apiClient.get(`/admin/users${qs ? `?${qs}` : ''}`)
}

export function getUser(id) {
  return apiClient.get(`/admin/users/${id}`)
}

export function updateUserRole(id, data) {
  return apiClient.patch(`/admin/users/${id}/role`, data)
}

export function updateUserStatus(id, data) {
  return apiClient.patch(`/admin/users/${id}/status`, data)
}

export function getUserActivity(id) {
  return apiClient.get(`/admin/users/${id}/activity`)
}

export function deleteUser(id) {
  return apiClient.delete(`/admin/users/${id}`)
}

export function getAuditLogs(params = {}) {
  const query = new URLSearchParams()
  if (params.page) query.append('page', params.page)
  if (params.limit) query.append('limit', params.limit)
  if (params.action) query.append('action', params.action)
  if (params.entity_type) query.append('entity_type', params.entity_type)
  const qs = query.toString()
  return apiClient.get(`/audit/audit${qs ? `?${qs}` : ''}`)
}

export function getSecurityLogs(params = {}) {
  const query = new URLSearchParams()
  if (params.page) query.append('page', params.page)
  if (params.limit) query.append('limit', params.limit)
  if (params.severity) query.append('severity', params.severity)
  const qs = query.toString()
  return apiClient.get(`/audit/security${qs ? `?${qs}` : ''}`)
}

export function getWorkflowLogs(params = {}) {
  const query = new URLSearchParams()
  if (params.page) query.append('page', params.page)
  if (params.limit) query.append('limit', params.limit)
  if (params.status) query.append('status', params.status)
  const qs = query.toString()
  return apiClient.get(`/audit/workflow${qs ? `?${qs}` : ''}`)
}
