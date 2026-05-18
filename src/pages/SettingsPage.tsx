import { useState, useRef } from 'react'
import { Info, Key, Wifi, WifiOff, CheckCircle, XCircle, LogOut, ShieldCheck, Camera, CheckCircle2, User } from 'lucide-react'
import { useAuth, supabase, getCachedProfile, cacheProfile } from '../context/AuthContext'
import { getGroqKey, getGitHubToken, getGemmaKey } from '../services/ai-service'
import { userRepository } from '../repositories'
import type { AppUser, UserDto } from '../types'

const safeGet    = (key: string) => { try { return localStorage.getItem(key) ?? '' } catch { return '' } }
const safeSet    = (key: string, val: string) => { try { localStorage.setItem(key, val) } catch { /* noop */ } }
const safeRemove = (key: string) => { try { localStorage.removeItem(key) } catch { /* noop */ } }

export default function SettingsPage() {
  const { user: authUser, logout, updateProfile } = useAuth()

  const [groqKey,   setGroqKey]   = useState(safeGet('agropulse_groq_key'))
  const [githubKey, setGithubKey] = useState(safeGet('agropulse_github_token'))
  const [gemmaKey,  setGemmaKey]  = useState(safeGet('agropulse_gemma_key'))
  const [saved,     setSaved]     = useState(false)

  const [editingProfile, setEditingProfile] = useState(false)
  const [avatarUrl,      setAvatarUrl]      = useState('')
  const [avatarPreview,  setAvatarPreview]  = useState('')
  const [nameInput,      setNameInput]      = useState('')
  const [savingProfile,  setSavingProfile]  = useState(false)
  const [profileSaved,   setProfileSaved]   = useState(false)
  const [avatarError,    setAvatarError]    = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const saveKeys = () => {
    if (groqKey.trim())   safeSet('agropulse_groq_key', groqKey.trim())
    else                  safeRemove('agropulse_groq_key')
    if (githubKey.trim()) safeSet('agropulse_github_token', githubKey.trim())
    else                  safeRemove('agropulse_github_token')
    if (gemmaKey.trim())  safeSet('agropulse_gemma_key', gemmaKey.trim())
    else                  safeRemove('agropulse_gemma_key')
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const openEditProfile = () => {
    const cached = authUser?.email ? getCachedProfile(authUser.email) : null
    const currentAvatar = authUser?.avatar || cached?.avatar || ''
    setAvatarUrl(currentAvatar.startsWith('data:') ? '' : currentAvatar)
    setAvatarPreview(currentAvatar)
    setNameInput(authUser?.full_name || (authUser as AppUser | null)?.fullName || '')
    setAvatarError('')
    setEditingProfile(true)
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 1024 * 1024) { setAvatarError('Imagen demasiado grande (máx. 1MB)'); return }
    setAvatarError('')
    const reader = new FileReader()
    reader.onload = ev => {
      const result = ev.target?.result as string
      setAvatarPreview(result)
      setAvatarUrl(result)
    }
    reader.readAsDataURL(file)
  }

  const handleUrlChange = (url: string) => {
    setAvatarUrl(url)
    if (url.startsWith('http')) setAvatarPreview(url)
    else if (!url) setAvatarPreview('')
  }

  const saveProfile = async () => {
    if (!authUser) return
    setSavingProfile(true)
    const newAvatar = avatarUrl || avatarPreview
    const newName   = nameInput.trim()
    try {
      await userRepository.update(authUser.id, {
        avatar:    newAvatar || undefined,
        full_name: newName || undefined,
      } as Partial<UserDto>)
    } catch { /* backend may reject — continue with local update */ }
    if (authUser.email && newAvatar) {
      cacheProfile(authUser.email, { avatar: newAvatar, full_name: newName || undefined })
    }
    updateProfile({ avatar: newAvatar || authUser.avatar, full_name: newName || authUser.full_name })
    setSavingProfile(false)
    setProfileSaved(true)
    setEditingProfile(false)
    setTimeout(() => setProfileSaved(false), 3000)
  }

  const groqActive   = getGroqKey()
  const githubActive = getGitHubToken()
  const gemmaActive  = getGemmaKey()
  const activeCount  = [groqActive, githubActive, gemmaActive].filter(Boolean).length
  const isAdmin      = authUser?.role === 'ADMIN' || authUser?.role === 'admin'

  return (
    <div className="space-y-5 max-w-2xl mx-auto">
      <div>
        <h2 className="section-title">Configuración</h2>
        <p className="section-subtitle">Ajustes del sistema y claves de IA</p>
      </div>

      {/* Profile card */}
      <div className="card p-5">
        <div className="flex items-center gap-2 mb-4">
          <User size={15} style={{ color: 'rgba(255,255,255,0.35)' }} />
          <h3 className="text-sm font-semibold" style={{ color: '#e2ffe9' }}>Mi Perfil</h3>
          {profileSaved && (
            <span className="ml-auto flex items-center gap-1 text-xs text-green-600 font-medium">
              <CheckCircle2 size={13} /> Guardado
            </span>
          )}
        </div>

        {/* Avatar + info row */}
        <div className="flex items-center gap-4 mb-4">
          {/* Avatar */}
          <div className="relative shrink-0">
            {(authUser?.avatar || (authUser?.email ? getCachedProfile(authUser.email)?.avatar : null)) ? (
              <img
                src={authUser?.avatar || getCachedProfile(authUser?.email ?? '')?.avatar || ''}
                alt="avatar"
                className="w-14 h-14 rounded-2xl object-cover ring-2 ring-green-200"
              />
            ) : (
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center text-white text-lg font-bold shadow-glow-sm">
                {((authUser?.full_name || authUser?.username || '?')[0]).toUpperCase()}
              </div>
            )}
            <button
              onClick={() => editingProfile ? setEditingProfile(false) : openEditProfile()}
              className="absolute -bottom-1.5 -right-1.5 w-6 h-6 bg-green-500 hover:bg-green-600 rounded-lg flex items-center justify-center shadow-sm transition-colors"
              title="Cambiar foto"
            >
              <Camera size={11} className="text-white" />
            </button>
          </div>
          {/* Info */}
          <div className="flex-1 min-w-0">
            <p className="font-semibold truncate" style={{ color: '#e2ffe9' }}>
              {authUser?.full_name || (authUser as AppUser | null)?.fullName || authUser?.username || '—'}
            </p>
            <p className="text-xs truncate" style={{ color: 'rgba(255,255,255,0.35)' }}>{authUser?.email || 'Sin email'}</p>
            <div className="mt-1">
              <span className={isAdmin ? 'badge-red' : 'badge-blue'}>
                <ShieldCheck size={10} />
                {isAdmin ? 'Administrador' : 'Operario'}
              </span>
            </div>
          </div>
          {!editingProfile && (
            <button onClick={openEditProfile}
              className="btn-secondary px-3 py-1.5 text-xs shrink-0">
              Editar
            </button>
          )}
        </div>

        {/* Edit form */}
        {editingProfile && (
          <div className="border-t border-[rgba(74,222,128,0.12)] pt-4 space-y-3">
            {/* Name */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: 'rgba(255,255,255,0.35)' }}>
                Nombre a mostrar
              </label>
              <input type="text" value={nameInput}
                onChange={e => setNameInput(e.target.value)}
                placeholder={authUser?.username || 'Tu nombre'}
                className="input-field text-sm" />
            </div>

            {/* Avatar URL */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: 'rgba(255,255,255,0.35)' }}>
                URL de foto de perfil
              </label>
              <input type="url" value={avatarUrl.startsWith('data:') ? '' : avatarUrl}
                onChange={e => handleUrlChange(e.target.value)}
                placeholder="https://ejemplo.com/mi-foto.jpg"
                className="input-field text-sm" />
            </div>

            {/* File upload */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: 'rgba(255,255,255,0.35)' }}>
                O subir desde tu dispositivo
              </label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
              <button type="button" onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 w-full btn-secondary py-2 text-xs justify-center">
                <Camera size={13} /> Seleccionar imagen (máx. 1MB)
              </button>
              {avatarError && <p className="text-xs text-red-500 mt-1">{avatarError}</p>}
            </div>

            {/* Preview */}
            {avatarPreview && (
              <div className="flex items-center gap-3 p-3 rounded-2xl border border-[rgba(74,222,128,0.12)]" style={{ background: '#051a0a' }}>
                <img src={avatarPreview} alt="preview"
                  className="w-10 h-10 rounded-xl object-cover shrink-0"
                  onError={() => setAvatarPreview('')}
                />
                <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>Vista previa de la foto</p>
                <button onClick={() => { setAvatarPreview(''); setAvatarUrl('') }}
                  className="ml-auto text-xs text-red-400 hover:text-red-600">
                  Quitar
                </button>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2 pt-1">
              <button onClick={saveProfile} disabled={savingProfile}
                className="flex-1 btn-primary py-2.5 text-sm">
                {savingProfile
                  ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Guardando…</>
                  : <><CheckCircle2 size={14} /> Guardar cambios</>
                }
              </button>
              <button onClick={() => setEditingProfile(false)}
                className="flex-1 btn-secondary py-2.5 text-sm">
                Cancelar
              </button>
            </div>
          </div>
        )}
      </div>

      {/* System info */}
      <div className="card p-5">
        <div className="flex items-center gap-2 mb-4">
          <Info size={15} style={{ color: 'rgba(255,255,255,0.35)' }} />
          <h3 className="text-sm font-semibold" style={{ color: '#e2ffe9' }}>Información del Sistema</h3>
        </div>
        <dl className="space-y-3 text-sm">
          {[
            { label: 'Versión',  value: 'AgroPulse v10.0' },
            { label: 'Build',    value: '2026.05' },
            { label: 'Usuario',  value: authUser?.email ?? 'No especificado' },
          ].map(({ label, value }) => (
            <div key={label} className="flex justify-between items-center py-1 border-b border-[rgba(74,222,128,0.08)] last:border-0">
              <dt style={{ color: 'rgba(255,255,255,0.35)' }}>{label}</dt>
              <dd className="font-medium" style={{ color: '#e2ffe9' }}>{value}</dd>
            </div>
          ))}
          <div className="flex justify-between items-center py-1 border-b border-[rgba(74,222,128,0.08)]">
            <dt style={{ color: 'rgba(255,255,255,0.35)' }}>Rol</dt>
            <dd>
              <span className={isAdmin ? 'badge-red' : 'badge-blue'}>
                <ShieldCheck size={10} />
                {isAdmin ? 'Administrador' : 'Operario'}
              </span>
            </dd>
          </div>
          <div className="flex justify-between items-center py-1 border-b border-[rgba(74,222,128,0.08)]">
            <dt style={{ color: 'rgba(255,255,255,0.35)' }}>Supabase</dt>
            <dd>
              <span className={`flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full`} style={supabase ? { background: 'rgba(74,222,128,0.1)', color: '#4ade80' } : { background: 'rgba(248,113,113,0.1)', color: '#f87171' }}>
                {supabase ? <><Wifi size={11} /> Conectado</> : <><WifiOff size={11} /> Sin configurar</>}
              </span>
            </dd>
          </div>
          <div className="flex justify-between items-center py-1">
            <dt style={{ color: 'rgba(255,255,255,0.35)' }}>IAs Activas</dt>
            <dd>
              <span className="flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full" style={activeCount > 0 ? { background: 'rgba(74,222,128,0.1)', color: '#4ade80' } : { background: 'rgba(251,191,36,0.1)', color: '#fbbf24' }}>
                {activeCount > 0
                  ? <><CheckCircle size={11} /> {activeCount} de 3 activas</>
                  : <><XCircle size={11} /> Sin configurar</>
                }
              </span>
            </dd>
          </div>
        </dl>
      </div>

      {/* AI Keys */}
      {!isAdmin ? (
        <div className="alert-warning">
          <ShieldCheck size={14} className="shrink-0" />
          <span>Solo los Administradores pueden configurar claves de IA.</span>
        </div>
      ) : (
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-1">
            <Key size={15} style={{ color: 'rgba(255,255,255,0.35)' }} />
            <h3 className="text-sm font-semibold" style={{ color: '#e2ffe9' }}>Inteligencias Artificiales</h3>
          </div>
          <p className="text-xs mb-4" style={{ color: 'rgba(255,255,255,0.35)' }}>Configura las IAs disponibles en la aplicación. Las claves se guardan en el navegador (localStorage).</p>

          <div className="space-y-4">
            {([
              { key: 'groq',   label: 'Groq (LLaMA-3.3-70B)',  ph: 'gsk_...',              val: groqKey,   set: setGroqKey,   active: groqActive   },
              { key: 'github', label: 'GitHub AI (phi-4-mini)', ph: 'ghp_...',              val: githubKey, set: setGithubKey, active: githubActive },
              { key: 'gemma',  label: 'Gemma 4 (Google AI)',    ph: 'AIza...',              val: gemmaKey,  set: setGemmaKey,  active: gemmaActive  },
            ] as const).map(row => (
              <div key={row.key} className="p-4 rounded-2xl" style={{ border: '1px solid rgba(74,222,128,0.12)' }}>
                <div className="flex justify-between items-center mb-2.5">
                  <span className="font-medium text-sm" style={{ color: '#e2ffe9' }}>{row.label}</span>
                  <span className={row.active ? 'badge-green' : 'badge-gray'}>
                    {row.active ? 'Activa' : 'No configurada'}
                  </span>
                </div>
                <input type="password" value={row.val as string}
                  onChange={e => (row.set as React.Dispatch<React.SetStateAction<string>>)(e.target.value)}
                  className="input-field text-sm"
                  placeholder={row.ph} />
              </div>
            ))}
          </div>

          <button onClick={saveKeys}
            className="w-full btn-primary py-2.5 text-sm mt-4">
            {saved
              ? <><CheckCircle size={14} /> Claves guardadas</>
              : <><Key size={14} /> Guardar todas las claves</>
            }
          </button>
        </div>
      )}

      {/* Dev team */}
      <div className="card p-5">
        <h3 className="text-sm font-semibold mb-4" style={{ color: '#e2ffe9' }}>Equipo de Desarrollo</h3>
        <dl className="space-y-3 text-sm">
          {[
            { label: 'Desarrollador', value: 'Diego Armando Pinta Cuasquen' },
            { label: 'Universidad',   value: 'Cooperativa de Colombia – Nariño' },
            { label: 'Proyecto',      value: 'Semestre 2025' },
          ].map(({ label, value }) => (
            <div key={label} className="flex justify-between items-center py-1 border-b border-[rgba(74,222,128,0.08)] last:border-0">
              <dt style={{ color: 'rgba(255,255,255,0.35)' }}>{label}</dt>
              <dd className="font-medium text-right" style={{ color: '#e2ffe9' }}>{value}</dd>
            </div>
          ))}
        </dl>
      </div>

      {/* Logout */}
      <button onClick={logout}
        className="w-full btn-danger py-3 text-sm">
        <LogOut size={15} />
        Cerrar sesión
      </button>
    </div>
  )
}
