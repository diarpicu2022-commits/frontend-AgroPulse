import { useState, useEffect, useRef } from 'react'
import { Sprout, User, Lock, Eye, EyeOff, Chrome, ArrowRight, Mail } from 'lucide-react'
import anime from 'animejs'
import emailjs from '@emailjs/browser'
import { useAuth, removeUserAccess } from '../context/AuthContext'
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
  const [regEmail, setRegEmail]     = useState('')
  const [error,    setError]        = useState('')
  const [success,  setSuccess]      = useState('')
  const [loading,  setLoading]      = useState(false)
  const [tab,      setTab]          = useState<Tab>('local')

  const [verifying,   setVerifying]   = useState(false)
  const [verifyCode,  setVerifyCode]  = useState('')
  const [codeDigits,  setCodeDigits]  = useState(['', '', '', '', '', ''])
  const [savedCreds,  setSavedCreds]  = useState({ username: '', password: '', email: '' })
  const [emailSent,   setEmailSent]   = useState(false)

  const cardRef    = useRef<HTMLDivElement>(null)
  const blobRef1   = useRef<HTMLDivElement>(null)
  const blobRef2   = useRef<HTMLDivElement>(null)
  const blobRef3   = useRef<HTMLDivElement>(null)
  const verifyRef  = useRef<HTMLDivElement>(null)
  const digitRefs  = useRef<(HTMLInputElement | null)[]>([])

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
      if (response.active === false) {
        setError('Tu cuenta ha sido desactivada. Contacta al administrador.')
        return
      }
      login({ ...response, email: response.email ?? response.username, role: response.role === 'ADMIN' ? 'admin' : 'user', provider: response.provider || 'LOCAL' })
    } catch { setError('Credenciales incorrectas. Intenta de nuevo.') }
    finally { setLoading(false) }
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(''); setSuccess('')
    if (!regEmail || !regUser || !regPass) { setError('Completa todos los campos obligatorios'); return }
    if (!regEmail.includes('@')) { setError('Ingresa un email válido'); return }
    if (regPass !== regPass2) { setError('Las contraseñas no coinciden'); return }
    if (regPass.length < 6)  { setError('Contraseña mínimo 6 caracteres'); return }
    setLoading(true)
    try {
      await userRepository.register(regUser.trim(), regPass, regName.trim() || regUser.trim(), regEmail.trim())
      const code = Math.floor(100000 + Math.random() * 900000).toString()
      setVerifyCode(code)
      setSavedCreds({ username: regUser.trim(), password: regPass, email: regEmail.trim() })
      setCodeDigits(['', '', '', '', '', ''])

      // Try to send via EmailJS if configured
      const serviceId  = (import.meta.env.VITE_EMAILJS_SERVICE_ID  as string) || ''
      const templateId = (import.meta.env.VITE_EMAILJS_TEMPLATE_ID as string) || ''
      const publicKey  = (import.meta.env.VITE_EMAILJS_PUBLIC_KEY  as string) || ''
      let sent = false
      if (serviceId && templateId && publicKey) {
        try {
          await emailjs.send(serviceId, templateId, {
            to_email:          regEmail.trim(),
            to_name:           regName.trim() || regUser.trim(),
            verification_code: code,
          }, publicKey)
          sent = true
        } catch { /* fallback: show on screen */ }
      }
      setEmailSent(sent)

      setVerifying(true)
      setTimeout(() => {
        if (!verifyRef.current) return
        const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
        if (!reduced) anime({ targets: verifyRef.current, opacity: [0, 1], translateY: [20, 0], duration: 400, easing: 'easeOutCubic' })
      }, 30)
    } catch (err) { setError((err as Error).message || 'Error al registrarse. Verifica los datos e intenta de nuevo.') }
    finally { setLoading(false) }
  }

  const handleDigit = (idx: number, value: string) => {
    if (!/^\d*$/.test(value)) return
    const next = [...codeDigits]
    next[idx] = value.slice(-1)
    setCodeDigits(next)
    if (value && idx < 5) digitRefs.current[idx + 1]?.focus()
  }

  const handleDigitKey = (idx: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !codeDigits[idx] && idx > 0) {
      digitRefs.current[idx - 1]?.focus()
    }
  }

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    const entered = codeDigits.join('')
    if (entered.length < 6) { setError('Ingresa los 6 dígitos'); return }
    if (entered !== verifyCode) {
      setError('Código incorrecto. Verifica e intenta de nuevo.')
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      if (!reduced && verifyRef.current) {
        anime({ targets: verifyRef.current, translateX: [-8, 8, -5, 5, 0], duration: 300, easing: 'easeInOutSine' })
      }
      return
    }
    setLoading(true)
    setVerifying(false)
    try {
      const response = await userRepository.login(savedCreds.username, savedCreds.password) as AppUser
      // Cuenta nueva: borrar cualquier acceso heredado de localStorage antes de entrar
      removeUserAccess(response.id ?? 0, response.email ?? savedCreds.email)
      login({ ...response, email: response.email ?? savedCreds.email, role: response.role === 'ADMIN' ? 'admin' : 'user', provider: 'LOCAL' })
    } catch {
      setSuccess('¡Email verificado! Ya puedes ingresar con tus credenciales.')
      setTab('local')
      setUsername(savedCreds.username)
    }
    setLoading(false)
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
          <div className="pt-8 pb-6 px-8 text-center">
            <div className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl shadow-glow-green mb-4 animate-glow-pulse">
              <Sprout size={26} className="text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white font-heading mb-1">AgroPulse</h1>
            <p className="text-sm text-white/50">Sistema Inteligente de Invernaderos</p>
          </div>

          {/* Tabs — hidden when verifying */}
          {!verifying && (
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
          )}

          {/* Body */}
          <div className="px-6 pb-8 pt-5">

            {verifying ? (
              <div ref={verifyRef} className="space-y-5">
                {/* Header */}
                <div className="text-center space-y-1">
                  <div className="w-12 h-12 mx-auto bg-green-500/15 border border-green-500/30 rounded-2xl flex items-center justify-center mb-3">
                    <Mail size={20} className="text-green-400" />
                  </div>
                  <h3 className="text-base font-bold text-white">Verifica tu email</h3>
                  <p className="text-xs text-white/50">Cuenta creada para <span className="text-green-300">{savedCreds.email}</span></p>
                </div>

                {/* Code: email confirmation OR on-screen fallback */}
                {emailSent ? (
                  <div className="bg-green-500/10 border border-green-500/25 rounded-2xl p-4 text-center space-y-1">
                    <Mail size={18} className="mx-auto text-green-400 mb-2" />
                    <p className="text-sm font-semibold text-green-300">Código enviado a tu correo</p>
                    <p className="text-[11px] text-white/40">Revisa tu bandeja de entrada (y spam) en <span className="text-green-300">{savedCreds.email}</span></p>
                  </div>
                ) : (
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-4 text-center">
                    <p className="text-[10px] text-white/40 uppercase tracking-widest mb-3">Tu código de verificación</p>
                    <div className="flex justify-center gap-2">
                      {verifyCode.split('').map((d, i) => (
                        <div key={i} className="w-9 h-11 bg-white/10 border border-green-500/30 rounded-xl flex items-center justify-center text-xl font-bold font-mono text-green-300">
                          {d}
                        </div>
                      ))}
                    </div>
                    <p className="text-[10px] text-white/30 mt-3">Introdúcelo en los campos de abajo</p>
                  </div>
                )}

                {/* Error */}
                {error && (
                  <div className="flex items-center gap-2 bg-red-500/15 border border-red-500/30 text-red-300 px-4 py-3 rounded-2xl text-sm">
                    <span className="shrink-0">⚠</span> {error}
                  </div>
                )}

                {/* OTP input form */}
                <form onSubmit={handleVerify} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-white/60 mb-2 uppercase tracking-wide text-center">Ingresa el código</label>
                    <div className="flex justify-center gap-2">
                      {codeDigits.map((d, i) => (
                        <input
                          key={i}
                          ref={el => { digitRefs.current[i] = el }}
                          type="text"
                          inputMode="numeric"
                          maxLength={1}
                          value={d}
                          onChange={e => handleDigit(i, e.target.value)}
                          onKeyDown={e => handleDigitKey(i, e)}
                          className="w-10 h-12 text-center text-lg font-bold font-mono bg-white/10 border border-white/20 rounded-xl text-white focus:border-green-400 focus:outline-none focus:bg-white/15 transition-all"
                        />
                      ))}
                    </div>
                  </div>
                  <button type="submit" disabled={loading}
                    className="w-full btn-primary py-3 text-sm">
                    {loading
                      ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Verificando…</>
                      : <><span>Confirmar y acceder</span><ArrowRight size={16} /></>
                    }
                  </button>
                  <button type="button" onClick={() => { setVerifying(false); setTab('register'); setError('') }}
                    className="w-full text-xs text-white/30 hover:text-white/60 py-1 transition-colors">
                    ← Volver al registro
                  </button>
                </form>
              </div>
            ) : (
              <div id="login-form-content">
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
                      { label: 'Email *',          val: regEmail, set: setRegEmail, ph: 'tu@email.com',        type: 'email',    req: true  },
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
            )}
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
