import apiClient from '../../../services/apiClient'

export function createDraft() {
  return apiClient.post('/manuscripts', {})
}

export function getCategories() {
  return apiClient.get('/manuscripts/categories')
}

export function getArticleTypes() {
  return apiClient.get('/manuscripts/article-types')
}

export function getMyManuscripts() {
  return apiClient.get('/manuscripts/mine')
}

export function getManuscript(id) {
  return apiClient.get(`/manuscripts/${id}`)
}

export function updateManuscript(id, data) {
  return apiClient.patch(`/manuscripts/${id}`, data)
}

export function deleteManuscript(id) {
  return apiClient.delete(`/manuscripts/${id}`)
}

export function addAuthor(manuscriptId, data) {
  return apiClient.post(`/manuscripts/${manuscriptId}/authors`, data)
}

export function updateAuthor(manuscriptId, authorId, data) {
  return apiClient.patch(`/manuscripts/${manuscriptId}/authors/${authorId}`, data)
}

export function removeAuthor(manuscriptId, authorId) {
  return apiClient.delete(`/manuscripts/${manuscriptId}/authors/${authorId}`)
}

export function submitManuscript(manuscriptId) {
  return apiClient.post(`/manuscripts/${manuscriptId}/submit`, {})
}

export function requestSignature(manuscriptId, versionId, fileType) {
  return apiClient.post('/files/signature', { manuscript_id: manuscriptId, version_id: versionId, file_type: fileType })
}

export function confirmUpload(manuscriptId, versionId, fileData) {
  return apiClient.post(`/files/manuscripts/${manuscriptId}/files`, { version_id: versionId, ...fileData })
}

export function deleteManuscriptFile(manuscriptId, fileId) {
  return apiClient.delete(`/files/manuscripts/${manuscriptId}/files/${fileId}`)
}

export function getStatusHistory(manuscriptId) {
  return apiClient.get(`/manuscripts/${manuscriptId}/status-history`)
}

export function getMyCertificate(manuscriptId) {
  return apiClient.get(`/publications/manuscripts/${manuscriptId}/certificate`)
}

export async function downloadCertificatePdf(manuscriptId, certificateNumber) {
  const { getStoredToken } = await import('../../../services/apiClient')
  const token = getStoredToken()
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'
  const res = await fetch(`${API_BASE_URL}/publications/manuscripts/${manuscriptId}/certificate/download`, {
    method: 'GET',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    credentials: 'include',
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error || `HTTP ${res.status}`)
  }
  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `Certificate-${certificateNumber || 'Publication'}.pdf`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  setTimeout(() => URL.revokeObjectURL(url), 5000)
}
