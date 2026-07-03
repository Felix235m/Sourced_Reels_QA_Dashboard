import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@hooks/useAuth'

export default function ProtectedRoute() {
  const { user, loading, configError } = useAuth()

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background font-body text-on-surface-variant">
        Loading…
      </div>
    )
  }

  if (configError) {
    return (
      <div
        role="alert"
        className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-6 text-center text-on-surface"
      >
        <p className="max-w-lg text-sm text-on-surface-variant">{configError}</p>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}
