import { useState } from 'react'
import { Info, Key, Wifi, WifiOff, CheckCircle, XCircle, LogOut } from 'lucide-react'
import { useAuth, supabase } from '../context/AuthContext'

// ── LocalStorage Helpers ──────────────────────────────────────────
const safeGet = (key) => {
  try { return localStorage.getItem(key) } catch { return null }
}
const safeSet = (key, value) => {
  try { localStorage.setItem(key, value) } catch { /* noop */ }
}
const safeRemove = (key) => {
  try { localStorage.removeItem(key) } catch { /* noop */ }
}

const getGroqKey = () =>
  safeGet('agropulse_groq_key') || import.meta.env.VITE_GROQ_KEY || ''

const getGitHubToken = () =>
  safeGet('agropulse_github_token') || import.meta.env.VITE_GITHUB_TOKEN || ''

const getGemmaKey = () =>
  safeGet('agropulse_gemma_key') || import.meta.env.VITE_GEMMA_KEY || ''

export default function SettingsPage() {
  const { user: authUser, logout } = useAuth()
  const [groqKey, setGroqKey]       = useState(safeGet('agropulse_groq_key') || '')
  const [githubKey, setGithubKey]   = useState(safeGet('agropulse_github_token') || '')
  const [gemmaKey, setGemmaKey]     = useState(safeGet('agropulse_gemma_key') || '')
  const [saved, setSaved]           = useState(false)

  const saveKeys = () => {
    if (groqKey.trim()) safeSet('agropulse_groq_key', groqKey.trim())
    else safeRemove('agropulse_groq_key')

    if (githubKey.trim()) safeSet('agropulse_github_token', githubKey.trim())
    else safeRemove('agropulse_github_token')

    if (gemmaKey.trim()) safeSet('agropulse_gemma_key', gemmaKey.trim())
    else safeRemove('agropulse_gemma_key')

    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const groqActive   = getGroqKey()
  const githubActive = getGitHubToken()
  const gemmaActive  = getGemmaKey()
  const activeCount  = [groqActive, githubActive, gemmaActive].filter(Boolean).length

  const isAdmin = authUser?.role === 'ADMIN' || authUser?.role === 'admin'

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-gray-800">⚙️ Configuración</h2>

      {/* Info del sistema */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">
          <Info size={14} className="inline mr-1" /> Información del Sistema
        </h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">Versión</span>
            <span className="font-medium text-gray-800">AgroPulse v6.0</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Build</span>
            <span className="font-medium text-gray-800">2025.04</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">IAs Activas</span>
            <span className="font-medium text-green-600">{activeCount} de 3</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Usuario</span>
            <span className="font-medium text-gray-800">{authUser?.email || 'No especificado'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Rol</span>
            <span className={`font-medium px-2 py-1 rounded ${authUser?.role === 'admin' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
              {authUser?.role === 'admin' ? '🔴 Administrador' : '🔵 Usuario'}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-500">Supabase</span>
            <span className={`flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
              supabase ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
            }`}>
              {supabase ? <><Wifi size={12} /> Conectado</> : <><WifiOff size={12} /> No configurado</>}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-500">IA Activas</span>
            <span className={`flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
              activeCount > 0 ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
            }`}>
              {activeCount > 0 ? <><CheckCircle size={12} /> {activeCount} configuradas</> : <><XCircle size={12} /> Sin configurar</>}
            </span>
          </div>
        </div>
      </div>

      {/* Configurar 3 IAs - Solo ADMIN */}
      {!isAdmin ? (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-center">
          <p className="text-red-700 font-medium">🔒 Solo Administradores pueden configurar IAs</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">
            <Key size={14} className="inline mr-1" /> Inteligencias Artificiales
          </h3>
          <p className="text-xs text-gray-500 mb-3">
            Configura las IAs que quieres usar en la aplicación.
          </p>

          {/* Groq */}
          <div className="mb-4 p-3 border border-gray-100 rounded-xl">
            <div className="flex justify-between items-center mb-2">
              <span className="font-medium">⚡ Groq (LLaMA-3.3-70B)</span>
              <span className={`text-xs px-2 py-0.5 rounded-full ${groqActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                {groqActive ? 'Activa' : 'No configurada'}
              </span>
            </div>
            <input
              type="password"
              value={groqKey}
              onChange={e => setGroqKey(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-xs"
              placeholder="gsk_..."
            />
          </div>

          {/* GitHub */}
          <div className="mb-4 p-3 border border-gray-100 rounded-xl">
            <div className="flex justify-between items-center mb-2">
              <span className="font-medium">🐙 GitHub (phi-4-mini)</span>
              <span className={`text-xs px-2 py-0.5 rounded-full ${githubActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                {githubActive ? 'Activa' : 'No configurada'}
              </span>
            </div>
            <input
              type="password"
              value={githubKey}
              onChange={e => setGithubKey(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-xs"
              placeholder="ghp_... (GitHub PAT)"
            />
          </div>

          {/* Gemma */}
          <div className="mb-4 p-3 border border-gray-100 rounded-xl">
            <div className="flex justify-between items-center mb-2">
              <span className="font-medium">🧠 Gemma 4 (Google AI)</span>
              <span className={`text-xs px-2 py-0.5 rounded-full ${gemmaActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                {gemmaActive ? 'Activa' : 'No configurada'}
              </span>
            </div>
            <input
              type="password"
              value={gemmaKey}
              onChange={e => setGemmaKey(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-xs"
              placeholder="AIza... (Google AI Studio)"
            />
          </div>

          <button
            onClick={saveKeys}
            className="w-full bg-green-600 hover:bg-green-700 text-white py-2 rounded-xl text-sm font-medium transition-colors"
          >
            {saved ? '✅ Todas guardadas' : '💾 Guardar todas las claves'}
          </button>
        </div>
      )}

      {/* Equipo de desarrollo */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">
          👥 Equipo de Desarrollo
        </h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-500">Desarrollador</span>
            <span className="font-medium text-gray-800">Diego Armando Pinta Cuasquen</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Universidad</span>
            <span className="font-medium text-gray-800 text-right">Cooperativa de Colombia - Nariño</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">Proyecto</span>
            <span className="font-medium text-gray-800">Semestre 2025</span>
          </div>
        </div>
      </div>

      {/* Cerrar sesión */}
      <button
        onClick={logout}
        className="w-full bg-red-50 border border-red-200 text-red-600 hover:bg-red-100 py-3 rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-colors"
      >
        <LogOut size={16} /> Cerrar sesión
      </button>
    </div>
  )
}
