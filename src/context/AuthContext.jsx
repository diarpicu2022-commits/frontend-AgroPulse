import { createContext, useContext, useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import api, { setUserContext } from '../services/api'

// ── Supabase client ───────────────────────────────────────────────────────────
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''
export const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080'

// ── Context ───────────────────────────────────────────────────────────────────
export const AuthContext = createContext(null)

export function useAuth() {
  return useContext(AuthContext)
}

// ── Provider ──────────────────────────────────────────────────────────────────
export function AuthProvider({ children }) {
  const [user, setUser]               = useState(null)
  const [authLoading, setAuthLoading] = useState(true)

  // Verify Supabase session on mount (handles Google OAuth redirect)
  useEffect(() => {
    if (!supabase) {
      setAuthLoading(false)
      return
    }

    const findOrCreateUser = async (authUser) => {
      const userEmail = authUser.email?.toLowerCase() || ''
      const isAdmin   = userEmail === 'diarpicu2022@gmail.com' || userEmail.includes('admin')
      const username  = authUser.email.split('@')[0]
      const avatarUrl = authUser.user_metadata?.avatar_url || authUser.user_metadata?.picture || null
      const fullName  = authUser.user_metadata?.full_name || authUser.email

      const fallback = {
        id:        authUser.id,
        username,
        full_name: fullName,
        email:     authUser.email,
        avatar:    avatarUrl,
        role:      isAdmin ? 'admin' : 'user',
        provider:  'GOOGLE',
        active:    true
      }

      try {
        // Call Spring Boot backend to find or create the Google user
        const response = await fetch(`${API_URL}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: authUser.email, googleId: authUser.id, name: fullName })
        })
        if (response.ok) {
          const data = await response.json()
          const role = (data.role === 'ADMIN' || isAdmin) ? 'admin' : 'user'
          setUser({ ...data, email: authUser.email, role, provider: 'GOOGLE', avatar: avatarUrl, active: true })
          return
        }
      } catch (err) {
        // Backend cold start or unavailable — use session data
      }

      setUser(fallback)
    }

    let resolved = false
    const safeFinish = () => {
      if (!resolved) { resolved = true; setAuthLoading(false) }
    }

    // Timeout: if Supabase takes more than 4 s, show login directly
    const timer = setTimeout(safeFinish, 4000)

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      clearTimeout(timer)
      if (session?.user) {
        await findOrCreateUser(session.user).catch(() => {})
      }
      safeFinish()
    }).catch(() => {
      clearTimeout(timer)
      safeFinish()
    })

    // Listen for auth changes (post-login Google OAuth redirect)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        await findOrCreateUser(session.user).catch(() => {})
      }
      safeFinish()
    })

    return () => subscription.unsubscribe()
  }, [])

  const login = (userData) => {
    setUser(userData)
    setUserContext({
      id:         userData.id,
      role:       userData.role,
      adminEmail: (userData.role === 'admin' || userData.role === 'ADMIN') ? userData.email : undefined
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
