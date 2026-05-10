import { useState } from 'react'
import { Info, Key, Wifi, WifiOff, CheckCircle, XCircle, LogOut } from 'lucide-react'
import { useAuth, supabase } from '../context/AuthContext'
import { getGroqKey, getGitHubToken, getGemmaKey } from '../services/ai-service'

const safeGet    = (key: string) => { try { return localStorage.getItem(key) ?? '' } catch { return '' } }
const safeSet    = (key: string, val: string) => { try { localStorage.setItem(key, val) } catch { /* noop */ } }
const safeRemove = (key: string) => { try { localStorage.removeItem(key) } catch { /* noop */ } }

export default function SettingsPage() {
  const { user: authUser, logout } = useAuth()

  const [groqKey,   setGroqKey]   = useState(safeGet('agropulse_groq_key'))
  const [githubKey, setGithubKey] = useState(safeGet('agropulse_github_token'))
  const [gemmaKey,  setGemmaKey]  = useState(safeGet('agropulse_gemma_key'))
  const [saved,     setSaved]     = useState(false)

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

  const groqActive   = getGroqKey()
  const githubActive = getGitHubToken()
  const gemmaActive  = getGemmaKey()
  const activeCount  = [groqActive, githubActive, gemmaActive].filter(Boolean).length
  const isAdmin      = authUser?.role === 'ADMIN' || authUser?.role === 'admin'

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      <h2 className="text-xl font-bold text-gray-800">⚙️ Configuración</h2>

      {/* System info */}
      <div className="card p-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-1">
          <Info size={14} /> Información del Sistema
        </h3>
        <dl className="space-y-2 text-sm">
          {[
            { label: 'Versión',      value: 'AgroPulse v10.0' },
            { label: 'Build',        value: '2026.05' },
            { label: 'IAs Activas',  value: <span className="font-medium text-green-600">{activeCount} de 3</span> },
            { label: 'Usuario',      value: authUser?.email ?? 'No especificado' },
            { label: 'Rol',          value: (
              <span className={`font-medium px-2 py-0.5 rounded text-xs ${isAdmin ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                {isAdmin ? '🔴 Administrador' : '🔵 Usuario'}
              </span>
            )},
          ].map(({ label, value }) => (
            <div key={label} className="flex justify-between items-center">
              <dt className="text-gray-500">{label}</dt>
              <dd className="font-medium text-gray-800 text-right">{value}</dd>
            </div>
          ))}
          <div className="flex justify-between items-center">
            <dt className="text-gray-500">Supabase</dt>
            <dd>
              <span className={`flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${supabase ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                {supabase ? <><Wifi size={12} /> Conectado</> : <><WifiOff size={12} /> No configurado</>}
              </span>
            </dd>
          </div>
          <div className="flex justify-between items-center">
            <dt className="text-gray-500">IA Activas</dt>
            <dd>
              <span className={`flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${activeCount > 0 ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                {activeCount > 0 ? <><CheckCircle size={12} /> {activeCount} configuradas</> : <><XCircle size={12} /> Sin configurar</>}
              </span>
            </dd>
          </div>
        </dl>
      </div>

      {/* AI Keys — Admin only */}
      {!isAdmin ? (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-center">
          <p className="text-red-700 font-medium">🔒 Solo Administradores pueden configurar IAs</p>
        </div>
      ) : (
        <div className="card p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-1">
            <Key size={14} /> Inteligencias Artificiales
          </h3>
          <p className="text-xs text-gray-500 mb-4">Configura las IAs disponibles en la aplicación.</p>

          {([
            { key: 'groq',   label: '⚡ Groq (LLaMA-3.3-70B)',   ph: 'gsk_...',              val: groqKey,   set: setGroqKey,   active: groqActive   },
            { key: 'github', label: '🐙 GitHub (phi-4-mini)',      ph: 'ghp_... (GitHub PAT)', val: githubKey, set: setGithubKey, active: githubActive },
            { key: 'gemma',  label: '🧠 Gemma 4 (Google AI)',      ph: 'AIza...',              val: gemmaKey,  set: setGemmaKey,  active: gemmaActive  },
          ] as const).map(row => (
            <div key={row.key} className="mb-4 p-3 border border-gray-100 rounded-xl">
              <div className="flex justify-between items-center mb-2">
                <span className="font-medium text-sm">{row.label}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${row.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                  {row.active ? 'Activa' : 'No configurada'}
                </span>
              </div>
              <input type="password" value={row.val as string}
                onChange={e => (row.set as React.Dispatch<React.SetStateAction<string>>)(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs"
                placeholder={row.ph} />
            </div>
          ))}

          <button onClick={saveKeys}
            className="w-full bg-green-600 hover:bg-green-700 text-white py-2.5 rounded-xl text-sm font-medium transition-colors">
            {saved ? '✅ Todas guardadas' : '💾 Guardar todas las claves'}
          </button>
        </div>
      )}

      {/* Dev team */}
      <div className="card p-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">👥 Equipo de Desarrollo</h3>
        <dl className="space-y-2 text-sm">
          {[
            { label: 'Desarrollador', value: 'Diego Armando Pinta Cuasquen' },
            { label: 'Universidad',   value: 'Cooperativa de Colombia – Nariño' },
            { label: 'Proyecto',      value: 'Semestre 2025' },
          ].map(({ label, value }) => (
            <div key={label} className="flex justify-between">
              <dt className="text-gray-500">{label}</dt>
              <dd className="font-medium text-gray-800 text-right">{value}</dd>
            </div>
          ))}
        </dl>
      </div>

      {/* Logout */}
      <button onClick={logout}
        className="w-full bg-red-50 border border-red-200 text-red-600 hover:bg-red-100 py-3 rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-colors">
        <LogOut size={16} /> Cerrar sesión
      </button>
    </div>
  )
}
