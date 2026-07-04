import { Outlet } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { useAuth } from '@hooks/useAuth'
import { fetchMyTeamRow } from '@services/teamService'

export default function QaRoleRoute() {
  const { user, signOut } = useAuth()
  const [allowed, setAllowed] = useState<boolean | undefined>(undefined)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!user) {
      return
    }
    let cancelled = false
    const run = async () => {
      try {
        const row = await fetchMyTeamRow(user.id)
        if (cancelled) return
        if (!row) {
          setAllowed(false)
          setError('Your account is not in the QA team directory.')
          return
        }
        if (!row.is_active) {
          setAllowed(false)
          setError('Your account is not active in the QA team directory.')
          return
        }
        if (row.role !== 'reels_qa') {
          setAllowed(false)
          setError(null)
          return
        }
        setAllowed(true)
        setError(null)
      } catch (e) {
        if (cancelled) return
        setAllowed(false)
        setError(e instanceof Error ? e.message : 'Failed to load role')
      }
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [user])

  if (allowed === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-on-surface">
        <p className="text-sm text-on-surface-variant">Checking access…</p>
      </div>
    )
  }

  if (error || !allowed) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-4 text-on-surface">
        <p className="max-w-md text-center text-sm text-error" role="alert">
          {error ??
            'This app is for QA reviewers only. Use the distribution dashboard if you are a manager.'}
        </p>
        <button
          type="button"
          className="rounded-lg border border-outline-variant px-4 py-2 text-sm text-on-surface"
          onClick={() => void signOut()}
        >
          Sign out
        </button>
      </div>
    )
  }

  return <Outlet />
}
