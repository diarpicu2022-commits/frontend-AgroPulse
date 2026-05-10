import { useState, useEffect, useRef } from 'react'
import { ShieldCheck, Users, Loader2 } from 'lucide-react'
import anime from 'animejs'
import { useAuth } from '../context/AuthContext'
import { userRepository } from '../repositories'
import type { AppUser, UserDto, UserRole } from '../types'

interface AdminPanelProps {
  user: AppUser
}

export default function AdminPanel({ user }: AdminPanelProps) {
  const { user: authUser } = useAuth()
  const adminUser = user || authUser

  const [users,    setUsers]    = useState<UserDto[]>([])
  const [loading,  setLoading]  = useState(true)
  const [changing, setChanging] = useState<number | null>(null)
  const [error,    setError]    = useState('')
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => { loadUsers() }, [])

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

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2.5 bg-blue-100 rounded-2xl">
          <ShieldCheck size={20} className="text-blue-600" />
        </div>
        <div>
          <h2 className="section-title">Gestión de Roles</h2>
          <p className="section-subtitle">Asigna roles a los usuarios del sistema</p>
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
            return (
              <div key={u.id} className="card p-4">
                <div className="flex items-center gap-4">
                  {u.avatar ? (
                    <img src={u.avatar} alt="avatar" className="w-11 h-11 rounded-2xl object-cover ring-2 ring-green-200 shrink-0" />
                  ) : (
                    <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center text-white font-bold shadow-glow-sm shrink-0">
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
                  <div className="flex items-center gap-3 shrink-0">
                    <span className={isAdmin ? 'badge-red' : 'badge-blue'}>
                      {isAdmin ? 'Admin' : 'Usuario'}
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
                          <option value="USER">Usuario</option>
                          <option value="ADMIN">Administrador</option>
                        </select>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <div className="alert-info text-sm">
        <ShieldCheck size={14} className="shrink-0 mt-0.5" />
        <span>Cambios de rol toman efecto inmediatamente. Los usuarios ADMIN acceden al panel de administración.</span>
      </div>
    </div>
  )
}
