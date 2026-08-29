import { createContext, useContext, useCallback, useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import apiClient from '../services/apiClient'

const AuthContext = createContext(null)

const AUTH_CHECK_EXACT_PATHS = new Set([
  '/dashboard',
  '/profile',
  '/profile/complete',
  '/auth/select-role',
])

const AUTH_CHECK_PREFIXES = [
  '/admin',
  '/author',
  '/editor',
  '/moderator',
  '/reviewer',
]

function shouldCheckAuth(pathname) {
  return AUTH_CHECK_EXACT_PATHS.has(pathname)
    || AUTH_CHECK_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))
}

export function AuthProvider({ children }) {
  const { pathname } = useLocation()
  const routeNeedsAuth = shouldCheckAuth(pathname)
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(routeNeedsAuth)
  const [lastAuthCheckPath, setLastAuthCheckPath] = useState(() => (routeNeedsAuth ? null : pathname))

  const fetchUser = useCallback(async (checkedPath = null) => {
    try {
      const data = await apiClient.get('/auth/me')
      setUser(data)
    } catch {
      setUser(null)
    } finally {
      if (checkedPath) setLastAuthCheckPath(checkedPath)
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!shouldCheckAuth(pathname)) {
      return
    }

    fetchUser(pathname)
  }, [fetchUser, pathname])

  const authLoading = routeNeedsAuth && (loading || lastAuthCheckPath !== pathname)

  async function logout() {
    try {
      await apiClient.post('/auth/logout')
    } catch {
      // Clear the local authenticated state even if the network request fails.
      // Protected routes will still require a valid server-side session.
    }
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading: authLoading, logout, refetchUser: fetchUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}
