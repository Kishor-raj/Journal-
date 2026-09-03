import apiClient from './apiClient'

export function getMe() {
  return apiClient.get('/auth/me')
}

export function selectRole(role) {
  return apiClient.post('/auth/role', { role })
}

export function register(payload) {
  return apiClient.post('/auth/register', payload)
}

export function login(payload) {
  return apiClient.post('/auth/login', payload)
}

export function verifyEmail(token) {
  return apiClient.post('/auth/verify-email', { token })
}

export function resendVerification(email) {
  return apiClient.post('/auth/resend-verification', { email })
}

export function requestPasswordReset(email) {
  return apiClient.post('/auth/forgot-password', { email })
}

export function validateResetToken(token) {
  return apiClient.get(`/auth/reset-password/validate?token=${encodeURIComponent(token)}`)
}

export function resetPassword(token, password) {
  return apiClient.post('/auth/reset-password', { token, password })
}
