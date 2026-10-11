import apiClient, { getStoredToken } from './apiClient'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'

export function getAdminRoles() {
  return apiClient.get('/admin/roles')
}

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

export async function exportUsersCsv(params = {}) {
  const query = new URLSearchParams()
  if (params.role && params.role !== 'all') query.append('role', params.role)
  if (params.status && params.status !== 'all') query.append('status', params.status)
  if (params.search && params.search.trim()) query.append('search', params.search.trim())

  const qs = query.toString()
  const token = getStoredToken()
  const response = await fetch(`${API_BASE_URL}/admin/users/export${qs ? `?${qs}` : ''}`, {
    method: 'GET',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    credentials: 'include',
  })

  if (!response.ok) {
    let errorMsg = `Export failed (HTTP ${response.status})`
    try {
      const errJson = await response.json()
      if (errJson && errJson.error) errorMsg = errJson.error
    } catch {
      // response might not be json
    }
    const error = new Error(errorMsg)
    error.status = response.status
    throw error
  }

  let filename = `users_export_${new Date().toISOString().split('T')[0]}.csv`
  const disposition = response.headers.get('Content-Disposition')
  if (disposition && disposition.includes('filename=')) {
    const match = disposition.match(/filename=["']?([^"';]+)["']?/)
    if (match && match[1]) {
      filename = match[1].trim()
    }
  }

  const blob = await response.blob()
  return { blob, filename }
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

// ─── Categories ──────────────────────────────────────────────────────────────

export function getAdminCategories() {
  return apiClient.get('/admin/categories')
}

export function createCategory(data) {
  return apiClient.post('/admin/categories', data)
}

export function updateCategory(id, data) {
  return apiClient.patch(`/admin/categories/${id}`, data)
}

export function deleteCategory(id) {
  return apiClient.delete(`/admin/categories/${id}`)
}

// ─── Article Types ────────────────────────────────────────────────────────────

export function getAdminArticleTypes() {
  return apiClient.get('/admin/article-types')
}

export function createArticleType(data) {
  return apiClient.post('/admin/article-types', data)
}

export function updateArticleType(id, data) {
  return apiClient.patch(`/admin/article-types/${id}`, data)
}

export function deleteArticleType(id) {
  return apiClient.delete(`/admin/article-types/${id}`)
}
