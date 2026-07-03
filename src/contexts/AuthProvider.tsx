import { useCallback, useEffect, useMemo, useState } from 'react'
import type { AuthSession, AuthUser } from '@/types/auth'
import { AuthContext, type AuthContextValue } from '@contexts/authContext'
import {
  isSupabaseConfigured,
  supabase,
  supabaseConfigMessage,
} from '@services/supabaseClient'

type AuthProviderProps = {
  children: React.ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser>(null)
  const [session, setSession] = useState<AuthSession>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let isMounted = true

    const init = async () => {
      if (!isSupabaseConfigured || !supabase) {
        if (!isMounted) return
        setSession(null)
        setUser(null)
        setLoading(false)
        return
      }

      const { data, error } = await supabase.auth.getSession()
      if (error) {
        console.error(error)
      }
      if (!isMounted) return
      setSession(data.session ?? null)
      setUser(data.session?.user ?? null)
      setLoading(false)
    }

    init()

    if (!supabase) {
      return () => {
        isMounted = false
      }
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!isMounted) return
      setSession(nextSession)
      setUser(nextSession?.user ?? null)
    })

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [])

  const signInWithPassword = useCallback(async (email: string, password: string) => {
    if (!supabase) {
      throw new Error(supabaseConfigMessage)
    }
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    if (error) {
      throw error
    }
    if (!data.session) {
      throw new Error(
        'No session returned. If you created this user in the dashboard, enable “Auto Confirm User”, or confirm the email for this address.',
      )
    }
    setSession(data.session)
    setUser(data.session.user)
  }, [])

  const signOut = useCallback(async () => {
    if (!supabase) {
      throw new Error(supabaseConfigMessage)
    }
    const { error } = await supabase.auth.signOut()
    if (error) {
      throw error
    }
    setSession(null)
    setUser(null)
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      session,
      loading,
      configError: isSupabaseConfigured ? null : supabaseConfigMessage,
      signInWithPassword,
      signOut,
    }),
    [loading, session, user, signInWithPassword, signOut],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
