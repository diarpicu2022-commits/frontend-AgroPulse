import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'

export default function LoginPage() {
  const { login, supabase } = useAuth()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [regName, setRegName]   = useState('')
  const [regUser, setRegUser]   = useState('')
  const [regPass, setRegPass]   = useState('')
  const [regPass2, setRegPass2] = useState('')
  const [error, setError]       = useState('')
  const [success, setSuccess]   = useState('')
  const [loading, setLoading]   = useState(false)
  const [tab, setTab]           = useState('local') // 'local' | 'google' | 'register'

  const handleLocalLogin = async (e) => {
    e.preventDefault()
    if (!username || !password) {
      setError('Por favor completa usuario y contraseña')
      return
    }
    setLoading(true)
    setError('')
    try {
      const response = await api.auth.login(username, password)
      const role = response.role === 'ADMIN' ? 'admin' : 'user'
      login({
        ...response,
        email:    response.username,
        role:     role,
        provider: response.provider || 'LOCAL'
      })
    } catch (err) {
      setError('Credenciales incorrectas. Intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleLogin = async () => {
    if (!supabase) {
      setError('Google login no configurado. Usa credenciales locales.')
      return
    }
    setLoading(true)
    setError('')
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.origin + '/' }
      })
      if (error) setError('Error en Google: ' + error.message)
    } catch (err) {
      setError('Error de conexión: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  // Intercept Supabase session and send to backend
  useEffect(() => {
    if (!supabase) return

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        setLoading(true)
        setError('')
        const u        = session.user
        const username = u.email.split('@')[0]
        const isAdmin  = u.email === 'diarpicu2022@gmail.com' || u.email.includes('admin')
        const avatar   = u.user_metadata?.avatar_url || u.user_metadata?.picture || null
        const fullName = u.user_metadata?.full_name || u.email

        try {
          const response = await api.auth.googleLogin(u.email, fullName, u.id)
          const role = response.role === 'ADMIN' ? 'admin' : 'user'
          login({
            ...response,
            email:     u.email,
            full_name: response.fullName || fullName,
            role,
            provider:  'GOOGLE',
            avatar
          })
        } catch {
          // Backend dormido o no disponible — usar datos de la sesión directamente
          login({
            id:        u.id,
            username,
            full_name: fullName,
            email:     u.email,
            role:      isAdmin ? 'admin' : 'user',
            provider:  'GOOGLE',
            avatar,
            active:    true
          })
        } finally {
          setLoading(false)
        }
      }
    })

    return () => subscription?.unsubscribe()
  }, [supabase])

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-900 via-green-800 to-emerald-700 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute top-20 right-20 w-72 h-72 bg-green-400 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-20 left-20 w-72 h-72 bg-emerald-400 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      {/* Login Card */}
      <div className="bg-white/95 backdrop-blur-md rounded-3xl shadow-2xl p-8 w-full max-w-md relative z-10 border border-white/20">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-6xl mb-4 animate-bounce" style={{ animationDuration: '2s' }}>🌿</div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent mb-2">
            AgroPulse
          </h1>
          <p className="text-gray-600 text-sm">Sistema Inteligente de Monitoreo de Invernaderos</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-xl">
          {[
            { id: 'local',    label: 'Ingresar' },
            { id: 'register', label: 'Registrarse' },
            { id: 'google',   label: 'Google' },
          ].map(t => (
            <button key={t.id}
              onClick={() => { setTab(t.id); setError(''); setSuccess('') }}
              className={`flex-1 py-2 px-2 rounded-lg font-medium text-xs transition-all ${
                tab === t.id ? 'bg-white text-green-600 shadow-md' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {success && (
          <div className="bg-green-50 border-2 border-green-200 text-green-700 px-4 py-3 rounded-xl text-sm mb-4">
            ✅ {success}
          </div>
        )}

        {tab === 'local' ? (
          <form onSubmit={handleLocalLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Usuario</label>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="admin"
                disabled={loading}
                className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Contraseña</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                disabled={loading}
                className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>

            {error && (
              <div className="bg-red-50 border-2 border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm animate-pulse">
                ⚠️ {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 disabled:from-gray-400 disabled:to-gray-400 text-white font-bold py-3 rounded-xl transition-all duration-200 transform hover:scale-105 disabled:scale-100 shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-3 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Verificando… <span className="text-xs font-normal opacity-80">(puede tardar ~1 min)</span></span>
                </>
              ) : (
                <>🔓 Ingresar</>
              )}
            </button>
          </form>

        ) : tab === 'register' ? (
          <form onSubmit={async (e) => {
            e.preventDefault()
            setError('')
            setSuccess('')
            if (!regUser || !regPass) { setError('Completa usuario y contraseña'); return }
            if (regPass !== regPass2) { setError('Las contraseñas no coinciden'); return }
            if (regPass.length < 6) { setError('Contraseña mínimo 6 caracteres'); return }
            setLoading(true)
            try {
              await api.auth.register(regUser.trim(), regPass, regName.trim() || regUser.trim())
              setSuccess('¡Cuenta creada! Ya puedes ingresar.')
              setTab('local')
              setUsername(regUser.trim())
              setRegUser(''); setRegPass(''); setRegPass2(''); setRegName('')
            } catch (err) {
              setError(err.message || 'Error al registrarse')
            } finally { setLoading(false) }
          }} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Nombre completo</label>
              <input type="text" value={regName} onChange={e => setRegName(e.target.value)}
                placeholder="Tu nombre"
                className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-200 transition-all" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Usuario *</label>
              <input type="text" value={regUser} onChange={e => setRegUser(e.target.value)}
                placeholder="usuario123" required
                className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-200 transition-all" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Contraseña *</label>
              <input type="password" value={regPass} onChange={e => setRegPass(e.target.value)}
                placeholder="Mínimo 6 caracteres" required
                className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-200 transition-all" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Confirmar contraseña *</label>
              <input type="password" value={regPass2} onChange={e => setRegPass2(e.target.value)}
                placeholder="Repite la contraseña" required
                className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-200 transition-all" />
            </div>
            {error && <div className="bg-red-50 border-2 border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">⚠️ {error}</div>}
            <button type="submit" disabled={loading}
              className="w-full bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-600 hover:to-green-600 disabled:from-gray-400 disabled:to-gray-400 text-white font-bold py-3 rounded-xl transition-all shadow-lg flex items-center justify-center gap-2">
              {loading ? <><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> <span>Creando… <span className="text-xs font-normal opacity-80">(puede tardar ~1 min)</span></span></> : <>👤 Crear cuenta</>}
            </button>
            <p className="text-center text-xs text-gray-500">Tu cuenta será revisada por el administrador para asignarte a un invernadero</p>
          </form>

        ) : (
          <div className="space-y-4">
            <p className="text-sm text-gray-600 text-center mb-4">
              Accede con tu cuenta de Google para continuar
            </p>

            {error && (
              <div className="bg-red-50 border-2 border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm animate-pulse">
                ⚠️ {error}
              </div>
            )}

            <button
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 border-2 border-gray-300 hover:border-green-400 bg-white hover:bg-green-50 text-gray-700 font-semibold py-3 rounded-xl transition-all duration-200 transform hover:scale-105 disabled:scale-100 disabled:opacity-50 shadow-md hover:shadow-lg"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-3 border-gray-400 border-t-transparent rounded-full animate-spin" />
                  Conectando...
                </>
              ) : (
                <>
                  <svg width="20" height="20" viewBox="0 0 48 48">
                    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                  </svg>
                  Continuar con Google
                </>
              )}
            </button>

            <p className="text-xs text-gray-500 text-center pt-2">
              Se abrirá una ventana para autenticarte con Google
            </p>
          </div>
        )}

        {/* Footer */}
        <p className="text-center text-xs text-gray-400 mt-8 pt-6 border-t border-gray-200">
          © Universidad Cooperativa de Colombia · Nariño
        </p>
      </div>
    </div>
  )
}
