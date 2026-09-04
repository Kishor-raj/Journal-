import apiClient from '../../../services/apiClient'

export function createDraft() {
  return apiClient.post('/manuscripts', {})
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
