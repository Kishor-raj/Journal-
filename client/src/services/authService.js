import apiClient from './apiClient'

export function getMe() {
  return apiClient.get('/auth/me')
}

export function selectRole(role) {
  return apiClient.post('/auth/role', { role })
}
