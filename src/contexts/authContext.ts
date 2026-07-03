import { createContext } from 'react'
import type { AuthSession, AuthUser } from '@/types/auth'

export type AuthContextValue = {
  user: AuthUser
  session: AuthSession
  loading: boolean
  configError: string | null
  signInWithPassword: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined)
