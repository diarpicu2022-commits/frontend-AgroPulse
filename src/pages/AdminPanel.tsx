import { useState, useEffect, useRef } from 'react'
import { ShieldCheck, Users, Loader2, Sprout, ChevronDown, ChevronUp } from 'lucide-react'
import anime from 'animejs'
import { useAuth } from '../context/AuthContext'
import { userRepository, greenhouseRepository } from '../repositories'
import { saveAccess, readAccess, getCachedProfile } from '../context/AuthContext'
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
    users.forEach(u => { map[u.id] = readAccess(u.id) })
    setAccessMap(map)
  }, [users.length])

  const loadUsers = async () => {
    try {
      setLoading(true)
      const data = await userRepository.listAll(adminUser?.email || '')
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
      await userRepository.changeRole(userId, newRole, adminUser?.email || '')
      await loadUsers()
    } catch (err) {
      setError('Error cambiando rol: ' + (err as Error).message)
    } finally { setChanging(null) }
  }

  const toggleGreenhouseAccess = (userId: number, ghId: number, checked: boolean) => {
    const current = accessMap[userId] ?? []
    const updated = checked
      ? [...new Set([...current, ghId])]
      : current.filter(id => id !== ghId)
    saveAccess(userId, updated)
    setAccessMap(prev => ({ ...prev, [userId]: updated }))
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2.5 bg-blue-100 rounded-2xl">
          <ShieldCheck size={20} className="text-blue-600" />
        </div>
        <div>
          <h2 className="section-title">Gestión de Roles</h2>
          <p className="section-subtitle">Asigna roles y acceso a invernaderos</p>
        </div>
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
                        <h3 className="font-semibold text-gray-800 truncate">{displayName}</h3>
                        {isCurrentUser && <span className="badge-gray text-[10px]">Tú</span>}
                      </div>
                      <p className="text-xs text-gray-500 truncate">{u.email}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={isAdmin ? 'badge-red' : 'badge-blue'}>
                        {isAdmin ? 'Admin' : 'Operario'}
                      </span>
                      {!isCurrentUser && (
                        <div className="relative">
                          {changing === u.id && (
                            <div className="absolute inset-0 flex items-center justify-center bg-white/80 rounded-xl">
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
                          className="p-1.5 rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors"
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
                  <div className="border-t border-gray-100 bg-gray-50/60 px-4 pb-4 pt-3">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2.5 flex items-center gap-1.5">
                      <Sprout size={11} /> Acceso a invernaderos
                    </p>
                    {greenhouses.length === 0 ? (
                      <p className="text-xs text-gray-400">No hay invernaderos registrados.</p>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {greenhouses.map(gh => {
                          const hasAccess = userAccess.includes(gh.id)
                          return (
                            <label key={gh.id}
                              className={`flex items-center gap-2.5 p-2.5 rounded-xl cursor-pointer
                                         border transition-all duration-150 text-sm
                                         ${hasAccess
                                           ? 'bg-green-50 border-green-200 text-green-800'
                                           : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'}`}>
                              <input
                                type="checkbox"
                                checked={hasAccess}
                                onChange={e => toggleGreenhouseAccess(u.id, gh.id, e.target.checked)}
                                className="w-3.5 h-3.5 rounded text-green-600 cursor-pointer"
                              />
                              <Sprout size={12} className={hasAccess ? 'text-green-500' : 'text-gray-400'} />
                              <span className="font-medium truncate">{gh.name}</span>
                              {gh.deviceId && (
                                <span className="ml-auto text-[10px] font-mono text-gray-400 shrink-0">{gh.deviceId}</span>
                              )}
                            </label>
                          )
                        })}
                      </div>
                    )}
                    <p className="text-[11px] text-gray-400 mt-2">
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
        <span>Los cambios de rol son inmediatos. El acceso a invernaderos se guarda localmente — el operario debe usar el mismo navegador.</span>
      </div>
    </div>
  )
}
