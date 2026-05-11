import { useState } from 'react'
import { Info, Key, Wifi, WifiOff, CheckCircle, XCircle, LogOut, ShieldCheck } from 'lucide-react'
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
    <div className="space-y-5 max-w-2xl mx-auto">
      <div>
        <h2 className="section-title">Configuración</h2>
        <p className="section-subtitle">Ajustes del sistema y claves de IA</p>
      </div>

      {/* System info */}
      <div className="card p-5">
        <div className="flex items-center gap-2 mb-4">
          <Info size={15} className="text-gray-400" />
          <h3 className="text-sm font-semibold text-gray-800">Información del Sistema</h3>
        </div>
        <dl className="space-y-3 text-sm">
          {[
            { label: 'Versión',  value: 'AgroPulse v10.0' },
            { label: 'Build',    value: '2026.05' },
            { label: 'Usuario',  value: authUser?.email ?? 'No especificado' },
          ].map(({ label, value }) => (
            <div key={label} className="flex justify-between items-center py-1 border-b border-gray-50 last:border-0">
              <dt className="text-gray-500">{label}</dt>
              <dd className="font-medium text-gray-800">{value}</dd>
            </div>
          ))}
          <div className="flex justify-between items-center py-1 border-b border-gray-50">
            <dt className="text-gray-500">Rol</dt>
            <dd>
              <span className={isAdmin ? 'badge-red' : 'badge-blue'}>
                <ShieldCheck size={10} />
                {isAdmin ? 'Administrador' : 'Operario'}
              </span>
            </dd>
          </div>
          <div className="flex justify-between items-center py-1 border-b border-gray-50">
            <dt className="text-gray-500">Supabase</dt>
            <dd>
              <span className={`flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${supabase ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                {supabase ? <><Wifi size={11} /> Conectado</> : <><WifiOff size={11} /> Sin configurar</>}
              </span>
            </dd>
          </div>
          <div className="flex justify-between items-center py-1">
            <dt className="text-gray-500">IAs Activas</dt>
            <dd>
              <span className={`flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${activeCount > 0 ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
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
            <Key size={15} className="text-gray-400" />
            <h3 className="text-sm font-semibold text-gray-800">Inteligencias Artificiales</h3>
          </div>
          <p className="text-xs text-gray-500 mb-4">Configura las IAs disponibles en la aplicación. Las claves se guardan en el navegador (localStorage).</p>

          <div className="space-y-4">
            {([
              { key: 'groq',   label: 'Groq (LLaMA-3.3-70B)',  ph: 'gsk_...',              val: groqKey,   set: setGroqKey,   active: groqActive   },
              { key: 'github', label: 'GitHub AI (phi-4-mini)', ph: 'ghp_...',              val: githubKey, set: setGithubKey, active: githubActive },
              { key: 'gemma',  label: 'Gemma 4 (Google AI)',    ph: 'AIza...',              val: gemmaKey,  set: setGemmaKey,  active: gemmaActive  },
            ] as const).map(row => (
              <div key={row.key} className="p-4 border border-gray-100 rounded-2xl">
                <div className="flex justify-between items-center mb-2.5">
                  <span className="font-medium text-sm text-gray-800">{row.label}</span>
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
        <h3 className="text-sm font-semibold text-gray-800 mb-4">Equipo de Desarrollo</h3>
        <dl className="space-y-3 text-sm">
          {[
            { label: 'Desarrollador', value: 'Diego Armando Pinta Cuasquen' },
            { label: 'Universidad',   value: 'Cooperativa de Colombia – Nariño' },
            { label: 'Proyecto',      value: 'Semestre 2025' },
          ].map(({ label, value }) => (
            <div key={label} className="flex justify-between items-center py-1 border-b border-gray-50 last:border-0">
              <dt className="text-gray-500">{label}</dt>
              <dd className="font-medium text-gray-800 text-right">{value}</dd>
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
