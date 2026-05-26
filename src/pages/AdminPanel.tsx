import { useState, useEffect, useRef } from 'react'
import { ShieldCheck, Users, Loader2, Sprout, ChevronDown, ChevronUp, RefreshCw } from 'lucide-react'
import anime from 'animejs'
import { useAuth } from '../context/AuthContext'
import { userRepository, greenhouseRepository } from '../repositories'
import { saveAccess, readAccess, saveAccessByEmail, readAccessByEmail, getCachedProfile } from '../context/AuthContext'
import type { AppUser, UserDto, UserRole, GreenhouseDto } from '../types'

interface AdminPanelProps { user: AppUser }

export default function AdminPanel({ user }: AdminPanelProps) {
  const { user: authUser } = useAuth()
  const adminUser = user || authUser

  const [users,       setUsers]       = useState<UserDto[]>([])
  const [greenhouses, setGreenhouses] = useState<GreenhouseDto[]>([])
  const [accessMap,   setAccessMap]   = useState<Record<number, number[]>>({})
  const [loading,     setLoading]     = useState(true)
  const [changing,    setChanging]    = useState<number | null>(null)
  const [expanded,    setExpanded]    = useState<number | null>(null)
  const [error,       setError]       = useState('')
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    loadUsers()
    greenhouseRepository.list().then(d => setGreenhouses(d.greenhouses || [])).catch(() => {})
  }, [])

  useEffect(() => {
    if (!listRef.current || loading || users.length === 0) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced) return
    anime({
      targets:    Array.from(listRef.current.children) as Element[],
      opacity:    [0, 1],
      translateY: [10, 0],
      delay:      anime.stagger(40),
      duration:   320,
      easing:     'easeOutCubic',
    })
  }, [loading, users.length])

  useEffect(() => {
    if (users.length === 0) return
    const map: Record<number, number[]> = {}
    users.forEach(u => {
      // Backend is source of truth; localStorage is fallback for offline
      map[u.id] = u.greenhouseIds ?? readAccess(u.id)
    })
    setAccessMap(map)
  }, [users.length])

  const loadUsers = async () => {
    try {
      setLoading(true)
      const data = await userRepository.listAll()
      setUsers(data.users || [])
      setError('')
    } catch (err) {
      setError((err as Error).message)
      setUsers([])
    } finally { setLoading(false) }
  }

  const changeRole = async (userId: number, newRole: string) => {
    try {
      setChanging(userId)
      await userRepository.changeRole(userId, newRole)
      await loadUsers()
    } catch (err) {
      setError('Error cambiando rol: ' + (err as Error).message)
    } finally { setChanging(null) }
  }

  const toggleGreenhouseAccess = async (userId: number, ghId: number, checked: boolean) => {
    const current = accessMap[userId] ?? []
    const updated = checked
      ? [...new Set([...current, ghId])]
      : current.filter(id => id !== ghId)

    // Optimistic UI update
    setAccessMap(prev => ({ ...prev, [userId]: updated }))

    // Persist to backend (source of truth)
    try {
      await userRepository.setGreenhouses(userId, updated)
    } catch {
      // Revert on failure
      setAccessMap(prev => ({ ...prev, [userId]: current }))
      setError('Error guardando acceso. Intenta de nuevo.')
      return
    }

    // Also mirror to localStorage so the user's own browser has a fast local copy
    saveAccess(userId, updated)
    const u = users.find(u => Number(u.id) === Number(userId))
    if (u?.email) {
      const byEmail = readAccessByEmail(u.email, userId)
      const updatedByEmail = checked
        ? [...new Set([...byEmail, ghId])]
        : byEmail.filter(id => id !== ghId)
      saveAccessByEmail(u.email, userId, updatedByEmail)
    }
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl" style={{ background: 'rgba(34,211,238,0.1)' }}>
            <ShieldCheck size={20} style={{ color: '#22d3ee' }} />
          </div>
          <div>
            <h2 className="section-title">Gestión de Roles</h2>
            <p className="section-subtitle">Asigna roles y acceso a invernaderos</p>
          </div>
        </div>
        <button
          onClick={loadUsers}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold hover:bg-[rgba(74,222,128,0.08)] transition-colors disabled:opacity-50"
          style={{ background: 'rgba(74,222,128,0.06)', color: 'rgba(255,255,255,0.5)' }}
          title="Recargar lista de usuarios"
        >
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          Recargar
        </button>
      </div>

      {error && <div className="alert-danger text-sm">{error}</div>}

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton h-20 rounded-3xl" />)}
        </div>
      ) : users.length === 0 ? (
        <div className="empty-state card p-10">
          <Users size={40} className="empty-state-icon" />
          <p className="empty-state-title">No hay usuarios registrados</p>
        </div>
      ) : (
        <div ref={listRef} className="space-y-3">
          {users.map(u => {
            const isCurrentUser = u.username === adminUser?.username
            const isAdmin       = u.role === 'ADMIN' || u.role === 'admin'
            const displayName   = u.full_name || u.username || '?'
            const initials      = displayName[0].toUpperCase()
            const avatarUrl     = u.avatar || (u.email ? getCachedProfile(u.email)?.avatar : undefined)
            const userAccess    = accessMap[u.id] ?? []
            const isExpanded    = expanded === u.id

            return (
              <div key={u.id} className="card overflow-hidden">
                {/* User row */}
                <div className="p-4">
                  <div className="flex items-center gap-4">
                    {avatarUrl ? (
                      <img src={avatarUrl} alt="avatar" className="w-11 h-11 rounded-2xl object-cover ring-2 ring-green-200 shrink-0" />
                    ) : (
                      <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-500
                                      flex items-center justify-center text-white font-bold shadow-glow-sm shrink-0">
                        {initials}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold truncate" style={{ color: '#e2ffe9' }}>{displayName}</h3>
                        {isCurrentUser && <span className="badge-gray text-[10px]">Tú</span>}
                      </div>
                      <p className="text-xs truncate" style={{ color: 'rgba(255,255,255,0.35)' }}>{u.email}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={isAdmin ? 'badge-red' : 'badge-blue'}>
                        {isAdmin ? 'Admin' : 'Operario'}
                      </span>
                      {!isCurrentUser && (
                        <div className="relative">
                          {changing === u.id && (
                            <div className="absolute inset-0 flex items-center justify-center rounded-xl" style={{ background: 'rgba(10,30,15,0.85)' }}>
                              <Loader2 size={14} className="animate-spin text-green-600" />
                            </div>
                          )}
                          <select
                            value={u.role as UserRole}
                            onChange={e => changeRole(u.id, e.target.value)}
                            disabled={changing === u.id}
                            className="input-field py-1.5 text-xs font-medium cursor-pointer disabled:opacity-50"
                          >
                            <option value="USER">Operario</option>
                            <option value="ADMIN">Administrador</option>
                          </select>
                        </div>
                      )}
                      {/* Expand greenhouse access (only for non-admins) */}
                      {!isAdmin && !isCurrentUser && greenhouses.length > 0 && (
                        <button
                          onClick={() => setExpanded(isExpanded ? null : u.id)}
                          className="p-1.5 rounded-xl hover:bg-[rgba(74,222,128,0.08)] transition-colors" style={{ color: 'rgba(255,255,255,0.35)' }}
                          title="Gestionar acceso a invernaderos"
                        >
                          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Greenhouse access panel (expandable) */}
                {isExpanded && !isAdmin && (
                  <div className="border-t border-[rgba(74,222,128,0.12)] px-4 pb-4 pt-3" style={{ background: '#051a0a' }}>
                    <p className="text-xs font-semibold uppercase tracking-wide mb-2.5 flex items-center gap-1.5" style={{ color: 'rgba(255,255,255,0.35)' }}>
                      <Sprout size={11} /> Acceso a invernaderos
                    </p>
                    {greenhouses.length === 0 ? (
                      <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>No hay invernaderos registrados.</p>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {greenhouses.map(gh => {
                          const hasAccess = userAccess.includes(gh.id)
                          return (
                            <label key={gh.id}
                              className={`flex items-center gap-2.5 p-2.5 rounded-xl cursor-pointer
                                         border transition-all duration-150 text-sm
                                         ${hasAccess
                                           ? 'border-green-400/20'
                                           : 'border-[rgba(74,222,128,0.12)] hover:border-green-400/20'}`}
                                      style={hasAccess
                                        ? { background: 'rgba(74,222,128,0.1)', color: '#4ade80' }
                                        : { background: '#0a1e0f', color: 'rgba(255,255,255,0.5)' }}>
                              <input
                                type="checkbox"
                                checked={hasAccess}
                                onChange={e => toggleGreenhouseAccess(u.id, gh.id, e.target.checked)}
                                className="w-3.5 h-3.5 rounded text-green-600 cursor-pointer"
                              />
                              <Sprout size={12} className={hasAccess ? 'text-green-500' : 'text-gray-400'} />
                              <span className="font-medium truncate">{gh.name}</span>
                              {gh.deviceId && (
                                <span className="ml-auto text-[10px] font-mono shrink-0" style={{ color: 'rgba(255,255,255,0.35)' }}>{gh.deviceId}</span>
                              )}
                            </label>
                          )
                        })}
                      </div>
                    )}
                    <p className="text-[11px] mt-2" style={{ color: 'rgba(255,255,255,0.35)' }}>
                      El operario verá los datos al presionar "Verificar acceso" en su sesión.
                    </p>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      <div className="alert-info text-sm">
        <ShieldCheck size={14} className="shrink-0 mt-0.5" />
        <span>Los cambios de rol y acceso se guardan en el servidor. El operario obtendrá acceso dentro de los próximos 10 segundos sin necesidad de cerrar sesión.</span>
      </div>
    </div>
  )
}
