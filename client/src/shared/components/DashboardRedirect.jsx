import { useAuth } from '../../context/AuthContext'
import { Navigate } from 'react-router-dom'

const ROLE_DASHBOARDS = {
  admin: '/admin/dashboard',
  author: '/author/dashboard',
  moderator: '/moderator/dashboard',
  editor: '/editor/dashboard',
  reviewer: '/reviewer/dashboard',
}

export default function DashboardRedirect() {
  const { user, loading } = useAuth()

  if (loading && !user) {
    return (
      <div style={{ minHeight: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: '36px', height: '36px', borderRadius: '50%', border: '3px solid rgba(196,146,46,0.2)', borderTopColor: '#C4922E', animation: 'auth-spin 0.8s linear infinite' }} />
        <style>{`@keyframes auth-spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }
  if (!user) return <Navigate to="/login" replace />

  return <Navigate to={ROLE_DASHBOARDS[user.role] || '/'} replace />
}
