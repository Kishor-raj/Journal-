import apiClient from './apiClient'

export function getMyProfile() {
  return apiClient.get('/users/me')
}

export function searchUsers(query) {
  return apiClient.get(`/users/search?q=${encodeURIComponent(query)}&limit=10`)
}

export function updateMyProfile(data) {
  return apiClient.patch('/users/me/profile', data)
}
