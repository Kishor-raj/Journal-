import { createContext, useContext, useState, useEffect } from 'react'
import apiClient from '../services/apiClient'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchUser()
  }, [])

  async function fetchUser() {
    try {
      const data = await apiClient.get('/auth/me')
      setUser(data)
    } catch {
      setUser(null)
    } finally {
      setLoading(false)
    }
  }

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
    <AuthContext.Provider value={{ user, loading, logout, refetchUser: fetchUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within AuthProvider')
  return context
}
