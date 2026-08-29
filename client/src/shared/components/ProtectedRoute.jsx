import { useAuth } from '../../context/AuthContext'
import { Navigate } from 'react-router-dom'

const ROLE_DASHBOARDS = {
  admin: '/admin/dashboard',
  author: '/author/dashboard',
  moderator: '/moderator/screening',
  editor: '/editor/queue',
  reviewer: '/reviewer/invitations',
}

export default function ProtectedRoute({ children, allowedRoles, requireProfileComplete = true }) {
  const { user, loading } = useAuth()

  if (loading) return <div>Loading...</div>
  if (!user) return <Navigate to="/login" replace />
  if (requireProfileComplete && !user.profile_complete) return <Navigate to="/profile/complete" replace />
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to={ROLE_DASHBOARDS[user.role] || '/'} replace />
  }

  return children
}
