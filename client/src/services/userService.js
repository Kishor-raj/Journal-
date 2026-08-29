import apiClient from './apiClient'

export function getMyProfile() {
  return apiClient.get('/users/me')
}

export function updateMyProfile(data) {
  return apiClient.patch('/users/me/profile', data)
}
