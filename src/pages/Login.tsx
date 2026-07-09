import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@hooks/useAuth'
import { fetchMyTeamRow } from '@services/teamService'

const authErrorMessage = (err: unknown): string => {
  if (err instanceof Error && err.message) {
    return err.message
  }
  if (typeof err === 'object' && err !== null && 'message' in err) {
    const msg = (err as { message?: unknown }).message
    if (typeof msg === 'string' && msg.length > 0) {
      return msg
    }
  }
  return 'Login failed'
}

export default function Login() {
  const {
    user,
    loading: authLoading,
    signInWithPassword,
    signOut,
    configError,
  } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (authLoading || configError) return
    if (!user) return

    let cancelled = false
    const run = async () => {
      try {
        const row = await fetchMyTeamRow(user.id)
        if (cancelled) return
        if ((row?.role === 'reels_qa' || row?.role === 'qa') && row.is_active) {
          navigate('/qa', { replace: true })
        } else {
          await signOut()
          setError(
            'This app is for QA reviewers only. Sign in with an active reviewer account, or use the manager app if you distribute clips.',
          )
        }
      } catch {
        if (cancelled) return
        void signOut()
        setError('Could not verify your account.')
      }
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [authLoading, configError, user, navigate, signOut])

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await signInWithPassword(email, password)
    } catch (err) {
      setError(authErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 text-on-surface">
      <div className="glass-panel w-full max-w-md rounded-xl border border-white/10 p-8 shadow-xl shadow-primary/5">
        {configError ? (
          <p className="mb-4 rounded-lg border border-error/30 bg-error-container/20 px-3 py-2 text-sm text-on-error-container">
            {configError}
          </p>
        ) : null}
        <h1 className="font-headline text-2xl font-bold tracking-tight text-primary">Reels QA</h1>
        <p className="mt-2 text-sm text-on-surface-variant">Sign in to review composed clips.</p>
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <label className="block text-sm font-medium text-on-surface">
            Email
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-1 w-full rounded-lg border border-outline-variant bg-surface-container-low px-3 py-2 text-sm text-on-surface placeholder:text-on-surface-variant/50 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              required
            />
          </label>
          <label className="block text-sm font-medium text-on-surface">
            Password
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-1 w-full rounded-lg border border-outline-variant bg-surface-container-low px-3 py-2 text-sm text-on-surface placeholder:text-on-surface-variant/50 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              required
            />
          </label>
          {error ? <p className="text-sm text-error">{error}</p> : null}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-gradient-to-r from-primary to-primary-dim py-2.5 text-sm font-bold text-on-primary-fixed transition hover:opacity-95 disabled:opacity-60"
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  )
}
