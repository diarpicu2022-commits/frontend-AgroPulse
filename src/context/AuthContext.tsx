import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { setUserContext } from '../core/ApiService'
import type { AppUser } from '../types'

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string) || ''
const supabaseKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string) || ''
export const supabase: SupabaseClient | null =
  supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null

const API_URL = (import.meta.env.VITE_API_URL as string) || 'http://localhost:8080'

// ── Greenhouse access store (frontend localStorage) ───────────────────────────
export function readAccess(userId: number): number[] {
  try {
    const raw = localStorage.getItem('agropulse_assignments')
    if (!raw) return []
    const all = JSON.parse(raw) as Record<string, number[]>
    return all[String(userId)] ?? []
  } catch { return [] }
}

export function saveAccess(userId: number, ids: number[]): void {
  try {
    const raw = localStorage.getItem('agropulse_assignments')
    const all = raw ? (JSON.parse(raw) as Record<string, number[]>) : {}
    all[String(userId)] = ids
    localStorage.setItem('agropulse_assignments', JSON.stringify(all))
  } catch {}
}

export function removeUserAccess(userId: number, email?: string | null): void {
  try {
    // Remove by user ID
    const rawId = localStorage.getItem('agropulse_assignments')
    if (rawId) {
      const all = JSON.parse(rawId) as Record<string, number[]>
      delete all[String(userId)]
      localStorage.setItem('agropulse_assignments', JSON.stringify(all))
    }
    if (email) {
      const key = email.toLowerCase()
      // Remove by email
      const rawEmail = localStorage.getItem('agropulse_access_email')
      if (rawEmail) {
        const all = JSON.parse(rawEmail) as Record<string, number[]>
        delete all[key]
        localStorage.setItem('agropulse_access_email', JSON.stringify(all))
      }
      // Remove from profile cache
      const rawProfile = localStorage.getItem('agropulse_profile_cache')
      if (rawProfile) {
        const all = JSON.parse(rawProfile) as Record<string, unknown>
        delete all[key]
        localStorage.setItem('agropulse_profile_cache', JSON.stringify(all))
      }
    }
    // Remove from every per-greenhouse user cache
    const keysToUpdate: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (k?.startsWith('agropulse_gh_users_')) keysToUpdate.push(k)
    }
    keysToUpdate.forEach(k => {
      try {
        const raw = localStorage.getItem(k)
        if (!raw) return
        const users = JSON.parse(raw) as { id: number }[]
        const filtered = users.filter(u => Number(u.id) !== Number(userId))
        if (filtered.length !== users.length) localStorage.setItem(k, JSON.stringify(filtered))
      } catch {}
    })
  } catch {}
}

// Email-keyed access — bound to userId so re-registration with same email gets no stale access
type EmailAccessEntry = { userId: number; ids: number[] }

export function saveAccessByEmail(email: string, userId: number, ids: number[]): void {
  try {
    const raw = localStorage.getItem('agropulse_access_email')
    const all = raw ? (JSON.parse(raw) as Record<string, EmailAccessEntry>) : {}
    all[email.toLowerCase()] = { userId, ids }
    localStorage.setItem('agropulse_access_email', JSON.stringify(all))
  } catch {}
}

export function readAccessByEmail(email: string, userId: number): number[] {
  try {
    const raw = localStorage.getItem('agropulse_access_email')
    if (!raw) return []
    const all = JSON.parse(raw) as Record<string, EmailAccessEntry | number[]>
    const entry = all[email.toLowerCase()]
    if (!entry) return []
    if (Array.isArray(entry)) return [] // legacy format — userId unknown, deny
    return entry.userId === userId ? entry.ids : []
  } catch { return [] }
}

function resolveAccess(userId: number, email?: string | null): number[] {
  const byId    = readAccess(userId)
  const byEmail = email ? readAccessByEmail(email, userId) : []
  return [...new Set([...byId, ...byEmail])]
}

export function cacheProfile(email: string, data: { avatar?: string | null; full_name?: string | null }): void {
  try {
    const raw = localStorage.getItem('agropulse_profile_cache')
    const all = raw ? (JSON.parse(raw) as Record<string, { avatar?: string; full_name?: string }>) : {}
    const key = email.toLowerCase()
    all[key] = { ...all[key] }
    if (data.avatar)    all[key].avatar    = data.avatar
    if (data.full_name) all[key].full_name = data.full_name
    localStorage.setItem('agropulse_profile_cache', JSON.stringify(all))
  } catch {}
}

