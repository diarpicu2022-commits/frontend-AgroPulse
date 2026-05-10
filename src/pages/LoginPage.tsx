import { useState, useEffect, useRef } from 'react'
import { Sprout, User, Lock, Eye, EyeOff, Chrome, ArrowRight } from 'lucide-react'
import anime from 'animejs'
import { useAuth } from '../context/AuthContext'
import { userRepository } from '../repositories'
import type { AppUser } from '../types'

type Tab = 'local' | 'register' | 'google'

export default function LoginPage() {
  const { login, supabase } = useAuth()

  const [username, setUsername]     = useState('')
  const [password, setPassword]     = useState('')
  const [showPass, setShowPass]     = useState(false)
  const [regName,  setRegName]      = useState('')
  const [regUser,  setRegUser]      = useState('')
  const [regPass,  setRegPass]      = useState('')
  const [regPass2, setRegPass2]     = useState('')
  const [error,    setError]        = useState('')
  const [success,  setSuccess]      = useState('')
  const [loading,  setLoading]      = useState(false)
  const [tab,      setTab]          = useState<Tab>('local')

  const cardRef    = useRef<HTMLDivElement>(null)
  const blobRef1   = useRef<HTMLDivElement>(null)
  const blobRef2   = useRef<HTMLDivElement>(null)
  const blobRef3   = useRef<HTMLDivElement>(null)

  // Mount animations
  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced) return

    // Card entrance
    anime({ targets: cardRef.current, opacity: [0, 1], scale: [0.94, 1], translateY: [20, 0], duration: 600, easing: 'easeOutCubic' })

    // Floating blobs
    ;[blobRef1, blobRef2, blobRef3].forEach((ref, i) => {
      if (!ref.current) return
      anime({
        targets:   ref.current,
        translateY: [0, -16 + i * 5],
        duration:  4000 + i * 800,
        direction: 'alternate',
        loop:      true,
        easing:    'easeInOutSine',
        delay:     i * 600,
      })
    })
  }, [])

  // Tab switch animation
  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced) return
    const form = document.getElementById('login-form-content')
    if (form) anime({ targets: form, opacity: [0, 1], translateX: [10, 0], duration: 240, easing: 'easeOutCubic' })
  }, [tab])

  const handleLocalLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!username || !password) { setError('Completa usuario y contraseña'); return }
    setLoading(true); setError('')
    try {
      const response = await userRepository.login(username, password) as AppUser
      login({ ...response, email: response.email ?? response.username, role: response.role === 'ADMIN' ? 'admin' : 'user', provider: response.provider || 'LOCAL' })
    } catch { setError('Credenciales incorrectas. Intenta de nuevo.') }
    finally { setLoading(false) }
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(''); setSuccess('')
    if (!regUser || !regPass) { setError('Completa usuario y contraseña'); return }
    if (regPass !== regPass2) { setError('Las contraseñas no coinciden'); return }
    if (regPass.length < 6)  { setError('Contraseña mínimo 6 caracteres'); return }
    setLoading(true)
    try {
      await userRepository.register(regUser.trim(), regPass, regName.trim() || regUser.trim())
      setSuccess('¡Cuenta creada! Ingresa con tus credenciales.')
      setTab('local'); setUsername(regUser.trim())
      setRegUser(''); setRegPass(''); setRegPass2(''); setRegName('')
    } catch (err) { setError((err as Error).message || 'Error al registrarse') }
    finally { setLoading(false) }
  }

  const handleGoogleLogin = async () => {
    if (!supabase) { setError('Google login no configurado.'); return }
    setLoading(true); setError('')
    try {
      const { error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin + '/' } })
      if (error) setError('Error en Google: ' + error.message)
    } catch (err) { setError('Error de conexión: ' + (err as Error).message) }
    finally { setLoading(false) }
  }

  useEffect(() => {
    if (!supabase) return
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        setLoading(true); setError('')
        const u        = session.user
        const uname    = u.email?.split('@')[0] ?? 'user'
        const isAdmin  = u.email === 'diarpicu2022@gmail.com' || (u.email?.includes('admin') ?? false)
        const avatar   = (u.user_metadata?.avatar_url ?? u.user_metadata?.picture ?? null) as string | null
        const fullName = (u.user_metadata?.full_name ?? u.email) as string
        try {
          const response = await userRepository.googleLogin(u.email!, fullName, u.id) as AppUser
          login({ ...response, email: u.email, full_name: response.fullName || fullName, role: response.role === 'ADMIN' ? 'admin' : 'user', provider: 'GOOGLE', avatar })
        } catch { login({ id: 0, username: uname, full_name: fullName, email: u.email, role: isAdmin ? 'admin' : 'user', provider: 'GOOGLE', avatar, active: true }) }
        finally { setLoading(false) }
      }
    })
    return () => subscription?.unsubscribe()
  }, [supabase])

  const switchTab = (t: Tab) => { setTab(t); setError(''); setSuccess('') }

  const tabs: { id: Tab; label: string }[] = [
    { id: 'local',    label: 'Ingresar'    },
    { id: 'register', label: 'Registrarse' },
    { id: 'google',   label: 'Google'      },
  ]

  return (
    <div className="min-h-screen bg-gradient-nature flex items-center justify-center p-4 relative overflow-hidden">

      {/* Animated blobs */}
      <div ref={blobRef1} className="absolute top-16 right-16 w-80 h-80 rounded-full bg-green-400/10 blur-3xl pointer-events-none" />
      <div ref={blobRef2} className="absolute bottom-16 left-16 w-96 h-96 rounded-full bg-emerald-500/8 blur-3xl pointer-events-none" />
      <div ref={blobRef3} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-green-600/5 blur-3xl pointer-events-none" />

      {/* Mesh overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.01)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.01)_1px,transparent_1px)] bg-[size:60px_60px] pointer-events-none" />

      {/* Login card */}
      <div ref={cardRef} className="relative z-10 w-full max-w-md">
        <div className="glass-dark border border-white/10 rounded-[28px] shadow-glass-dark overflow-hidden">

          {/* Header */}
          <div className="pt-8 pb-6 px-8 text-center border-b border-white/8">
            <div className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl shadow-glow-green mb-4 animate-glow-pulse">
              <Sprout size={26} className="text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white font-heading mb-1">AgroPulse</h1>
            <p className="text-sm text-white/50">Sistema Inteligente de Invernaderos</p>
          </div>

          {/* Tabs */}
          <div className="px-6 pt-5">
            <div className="flex gap-1 bg-white/5 border border-white/8 p-1 rounded-2xl">
              {tabs.map(t => (
                <button
                  key={t.id}
                  onClick={() => switchTab(t.id)}
                  className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all duration-200 cursor-pointer ${
                    tab === t.id
                      ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-glow-sm'
                      : 'text-white/40 hover:text-white/70'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Body */}
          <div className="px-6 pb-8 pt-5">
            {success && (
              <div className="mb-4 flex items-center gap-2 bg-green-500/15 border border-green-500/30 text-green-300 px-4 py-3 rounded-2xl text-sm">
                <span className="shrink-0">✓</span> {success}
              </div>
            )}
            {error && (
              <div className="mb-4 flex items-center gap-2 bg-red-500/15 border border-red-500/30 text-red-300 px-4 py-3 rounded-2xl text-sm">
                <span className="shrink-0">⚠</span> {error}
              </div>
            )}

            <div id="login-form-content">

              {/* ── Local Login ── */}
              {tab === 'local' && (
                <form onSubmit={handleLocalLogin} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-white/60 mb-2 uppercase tracking-wide">Usuario</label>
                    <div className="relative">
                      <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" />
                      <input type="text" value={username} onChange={e => setUsername(e.target.value)}
                        placeholder="admin" disabled={loading}
                        className="input-field-dark pl-10" autoComplete="username" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-white/60 mb-2 uppercase tracking-wide">Contraseña</label>
                    <div className="relative">
                      <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30" />
                      <input type={showPass ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                        placeholder="••••••••" disabled={loading}
                        className="input-field-dark pl-10 pr-10" autoComplete="current-password" />
                      <button type="button" onClick={() => setShowPass(v => !v)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 cursor-pointer transition-colors">
                        {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                  </div>
                  <button type="submit" disabled={loading}
                    className="w-full btn-primary py-3 text-sm mt-2 group">
                    {loading
                      ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Verificando…</>
                      : <><span>Ingresar</span><ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" /></>
                    }
                  </button>
                  <p className="text-center text-[11px] text-white/30 pt-1">
                    Puede tardar ~1 min si el servidor está en reposo
                  </p>
                </form>
              )}

              {/* ── Register ── */}
              {tab === 'register' && (
                <form onSubmit={handleRegister} className="space-y-3">
                  {[
                    { label: 'Nombre completo', val: regName,  set: setRegName,  ph: 'Tu nombre',           type: 'text',     req: false },
                    { label: 'Usuario *',        val: regUser,  set: setRegUser,  ph: 'usuario123',          type: 'text',     req: true  },
                    { label: 'Contraseña *',     val: regPass,  set: setRegPass,  ph: 'Mínimo 6 caracteres', type: 'password', req: true  },
                    { label: 'Confirmar *',      val: regPass2, set: setRegPass2, ph: 'Repite la contraseña', type: 'password', req: true  },
                  ].map(field => (
                    <div key={field.label}>
                      <label className="block text-xs font-semibold text-white/60 mb-1.5 uppercase tracking-wide">{field.label}</label>
                      <input type={field.type} value={field.val} onChange={e => field.set(e.target.value)}
                        placeholder={field.ph} required={field.req}
                        className="input-field-dark" />
                    </div>
                  ))}
                  <button type="submit" disabled={loading}
                    className="w-full btn-primary py-3 text-sm mt-1">
                    {loading
                      ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Creando…</>
                      : 'Crear cuenta'
                    }
                  </button>
                  <p className="text-center text-[11px] text-white/30">Tu cuenta será asignada a un invernadero por el administrador</p>
                </form>
              )}

              {/* ── Google ── */}
              {tab === 'google' && (
                <div className="space-y-4 pt-2">
                  <p className="text-sm text-white/50 text-center">Accede con tu cuenta de Google</p>
                  <button onClick={handleGoogleLogin} disabled={loading}
                    className="w-full flex items-center justify-center gap-3 bg-white hover:bg-gray-50
                               text-gray-700 font-semibold py-3 rounded-2xl transition-all duration-200
                               cursor-pointer hover:shadow-lg hover:-translate-y-0.5 transform-gpu
                               disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0">
                    {loading
                      ? <><div className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" /> Conectando...</>
                      : <>
                          <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
                            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                          </svg>
                          Continuar con Google
                        </>
                    }
                  </button>
                  <p className="text-[11px] text-white/30 text-center">Se abrirá una ventana del navegador</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-[11px] text-white/25 mt-5">
          © Universidad Cooperativa de Colombia · Nariño
        </p>
      </div>
    </div>
  )
}
