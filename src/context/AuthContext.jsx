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

      try {
        // Look for existing user by email
        const { data: existing } = await supabase
          .from('users')
          .select('*')
          .eq('email', authUser.email)
          .eq('active', 1)
          .single()

        if (existing) { setUser(existing); return }

        // Look by username
        const { data: byUsername } = await supabase
          .from('users')
          .select('*')
          .eq('username', username)
          .eq('active', 1)
          .single()

        if (byUsername) { setUser(byUsername); return }

        // Create user in Supabase
        const { data: newUser, error: createError } = await supabase
          .from('users')
          .insert({
            username: username,
            full_name: fullName,
            email: authUser.email,
            avatar: avatarUrl,
            role: isAdmin ? 'ADMIN' : 'OPERATOR',
            active: 1
          })
          .select()
          .single()

        if (createError) {
          console.error('Error creando usuario Google:', createError)
        }

        // Sync with REST API
        try {
          await fetch(`${API_URL}/api/auth/sync-google-user`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              username:  username,
              email:     authUser.email,
              full_name: fullName,
              avatar:    avatarUrl,
              role:      isAdmin ? 'ADMIN' : 'OPERATOR'
            })
          })
        } catch (syncErr) {
          console.error('Error sincronizando con REST:', syncErr)
        }

        const userToSet = newUser || {
          id:        authUser.id,
          username:  username,
          full_name: fullName,
          email:     authUser.email,
          avatar:    avatarUrl,
          role:      isAdmin ? 'ADMIN' : 'OPERATOR',
          active:    1
        }
        setUser(userToSet)
      } catch (err) {
        console.error('Error buscando usuario:', err)
        setUser({
          id:        authUser.id,
          username:  username,
          full_name: fullName,
          email:     authUser.email,
          avatar:    avatarUrl,
          role:      isAdmin ? 'ADMIN' : 'OPERATOR',
          active:    1
        })
      }
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