export function getCachedProfile(email: string): { avatar?: string; full_name?: string } | null {
  try {
    const raw = localStorage.getItem('agropulse_profile_cache')
    if (!raw) return null
    const all = JSON.parse(raw) as Record<string, { avatar?: string; full_name?: string }>
    return all[email.toLowerCase()] ?? null
  } catch { return null }
}

function isAdminRole(role: string): boolean {
  return role === 'ADMIN' || role === 'admin'
}

// ── Context types ─────────────────────────────────────────────────────────────
interface AuthContextValue {
  user:                  AppUser | null
  authLoading:           boolean
  allowedGreenhouseIds:  number[] | null  // null = all access (admin)
  login:                 (userData: AppUser) => void
  logout:                () => Promise<void>
  refreshAccess:         () => void
  updateProfile:         (updates: Partial<AppUser>) => void
  supabase:              SupabaseClient | null
}

export const AuthContext = createContext<AuthContextValue>({
  user:                 null,
  authLoading:          true,
  allowedGreenhouseIds: null,
  login:                () => {},
  logout:               async () => {},
  refreshAccess:        () => {},
  updateProfile:        () => {},
  supabase:             null,
})

export function useAuth(): AuthContextValue {
  return useContext(AuthContext)
}

// ── Provider ─────────────────────────────────────────────────────────────────
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user,                  setUser]                  = useState<AppUser | null>(null)
  const [authLoading,           setAuthLoading]           = useState(true)
  const [allowedGreenhouseIds,  setAllowedGreenhouseIds]  = useState<number[] | null>(null)

  useEffect(() => {
    if (!supabase) { setAuthLoading(false); return }

    const findOrCreateUser = async (authUser: { id: string; email?: string; user_metadata?: Record<string, string> }) => {
      const userEmail = authUser.email?.toLowerCase() ?? ''
      const isAdmin   = userEmail === 'diarpicu2022@gmail.com' || userEmail.includes('admin')
      const username  = authUser.email?.split('@')[0] ?? 'user'
      // Always prefer Google display name and avatar
      const avatarUrl = authUser.user_metadata?.avatar_url ?? authUser.user_metadata?.picture ?? null
      const fullName  = authUser.user_metadata?.full_name ?? authUser.user_metadata?.name ?? authUser.email ?? username

      const fallback: AppUser = {
        id: 0, username, full_name: fullName, fullName,
        email: authUser.email, avatar: avatarUrl,
        role: isAdmin ? 'admin' : 'user', provider: 'GOOGLE', active: true,
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
          // Block soft-deleted users — they must re-register and request access again
          if (data.active === false) return
          const role = data.role === 'ADMIN' || isAdmin ? 'admin' : 'user'
          const finalUser: AppUser = {
            ...data,
            email:     authUser.email,
            full_name: fullName,    // Google metadata always wins
            fullName,
            role, provider: 'GOOGLE',
            avatar:    avatarUrl,   // Google metadata always wins
          }
          if (authUser.email) cacheProfile(authUser.email, { avatar: avatarUrl, full_name: fullName })
          setUser(finalUser)
          if (isAdminRole(role)) {
            setAllowedGreenhouseIds(null)
          } else {
            // Use greenhouse IDs from backend (source of truth), fall back to localStorage
            const ghIds = (data.greenhouseIds && data.greenhouseIds.length > 0)
              ? data.greenhouseIds
              : resolveAccess(data.id || 0, authUser.email)
            setAllowedGreenhouseIds(ghIds)
          }
          return
        }
      } catch { clearTimeout(fetchTimer) }

      // Backend no respondió (cold start en Render) — usar fallback local y reintentar
      // en 6 s para guardar al usuario en la BD cuando el servidor despierte.
      if (authUser.email) cacheProfile(authUser.email, { avatar: avatarUrl, full_name: fullName })
      setUser(fallback)
      // Don't wipe existing access (e.g. from TOKEN_REFRESHED while backend is offline)
      setAllowedGreenhouseIds(prev => {
        if (!isAdmin && prev !== null && prev.length > 0) return prev
        return isAdmin ? null : resolveAccess(0, authUser.email)
      })

      if (!isAdmin) {
        setTimeout(async () => {
          try {
            const r = await fetch(`${API_URL}/api/auth/login`, {
              method:  'POST',
              headers: { 'Content-Type': 'application/json' },
              body:    JSON.stringify({ email: authUser.email, googleId: authUser.id, name: fullName }),
            })
            if (r.ok) {
              const d = await r.json() as AppUser
              if (d.active === false) return
              if (d.id && d.id > 0) {
                setUser(prev => prev ? { ...prev, id: d.id, email: authUser.email } : prev)
                // Also update greenhouse access now that we have real id and backend is up
                if (d.greenhouseIds && d.greenhouseIds.length > 0) {
                  setAllowedGreenhouseIds(d.greenhouseIds)
                }
              }
            }
          } catch { /* ignorar — sin conexión */ }
        }, 6000)
      }
    }

    let resolved = false
    const safeFinish = () => { if (!resolved) { resolved = true; setAuthLoading(false) } }
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
    if (userData.active === false) return // Block deleted/deactivated users
    setUser(userData)
    if (userData.email && userData.avatar) cacheProfile(userData.email, { avatar: userData.avatar, full_name: userData.full_name })
    const admin = isAdminRole(userData.role)
    if (admin) {
      setAllowedGreenhouseIds(null)
    } else {
      // Use backend greenhouse IDs (source of truth), fallback to localStorage
      const ghIds = (userData.greenhouseIds && userData.greenhouseIds.length > 0)
        ? userData.greenhouseIds
        : resolveAccess(userData.id, userData.email)
      setAllowedGreenhouseIds(ghIds)

      // Si no tiene acceso asignado, re-consultar al backend en 2 s
      // (cubre el caso donde el admin acaba de asignar y la sesión local no se actualizó)
      if (ghIds.length === 0 && userData.id > 0) {
        setTimeout(async () => {
          try {
            const r = await fetch(`${API_URL}/api/users/${userData.id}/greenhouses`)
            if (r.ok) {
              const d = await r.json() as { ids: number[] }
              if (d.ids && d.ids.length > 0) setAllowedGreenhouseIds(d.ids)
            }
          } catch { /* sin conexión — ignorar */ }
        }, 2000)
      }
    }
    setUserContext({
      id:         userData.id,
      role:       userData.role,
      adminEmail: admin ? userData.email : undefined,
    })
  }

  const refreshAccess = () => {
    if (!user || isAdminRole(user.role)) return

    // Caso id=0: backend estaba dormido al login, re-autenticar para obtener ID real primero
    if (user.id === 0 && user.email) {
      ;(async () => {
        try {
          const r = await fetch(`${API_URL}/api/auth/login`, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ email: user.email, googleId: 'refresh' }),
          })
          if (r.ok) {
            const d = await r.json() as AppUser
            if (d.active === false) return
            if (d.id && d.id > 0) {
              setUser(prev => prev ? { ...prev, id: d.id } : prev)
              // Use backend greenhouse IDs directly from login response
              const ghIds = (d.greenhouseIds && d.greenhouseIds.length > 0)
                ? d.greenhouseIds
                : resolveAccess(d.id, user.email)
              setAllowedGreenhouseIds(ghIds)
              return
            }
          }
        } catch { /* sin conexión */ }
        const localIds = resolveAccess(0, user.email)
        setAllowedGreenhouseIds(localIds.length > 0 ? localIds : [])
      })()
      return
    }

    // Fetch greenhouse access from backend — source of truth
    ;(async () => {
      try {
        const r = await fetch(`${API_URL}/api/users/${user.id}/greenhouses`)
        if (r.ok) {
          const d = await r.json() as { ids: number[] }
          setAllowedGreenhouseIds(d.ids)
          return
        }
      } catch { /* sin conexión */ }
      // Fallback to localStorage
      const localIds = resolveAccess(user.id, user.email)
      setAllowedGreenhouseIds(localIds.length > 0 ? localIds : [])
    })()
  }

  const logout = async () => {
    setUser(null)
    setAllowedGreenhouseIds(null)
    setUserContext({})
    if (supabase) await supabase.auth.signOut()
  }

  const updateProfile = (updates: Partial<AppUser>) => {
    setUser(prev => {
      if (!prev) return prev
      const next = { ...prev, ...updates }
      if (updates.avatar !== undefined && prev.email) {
        cacheProfile(prev.email, { avatar: updates.avatar ?? undefined, full_name: updates.full_name ?? prev.full_name })
      }
      return next
    })
  }

  return (
    <AuthContext.Provider value={{ user, authLoading, allowedGreenhouseIds, login, logout, refreshAccess, updateProfile, supabase }}>
      {children}
    </AuthContext.Provider>
  )
}
