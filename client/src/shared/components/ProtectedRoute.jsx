import { useAuth } from '../../context/AuthContext'
import { Navigate, useLocation } from 'react-router-dom'

const ROLE_DASHBOARDS = {
  admin: '/admin/dashboard',
  author: '/author/dashboard',
  moderator: '/moderator/dashboard',
  editor: '/editor/dashboard',
  reviewer: '/reviewer/dashboard',
}

export default function ProtectedRoute({ children, allowedRoles, requireProfileComplete = true }) {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading && !user) {
    return (
      <div style={{ minHeight: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: '36px', height: '36px', borderRadius: '50%', border: '3px solid rgba(196,146,46,0.2)', borderTopColor: '#C4922E', animation: 'auth-spin 0.8s linear infinite' }} />
        <style>{`@keyframes auth-spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }
  if (!user) {
    const returnTo = location.pathname && location.pathname !== '/login'
      ? `?returnTo=${encodeURIComponent(location.pathname + location.search)}`
      : ''
    return <Navigate to={`/login${returnTo}`} replace />
  }
  if (requireProfileComplete && !user.profile_complete && user.role !== 'admin' && user.role !== 'editor') {
    return <Navigate to="/profile/complete" replace />
  }
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to={ROLE_DASHBOARDS[user.role] || '/'} replace />
  }

  return children
}
