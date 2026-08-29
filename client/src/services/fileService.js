import apiClient from './apiClient'

export function getFileAccess(fileId) {
  return apiClient.get(`/files/${fileId}/access`)
}
