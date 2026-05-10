import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { setUserContext } from '../core/ApiService'
import type { AppUser } from '../types'

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string) || ''
const supabaseKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string) || ''
export const supabase: SupabaseClient | null =
  supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null

const API_URL = (import.meta.env.VITE_API_URL as string) || 'http://localhost:8080'

interface AuthContextValue {
  user: AppUser | null
  authLoading: boolean
  login: (userData: AppUser) => void
  logout: () => Promise<void>
  supabase: SupabaseClient | null
}

export const AuthContext = createContext<AuthContextValue>({
  user: null,
  authLoading: true,
  login: () => {},
  logout: async () => {},
  supabase: null,
})

export function useAuth(): AuthContextValue {
  return useContext(AuthContext)
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser]               = useState<AppUser | null>(null)
  const [authLoading, setAuthLoading] = useState(true)

  useEffect(() => {
    if (!supabase) { setAuthLoading(false); return }

    const findOrCreateUser = async (authUser: { id: string; email?: string; user_metadata?: Record<string, string> }) => {
      const userEmail = authUser.email?.toLowerCase() ?? ''
      const isAdmin   = userEmail === 'diarpicu2022@gmail.com' || userEmail.includes('admin')
      const username  = authUser.email?.split('@')[0] ?? 'user'
      const avatarUrl = authUser.user_metadata?.avatar_url ?? authUser.user_metadata?.picture ?? null
      const fullName  = authUser.user_metadata?.full_name ?? authUser.email ?? username

      const fallback: AppUser = {
        id:        0,
        username,
        full_name: fullName,
        email:     authUser.email,
        avatar:    avatarUrl,
        role:      isAdmin ? 'admin' : 'user',
        provider:  'GOOGLE',
        active:    true,
      }

      const controller = new AbortController()
      const fetchTimer = setTimeout(() => controller.abort(), 8000)
      try {
        const response = await fetch(`${API_URL}/api/auth/login`, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ email: authUser.email, googleId: authUser.id, name: fullName }),
          signal:  controller.signal,
        })
        clearTimeout(fetchTimer)
        if (response.ok) {
          const data = await response.json() as AppUser
          const role = data.role === 'ADMIN' || isAdmin ? 'admin' : 'user'
          setUser({ ...data, email: authUser.email, role, provider: 'GOOGLE', avatar: avatarUrl, active: true })
          return
        }
      } catch { clearTimeout(fetchTimer) }

      setUser(fallback)
    }

    let resolved = false
    const safeFinish = () => { if (!resolved) { resolved = true; setAuthLoading(false) } }
    // Safety net: fires after 10s even if findOrCreateUser hangs
    const timer = setTimeout(safeFinish, 10000)

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) await findOrCreateUser(session.user).catch(() => {})
      clearTimeout(timer)
      safeFinish()
    }).catch(() => { clearTimeout(timer); safeFinish() })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) await findOrCreateUser(session.user).catch(() => {})
      safeFinish()
    })

    return () => subscription.unsubscribe()
  }, [])

  const login = (userData: AppUser) => {
    setUser(userData)
    setUserContext({
      id:         userData.id,
      role:       userData.role,
      adminEmail: (userData.role === 'admin' || userData.role === 'ADMIN') ? userData.email : undefined,
    })
  }

  const logout = async () => {
    setUser(null)
    setUserContext({})
    if (supabase) await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider value={{ user, authLoading, login, logout, supabase }}>
      {children}
    </AuthContext.Provider>
  )
}
