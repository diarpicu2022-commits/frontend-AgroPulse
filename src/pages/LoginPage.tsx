import { useState, useEffect, useRef } from 'react'
import { User, Lock, Eye, EyeOff, ArrowRight, Mail } from 'lucide-react'
import anime from 'animejs'
import BotanicalSvg from '../components/ui/BotanicalSvg'
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
  const verifyRef  = useRef<HTMLDivElement>(null)
  const digitRefs  = useRef<(HTMLInputElement | null)[]>([])

  // Mount animations
  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced) return
    anime({
      targets: cardRef.current,
      opacity: [0, 1],
      scale: [0.92, 1],
      translateY: [24, 0],
      duration: 600,
      easing: 'easeOutCubic',
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
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
         style={{ background: '#020d05' }}>

      {/* Dot grid overlay */}
      <div className="absolute inset-0 pointer-events-none"
           style={{ backgroundImage: 'radial-gradient(rgba(74,222,128,0.15) 1px, transparent 1px)', backgroundSize: '28px 28px' }} />

      {/* Botanical decoration — desktop right side */}
      <div className="absolute right-12 top-1/2 -translate-y-1/2 hidden lg:block pointer-events-none" style={{ opacity: 0.35 }}>
        <BotanicalSvg size={280} color="#4ade80" animate />
      </div>
      <div className="absolute left-12 bottom-12 hidden lg:block pointer-events-none" style={{ opacity: 0.18 }}>
        <BotanicalSvg size={160} color="#22d3ee" animate />
      </div>

      {/* Login card */}
      <div ref={cardRef} className="relative z-10 w-full max-w-md" style={{ opacity: 0 }}>
        <div className="rounded-[24px] overflow-hidden"
             style={{ background: '#0a1e0f', border: '1px solid rgba(74,222,128,0.15)', boxShadow: '0 0 60px rgba(0,0,0,0.8)' }}>

          {/* Header */}
          <div className="pt-8 pb-6 px-8 text-center" style={{ borderBottom: '1px solid rgba(74,222,128,0.08)' }}>
            {/* Logo mark SVG */}
            <div className="flex justify-center mb-4">
              <svg width="56" height="56" viewBox="0 0 56 56" xmlns="http://www.w3.org/2000/svg">
                <defs><clipPath id="loginLogoClip"><circle cx="28" cy="28" r="26"/></clipPath></defs>
                <circle cx="28" cy="28" r="27" fill="#020d05" stroke="rgba(74,222,128,0.4)" strokeWidth="1.2"/>
                <g clipPath="url(#loginLogoClip)">
                  <rect x="2" y="2" width="52" height="52" fill="#071209"/>
                  <path d="M 8 31 A 20 20 0 0 1 48 31 Z" fill="#f59e0b"/>
                  <ellipse cx="28" cy="31" rx="16" ry="4" fill="rgba(251,191,36,0.22)"/>
                  <path d="M 2 31 Q 15 26 28 30 Q 41 34 54 31 L 54 54 L 2 54 Z" fill="#14532d"/>
                  <path d="M 2 36 Q 15 32 28 35 Q 41 38 54 36 L 54 54 L 2 54 Z" fill="#166534"/>
                  <path d="M 2 41 Q 15 38 28 40 Q 41 42 54 41 L 54 54 L 2 54 Z" fill="#15803d"/>
                  <path d="M 11 27 Q 5 20 9 13 Q 16 16 11 27 Z" fill="#22c55e" opacity="0.8"/>
                  <path d="M 45 27 Q 51 20 47 13 Q 40 16 45 27 Z" fill="#22c55e" opacity="0.8"/>
                  <path d="M 4 31 L 13 31 L 16 23 L 20 39 L 24 31 L 28 31 L 31 25 L 34 37 L 37 31 L 52 31"
                        stroke="#f87171" strokeWidth="1.7" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                </g>
              </svg>
            </div>
            <h1 className="text-2xl font-bold mb-1" style={{ color: '#e2ffe9', fontFamily: "'Space Grotesk', sans-serif" }}>
              Agro<span style={{ color: '#f97316' }}>Pulse</span>
            </h1>
            <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)', fontFamily: "'JetBrains Mono', monospace" }}>
              Sistema Inteligente de Invernaderos
            </p>
          </div>

          {/* Tabs — hidden when verifying */}
          {!verifying && (
            <div className="px-6 pt-5">
              <div className="flex gap-1 p-1 rounded-xl" style={{ background: 'rgba(74,222,128,0.05)', border: '1px solid rgba(74,222,128,0.1)' }}>
                {tabs.map(t => (
                  <button
                    key={t.id}
                    onClick={() => switchTab(t.id)}
                    className="flex-1 py-2 rounded-lg text-xs font-semibold transition-all duration-200 cursor-pointer"
                    style={tab === t.id
                      ? { background: '#4ade80', color: '#020d05', fontFamily: "'JetBrains Mono', monospace" }
                      : { color: 'rgba(255,255,255,0.35)', fontFamily: "'JetBrains Mono', monospace" }
                    }
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
                <div className="text-center space-y-1">
                  <div className="w-12 h-12 mx-auto rounded-2xl flex items-center justify-center mb-3"
                       style={{ background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.2)' }}>
                    <Mail size={20} style={{ color: '#4ade80' }} />
                  </div>
                  <h3 className="text-base font-bold" style={{ color: '#e2ffe9' }}>Verifica tu email</h3>
                  <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
                    Cuenta creada para <span style={{ color: '#4ade80' }}>{savedCreds.email}</span>
                  </p>
                </div>
                {emailSent ? (
                  <div className="rounded-2xl p-4 text-center space-y-1"
                       style={{ background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.2)' }}>
                    <Mail size={18} className="mx-auto mb-2" style={{ color: '#4ade80' }} />
                    <p className="text-sm font-semibold" style={{ color: '#4ade80' }}>Código enviado a tu correo</p>
                    <p className="text-[11px]" style={{ color: 'rgba(255,255,255,0.35)' }}>
                      Revisa tu bandeja de entrada (y spam) en <span style={{ color: '#4ade80' }}>{savedCreds.email}</span>
                    </p>
                  </div>
                ) : (
                  <div className="rounded-2xl p-4 text-center" style={{ background: 'rgba(74,222,128,0.05)', border: '1px solid rgba(74,222,128,0.1)' }}>
                    <p className="text-[10px] uppercase tracking-widest mb-3" style={{ color: 'rgba(255,255,255,0.35)', fontFamily: "'JetBrains Mono', monospace" }}>
                      Tu código de verificación
                    </p>
                    <div className="flex justify-center gap-2">
                      {verifyCode.split('').map((d, i) => (
                        <div key={i} className="w-9 h-11 rounded-xl flex items-center justify-center text-xl font-bold font-mono"
                             style={{ background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.25)', color: '#4ade80' }}>
                          {d}
                        </div>
                      ))}
                    </div>
                    <p className="text-[10px] mt-3" style={{ color: 'rgba(255,255,255,0.25)' }}>Introdúcelo en los campos de abajo</p>
                  </div>
                )}
                {error && (
                  <div className="alert-danger">{error}</div>
                )}
                <form onSubmit={handleVerify} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold mb-2 text-center uppercase tracking-wide"
                           style={{ color: 'rgba(255,255,255,0.5)', fontFamily: "'JetBrains Mono', monospace" }}>
                      Ingresa el código
                    </label>
                    <div className="flex justify-center gap-2">
                      {codeDigits.map((d, i) => (
                        <input
                          key={i}
                          ref={el => { digitRefs.current[i] = el }}
                          type="text" inputMode="numeric" maxLength={1} value={d}
                          onChange={e => handleDigit(i, e.target.value)}
                          onKeyDown={e => handleDigitKey(i, e)}
                          className="w-10 h-12 text-center text-lg font-bold font-mono rounded-xl transition-all"
                          style={{ background: 'rgba(74,222,128,0.06)', border: '1px solid rgba(74,222,128,0.2)', color: '#e2ffe9' }}
                        />
                      ))}
                    </div>
                  </div>
                  <button type="submit" disabled={loading} className="w-full btn-primary py-3 text-sm">
                    {loading
                      ? <><div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />Verificando…</>
                      : <><span>Confirmar y acceder</span><ArrowRight size={16} /></>}
                  </button>
                  <button type="button" onClick={() => { setVerifying(false); setTab('register'); setError('') }}
                          className="w-full text-xs py-1 transition-colors"
                          style={{ color: 'rgba(255,255,255,0.25)' }}>
                    ← Volver al registro
                  </button>
                </form>
              </div>
            ) : (
              <div id="login-form-content">
                {success && <div className="mb-4 alert-success">{success}</div>}
                {error   && <div className="mb-4 alert-danger">{error}</div>}

                {/* Local Login */}
                {tab === 'local' && (
                  <form onSubmit={handleLocalLogin} className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold mb-2 uppercase tracking-wide"
                             style={{ color: 'rgba(255,255,255,0.5)', fontFamily: "'JetBrains Mono', monospace" }}>Usuario</label>
                      <div className="relative">
                        <User size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: 'rgba(255,255,255,0.25)' }} />
                        <input type="text" value={username} onChange={e => setUsername(e.target.value)}
                               placeholder="admin" disabled={loading}
                               className="input-field-dark pl-10" autoComplete="username" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold mb-2 uppercase tracking-wide"
                             style={{ color: 'rgba(255,255,255,0.5)', fontFamily: "'JetBrains Mono', monospace" }}>Contraseña</label>
                      <div className="relative">
                        <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: 'rgba(255,255,255,0.25)' }} />
                        <input type={showPass ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                               placeholder="••••••••" disabled={loading}
                               className="input-field-dark pl-10 pr-10" autoComplete="current-password" />
                        <button type="button" onClick={() => setShowPass(v => !v)}
                                className="absolute right-3.5 top-1/2 -translate-y-1/2 cursor-pointer transition-colors"
                                style={{ color: 'rgba(255,255,255,0.25)' }}>
                          {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                        </button>
                      </div>
                    </div>
                    <button type="submit" disabled={loading} className="w-full btn-primary py-3 text-sm mt-2">
                      {loading
                        ? <><div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />Verificando…</>
                        : <><span>Ingresar</span><ArrowRight size={16} /></>}
                    </button>
                    <p className="text-center text-[11px] pt-1" style={{ color: 'rgba(255,255,255,0.25)', fontFamily: "'JetBrains Mono', monospace" }}>
                      Puede tardar ~1 min si el servidor está en reposo
                    </p>
                  </form>
                )}

                {/* Register */}
                {tab === 'register' && (
                  <form onSubmit={handleRegister} className="space-y-3">
                    {[
                      { label: 'Nombre completo', val: regName,  set: setRegName,  ph: 'Tu nombre',            type: 'text',     req: false },
                      { label: 'Email *',          val: regEmail, set: setRegEmail, ph: 'tu@email.com',         type: 'email',    req: true  },
                      { label: 'Usuario *',        val: regUser,  set: setRegUser,  ph: 'usuario123',           type: 'text',     req: true  },
                      { label: 'Contraseña *',     val: regPass,  set: setRegPass,  ph: 'Mínimo 6 caracteres',  type: 'password', req: true  },
                      { label: 'Confirmar *',      val: regPass2, set: setRegPass2, ph: 'Repite la contraseña', type: 'password', req: true  },
                    ].map(field => (
                      <div key={field.label}>
                        <label className="block text-xs font-semibold mb-1.5 uppercase tracking-wide"
                               style={{ color: 'rgba(255,255,255,0.5)', fontFamily: "'JetBrains Mono', monospace" }}>
                          {field.label}
                        </label>
                        <input type={field.type} value={field.val} onChange={e => field.set(e.target.value)}
                               placeholder={field.ph} required={field.req} className="input-field-dark" />
                      </div>
                    ))}
                    <button type="submit" disabled={loading} className="w-full btn-primary py-3 text-sm mt-1">
                      {loading
                        ? <><div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />Creando…</>
                        : 'Crear cuenta'}
                    </button>
                    <p className="text-center text-[11px]" style={{ color: 'rgba(255,255,255,0.25)' }}>
                      Tu cuenta será asignada a un invernadero por el administrador
                    </p>
                  </form>
                )}

                {/* Google */}
                {tab === 'google' && (
                  <div className="space-y-4 pt-2">
                    <p className="text-sm text-center" style={{ color: 'rgba(255,255,255,0.4)' }}>Accede con tu cuenta de Google</p>
                    <button onClick={handleGoogleLogin} disabled={loading}
                            className="w-full flex items-center justify-center gap-3 bg-white hover:bg-gray-50 text-gray-700 font-semibold py-3 rounded-2xl transition-all duration-200 cursor-pointer hover:shadow-lg hover:-translate-y-0.5 transform-gpu disabled:opacity-50">
                      {loading
                        ? <><div className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />Conectando...</>
                        : <>
                            <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
                              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                            </svg>
                            Continuar con Google
                          </>}
                    </button>
                    <p className="text-[11px] text-center" style={{ color: 'rgba(255,255,255,0.25)' }}>Se abrirá una ventana del navegador</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        <p className="text-center text-[11px] mt-5" style={{ color: 'rgba(255,255,255,0.18)', fontFamily: "'JetBrains Mono', monospace" }}>
          © Universidad Cooperativa de Colombia · Nariño
        </p>
      </div>
    </div>
  )
}
