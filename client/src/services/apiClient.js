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
  let url = `${API_BASE_URL}${endpoint}`
  if (options.params) {
    const searchParams = new URLSearchParams()
    Object.entries(options.params).forEach(([k, v]) => {
      if (v !== undefined && v !== null) searchParams.append(k, v)
    })
    const qs = searchParams.toString()
    if (qs) {
      url += (url.includes('?') ? '&' : '?') + qs
    }
  }

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
    const errorBody = await response.json().catch(() => ({}))
    const error = new Error(errorBody.error || `HTTP ${response.status}`)
    error.response = { status: response.status, data: errorBody }
    throw error
  }

  if (response.status === 204) {
    return null
  }

  return response.json()
}

export const apiClient = {
  get: (endpoint, options = {}) => request(endpoint, { method: 'GET', ...options }),
  post: (endpoint, body, options = {}) => request(endpoint, { method: 'POST', body: JSON.stringify(body), ...options }),
  patch: (endpoint, body, options = {}) => request(endpoint, { method: 'PATCH', body: JSON.stringify(body), ...options }),
  delete: (endpoint, options = {}) => request(endpoint, { method: 'DELETE', ...options }),
}

export default apiClient
