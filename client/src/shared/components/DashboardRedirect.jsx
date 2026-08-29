import { useAuth } from '../../context/AuthContext'
import { Navigate } from 'react-router-dom'

const ROLE_DASHBOARDS = {
  admin: '/admin/dashboard',
  author: '/author/dashboard',
  moderator: '/moderator/screening',
  editor: '/editor/dashboard',
  reviewer: '/reviewer/dashboard',
}

export default function DashboardRedirect() {
  const { user, loading } = useAuth()

  if (loading) return <div>Loading...</div>
  if (!user) return <Navigate to="/login" replace />

  return <Navigate to={ROLE_DASHBOARDS[user.role] || '/'} replace />
}
