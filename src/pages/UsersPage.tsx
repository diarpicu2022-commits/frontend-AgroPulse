import { useState, useEffect, useRef } from 'react'
import { Users, Plus, X, Trash2, Chrome } from 'lucide-react'
import anime from 'animejs'
import { userRepository } from '../repositories'
import { supabase, getCachedProfile } from '../context/AuthContext'
import type { UserDto, UserRole } from '../types'

interface MergedUser extends UserDto {
  source?: 'local' | 'supabase'
  full_name?: string
}

interface UserForm {
  username: string
  password: string
  fullName: string
  role: UserRole
}

export default function UsersPage() {
  const [users,     setUsers]    = useState<MergedUser[]>([])
  const [loading,   setLoading]  = useState(true)
  const [showForm,  setShowForm] = useState(false)
  const [form,      setForm]     = useState<UserForm>({ username: '', password: '', fullName: '', role: 'USER' })
  const [error,     setError]    = useState<string | null>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const formRef = useRef<HTMLFormElement>(null)

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

  useEffect(() => {
    if (!formRef.current || !showForm) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced) return
    anime({ targets: formRef.current, opacity: [0, 1], scaleY: [0.94, 1], duration: 260, easing: 'easeOutBack' })
  }, [showForm])

  const loadUsers = async () => {
    setLoading(true)
    try {
      const restData    = await userRepository.list()
      const restUsers: MergedUser[] = (restData.users || []).map(u => ({ ...u, source: 'local' as const }))

      let supabaseUsers: MergedUser[] = []
      if (supabase) {
        const { data, error: sbErr } = await supabase
          .from('users')
          .select('id, username, full_name, email, role, avatar, active')
          .eq('active', 1)
        if (!sbErr && data) {
          supabaseUsers = (data as Record<string, unknown>[]).map(u => ({
            ...(u as unknown as UserDto),
            fullName: u.full_name as string | undefined,
            source:   'supabase' as const,
          }))
        }
      }

      const emailsSeen    = new Set(restUsers.map(u => u.email?.toLowerCase()).filter(Boolean))
      const onlySupabase  = supabaseUsers.filter(u => !emailsSeen.has(u.email?.toLowerCase()))
      setUsers([...restUsers, ...onlySupabase])
      setError(null)
    } catch (err) { setError((err as Error).message) }
    finally { setLoading(false) }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await userRepository.create(form as unknown as Partial<UserDto>)
      setShowForm(false); setForm({ username: '', password: '', fullName: '', role: 'USER' }); loadUsers()
    } catch (err) { alert('Error: ' + (err as Error).message) }
  }

  const handleDelete = async (id: number) => {
    if (confirm('¿Eliminar este usuario?')) {
      try { await userRepository.remove(id); loadUsers() }
      catch (err) { alert('Error: ' + (err as Error).message) }
    }
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="section-title">Usuarios</h2>
          <p className="section-subtitle">{users.length} usuario{users.length !== 1 ? 's' : ''} registrado{users.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className={showForm ? 'btn-secondary px-4 py-2 text-sm' : 'btn-primary px-4 py-2 text-sm'}>
          {showForm ? <><X size={14} /> Cancelar</> : <><Plus size={14} /> Nuevo</>}
        </button>
      </div>

      {error && <div className="alert-danger text-sm">{error}</div>}

      {/* Form */}
      {showForm && (
        <form ref={formRef} onSubmit={handleSubmit} className="card p-5 space-y-4">
          <h3 className="font-semibold text-gray-800">Nuevo Usuario</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Usuario *</label>
              <input type="text" placeholder="usuario123" value={form.username}
                onChange={e => setForm({ ...form, username: e.target.value })} className="input-field" required />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Contraseña *</label>
              <input type="password" placeholder="••••••••" value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })} className="input-field" required />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Nombre completo</label>
              <input type="text" placeholder="Nombre completo" value={form.fullName}
                onChange={e => setForm({ ...form, fullName: e.target.value })} className="input-field" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Rol</label>
              <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value as UserRole })} className="input-field">
                <option value="USER">Usuario</option>
                <option value="ADMIN">Administrador</option>
              </select>
            </div>
          </div>
          <button type="submit" className="w-full btn-primary py-2.5 text-sm">Crear usuario</button>
        </form>
      )}

      {/* List */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton h-20 rounded-3xl" />)}
        </div>
      ) : (
        <div ref={listRef} className="space-y-3">
          {users.map(u => {
            const displayName = u.full_name || (u as unknown as { fullName?: string }).fullName || u.username || '?'
            const initials    = displayName[0].toUpperCase()
            const isAdmin     = u.role === 'ADMIN' || u.role === 'admin'
            const avatarUrl   = u.avatar || (u.email ? getCachedProfile(u.email)?.avatar : undefined)
            return (
              <div key={u.id} className="card p-4">
                <div className="flex items-center gap-4">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="avatar" className="w-11 h-11 rounded-2xl object-cover ring-2 ring-green-200 shrink-0" />
                  ) : (
                    <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center text-white font-bold shadow-glow-sm shrink-0">
                      {initials}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-800 truncate">{displayName}</h3>
                    <p className="text-xs text-gray-500 truncate">{u.email || 'Sin email'}</p>
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      <span className={isAdmin ? 'badge-red' : 'badge-blue'}>{isAdmin ? 'Admin' : 'Usuario'}</span>
                      {u.source === 'supabase' && (
                        <span className="badge-gray">
                          <Chrome size={9} /> Google OAuth
                        </span>
                      )}
                    </div>
                  </div>
                  {u.source !== 'supabase' && (
                    <button onClick={() => handleDelete(u.id)}
                      className="p-2 rounded-xl hover:bg-red-50 text-red-400 hover:text-red-600 transition-colors shrink-0">
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
              </div>
            )
          })}
          {users.length === 0 && (
            <div className="empty-state card p-10">
              <Users size={40} className="empty-state-icon" />
              <p className="empty-state-title">No hay usuarios registrados</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
