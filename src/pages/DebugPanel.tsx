import { useState, useEffect } from 'react'
import { getGroqKey } from '../services/ai-service'

export default function DebugPanel() {
  const [open, setOpen]   = useState(false)
  const [apiOk, setApiOk] = useState<boolean | null>(null)
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8080'

  useEffect(() => {
    fetch(apiUrl + '/api/auth/me')
      .then(r => setApiOk(r.status < 500))
      .catch(() => setApiOk(false))
  }, [])

  return (
    <div className="bg-gray-900 text-white rounded-2xl overflow-hidden">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between px-5 py-3 hover:bg-gray-800 transition-colors">
        <span className="text-sm font-mono font-bold text-green-400">🔧 Diagnóstico del Sistema</span>
        <span className="text-xs text-gray-400">{open ? '▲ Ocultar' : '▼ Ver'}</span>
      </button>
      {open && (
        <div className="px-5 pb-5 space-y-2 font-mono text-xs">
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-gray-800 rounded-lg p-3">
              <p className="text-yellow-400 mb-1">🌐 Backend API</p>
              <p>{apiUrl}</p>
              <p className={apiOk === null ? 'text-gray-400' : apiOk ? 'text-green-400' : 'text-red-400'}>
                {apiOk === null ? 'Verificando...' : apiOk ? '✅ Respondiendo' : '❌ No disponible'}
              </p>
            </div>
            <div className="bg-gray-800 rounded-lg p-3">
              <p className="text-yellow-400 mb-1">🔷 Supabase</p>
              <p className={import.meta.env.VITE_SUPABASE_URL ? 'text-green-400' : 'text-red-400'}>
                {import.meta.env.VITE_SUPABASE_URL ? '✅ Configurado' : '❌ Sin configurar'}
              </p>
            </div>
            <div className="bg-gray-800 rounded-lg p-3">
              <p className="text-yellow-400 mb-1">🤖 IA Groq</p>
              <p className={getGroqKey() ? 'text-green-400' : 'text-gray-400'}>{getGroqKey() ? '✅ Key presente' : '— No configurado'}</p>
            </div>
            <div className="bg-gray-800 rounded-lg p-3">
              <p className="text-yellow-400 mb-1">🔧 Entorno</p>
              <p>{import.meta.env.MODE}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
