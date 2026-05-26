import { useState, useEffect, useRef } from 'react'
import { Users, Plus, X, Trash2, ShieldCheck, Chrome } from 'lucide-react'
import anime from 'animejs'
import { userRepository } from '../repositories'
import { supabase, getCachedProfile, removeUserAccess, useAuth } from '../context/AuthContext'
import type { UserDto, UserRole } from '../types'
import PageHeader from '../components/ui/PageHeader'

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
  const { user: authUser, login } = useAuth()
  const [users,     setUsers]    = useState<MergedUser[]>([])
  const [loading,   setLoading]  = useState(true)
  const [showForm,  setShowForm] = useState(false)
  const [form,      setForm]     = useState<UserForm>({ username: '', password: '', fullName: '', role: 'USER' })
  const [error,     setError]    = useState<string | null>(null)
  const [bootstrapping, setBootstrapping] = useState(false)
  const listRef = useRef<HTMLDivElement>(null)
  const formRef = useRef<HTMLFormElement>(null)

  const isForbidden = error === 'Acceso denegado'
  const isAdmin = authUser?.role === 'ADMIN' || authUser?.role === 'admin'

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
    let restUsers: MergedUser[] = []
    try {
      const restData = await userRepository.list()
      restUsers = (restData.users || []).map(u => ({ ...u, source: 'local' as const }))
      setError(null)
    } catch (err) {
      const msg = (err as Error).message
      setError(msg)
    }

    let supabaseUsers: MergedUser[] = []
    if (supabase) {
      try {
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
      } catch {}
    }

    const emailsSeen   = new Set(restUsers.map(u => u.email?.toLowerCase()).filter(Boolean))
    const onlySupabase = supabaseUsers.filter(u => !emailsSeen.has(u.email?.toLowerCase()))
    setUsers([...restUsers, ...onlySupabase])
    setLoading(false)
  }

  const handleBootstrapAdmin = async () => {
    if (!authUser?.email) return
    setBootstrapping(true)
    try {
      const updated = await userRepository.bootstrapAdmin(authUser.email) as UserDto & { token?: string }
      if (updated.token) login({ ...authUser, ...updated })
      await loadUsers()
    } catch (err) { alert('Error: ' + (err as Error).message) }
    setBootstrapping(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await userRepository.create(form as unknown as Partial<UserDto>)
      setShowForm(false); setForm({ username: '', password: '', fullName: '', role: 'USER' }); loadUsers()
    } catch (err) { alert('Error: ' + (err as Error).message) }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('¿Eliminar este usuario? Se quitará también de todos los invernaderos asignados.')) return
    const target = users.find(u => u.id === id)
    const card   = document.getElementById(`user-card-${id}`)
    if (card) {
      await new Promise<void>(resolve => {
        anime({
          targets:      card,
          opacity:      [1, 0],
          translateX:   [0, 20],
          height:       [card.offsetHeight, 0],
          marginBottom: [12, 0],
          paddingTop:   [16, 0],
          paddingBottom:[16, 0],
          duration: 280,
          easing: 'easeInCubic',
          complete: () => resolve(),
        })
      })
    }
    try {
      await userRepository.remove(id)
      removeUserAccess(id, target?.email)
      setUsers(prev => prev.filter(u => u.id !== id))
    } catch (err) {
      loadUsers()
      alert('Error: ' + (err as Error).message)
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Usuarios"
        subtitle={`${users.length} usuario${users.length !== 1 ? 's' : ''} registrado${users.length !== 1 ? 's' : ''}`}
        action={
          <button onClick={() => setShowForm(!showForm)} className={showForm ? 'btn-secondary px-3 py-1.5 text-sm' : 'btn-primary px-3 py-1.5 text-sm'}>
            {showForm ? <><X size={13} /> Cancelar</> : <><Plus size={13} /> Nuevo</>}
          </button>
        }
      />

      {error && !isForbidden && <div className="alert-danger text-sm">{error}</div>}

      {/* Bootstrap-admin: shown only when no admin exists yet */}
      {isForbidden && !isAdmin && (
        <div className="card p-5 space-y-3">
          <div className="flex items-center gap-2">
            <ShieldCheck size={18} className="text-yellow-400" />
            <span className="font-semibold text-sm" style={{ color: '#fde68a' }}>Sin administrador configurado</span>
          </div>
          <p className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>
            Tu cuenta ({authUser?.email}) aún no tiene rol de administrador. Si eres el primer usuario del sistema, puedes activar el acceso de administrador.
          </p>
          <button
            onClick={handleBootstrapAdmin}
            disabled={bootstrapping}
            className="btn-primary px-4 py-2 text-sm"
          >
            {bootstrapping
              ? <><div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Activando...</>
              : <><ShieldCheck size={13} /> Activar mi cuenta como Administrador</>}
          </button>
        </div>
      )}

      {/* Form */}
      {showForm && (
        <form ref={formRef} onSubmit={handleSubmit} className="biopunk-card p-5 space-y-4">
          <h3 className="font-semibold" style={{ color: '#e2ffe9' }}>Nuevo Usuario</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="biopunk-label block mb-1.5">Usuario *</label>
              <input type="text" placeholder="usuario123" value={form.username}
                onChange={e => setForm({ ...form, username: e.target.value })} className="input-field" required />
            </div>
            <div>
              <label className="biopunk-label block mb-1.5">Contraseña *</label>
              <input type="password" placeholder="••••••••" value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })} className="input-field" required />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="biopunk-label block mb-1.5">Nombre completo</label>
              <input type="text" placeholder="Nombre completo" value={form.fullName}
                onChange={e => setForm({ ...form, fullName: e.target.value })} className="input-field" />
            </div>
            <div>
              <label className="biopunk-label block mb-1.5">Rol</label>
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
            const fullNameRaw  = u.full_name || (u as unknown as { fullName?: string }).fullName || ''
            // If username looks like an email, extract the local part to avoid showing email twice
            const usernameDisplay = u.username?.includes('@') ? u.username.split('@')[0] : u.username
            const displayName  = fullNameRaw || usernameDisplay || 'Sin nombre'
            const initials     = displayName[0].toUpperCase()
            const isAdmin     = u.role === 'ADMIN' || u.role === 'admin'
            const avatarUrl   = u.avatar || (u.email ? getCachedProfile(u.email)?.avatar : undefined)
            return (
              <div key={u.id} id={`user-card-${u.id}`} className="biopunk-card p-4">
                <div className="flex items-center gap-4">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="avatar" className="w-11 h-11 rounded-2xl object-cover shrink-0" style={{ border: '2px solid rgba(74,222,128,0.3)' }} />
                  ) : (
                    <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-sm font-bold shrink-0"
                         style={{ background: 'rgba(74,222,128,0.15)', border: '1px solid rgba(74,222,128,0.3)', color: '#4ade80' }}>
                      {initials}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold truncate" style={{ color: '#e2ffe9' }}>{displayName}</h3>
                    <p className="text-xs truncate" style={{ color: 'rgba(255,255,255,0.5)' }}>{u.email || 'Sin email'}</p>
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
                      className="p-2 rounded-xl text-red-400 hover:text-red-300 hover:bg-[rgba(248,113,113,0.1)] transition-colors shrink-0">
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
