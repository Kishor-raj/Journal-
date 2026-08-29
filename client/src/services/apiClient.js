const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'

export function getStoredToken() {
  try {
    return localStorage.getItem('auth_token')
  } catch {
    return null
  }
}

export function setStoredToken(token) {
  try {
    if (token) {
      localStorage.setItem('auth_token', token)
    } else {
      localStorage.removeItem('auth_token')
    }
  } catch {
    // Ignore storage quota or disabled storage errors
  }
}

async function request(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`
  const token = getStoredToken()
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  }

  const config = {
    ...options,
    headers,
    credentials: 'include',
  }

  const response = await fetch(url, config)

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }))
    throw new Error(error.error || `HTTP ${response.status}`)
  }

  if (response.status === 204) {
    return null
  }

  return response.json()
}

export const apiClient = {
  get: (endpoint) => request(endpoint),
  post: (endpoint, body) => request(endpoint, { method: 'POST', body: JSON.stringify(body) }),
  patch: (endpoint, body) => request(endpoint, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: (endpoint) => request(endpoint, { method: 'DELETE' }),
}

export default apiClient
