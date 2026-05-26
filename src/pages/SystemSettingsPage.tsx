import { useState, useEffect } from 'react'
import { Bot, Bell, Save, RefreshCw, CheckCircle, Database, ToggleLeft, ToggleRight } from 'lucide-react'
import { systemSettingRepository } from '../repositories'
import { useGsapReveal } from '../hooks/useGsapReveal'
import type { SystemSettingDto } from '../types'

const AI_PROVIDERS = [
  { value: 'groq',   label: 'Groq',          desc: 'LLaMA / Mistral — gratuito, rápido' },
  { value: 'github', label: 'GitHub Models',  desc: 'GPT-4o mini via Azure — requiere token GitHub' },
]

const GROQ_MODELS = [
  'llama3-8b-8192',
  'llama3-70b-8192',
  'mixtral-8x7b-32768',
  'gemma-7b-it',
]

const GITHUB_MODELS = [
  'gpt-4o-mini',
  'gpt-4o',
  'Phi-3.5-mini-instruct',
  'Meta-Llama-3.1-8B-Instruct',
]

export default function SystemSettingsPage() {
  const revealRef = useGsapReveal<HTMLDivElement>({ stagger: 0.06, duration: 0.45 })
  const [settings, setSettings] = useState<SystemSettingDto[]>([])
  const [loading,  setLoading]  = useState(true)
  const [saving,   setSaving]   = useState<string | null>(null)
  const [saved,    setSaved]    = useState<string | null>(null)
  const [error,    setError]    = useState<string | null>(null)

  useEffect(() => { load() }, [])

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await systemSettingRepository.list()
      setSettings(data)
    } catch (e) { setError((e as Error).message) }
    setLoading(false)
  }

  const getValue = (key: string, fallback = '') =>
    settings.find(s => s.key === key)?.value ?? fallback

  const save = async (key: string, value: string) => {
    setSaving(key)
    setError(null)
    try {
      const updated = await systemSettingRepository.update(key, value)
      setSettings(prev => prev.map(s => s.key === key ? updated : s))
      // Cache AI settings locally so ai-service.ts can read them immediately
      if (key === 'ai.provider' || key === 'ai.model') {
        try { localStorage.setItem(`agropulse_${key.replace('.', '_')}`, value) } catch {}
      }
      setSaved(key)
      setTimeout(() => setSaved(null), 2500)
    } catch (e) { setError((e as Error).message) }
    setSaving(null)
  }

  const toggle = (key: string) => {
    const current = getValue(key, 'false')
    save(key, current === 'true' ? 'false' : 'true')
  }

  const provider   = getValue('ai.provider', 'groq')
  const model      = getValue('ai.model', 'llama3-8b-8192')
  const aiEnabled  = getValue('ai.enabled', 'true') === 'true'
  const emailAlert = getValue('alerts.email', 'true') === 'true'
  const waAlert    = getValue('alerts.whatsapp', 'false') === 'true'
  const modelList  = provider === 'github' ? GITHUB_MODELS : GROQ_MODELS

  if (loading) return (
    <div className="space-y-4">
      {Array.from({ length: 2 }).map((_, i) => <div key={i} className="skeleton h-48 rounded-3xl" />)}
    </div>
  )

  return (
    <div ref={revealRef} className="space-y-5 max-w-2xl">
      <div>
        <h2 className="section-title">Configuración del sistema</h2>
        <p className="section-subtitle">Parámetros globales almacenados en base de datos — afectan a todos los usuarios</p>
      </div>

      {error && <div className="alert-danger text-sm">{error}</div>}

      {/* ── IA ────────────────────────────────────────────────────── */}
      <div className="card p-6 space-y-5">
        <div className="flex items-center gap-3 mb-1">
          <div className="p-2 rounded-xl" style={{ background: 'rgba(139,92,246,0.15)' }}>
            <Bot size={18} style={{ color: '#a78bfa' }} />
          </div>
          <div>
            <h3 className="text-sm font-semibold" style={{ color: '#e2ffe9' }}>Inteligencia Artificial</h3>
            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>Proveedor y modelo para el asistente agronómico</p>
          </div>
          <button
            onClick={() => toggle('ai.enabled')}
            disabled={saving === 'ai.enabled'}
            className="ml-auto flex items-center gap-1.5 text-xs font-semibold transition-colors"
            style={{ color: aiEnabled ? '#4ade80' : 'rgba(255,255,255,0.35)' }}
          >
            {aiEnabled
              ? <ToggleRight size={22} style={{ color: '#4ade80' }} />
              : <ToggleLeft  size={22} style={{ color: 'rgba(255,255,255,0.25)' }} />}
            {aiEnabled ? 'Activo' : 'Inactivo'}
          </button>
        </div>

        {/* Provider */}
        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'rgba(255,255,255,0.5)' }}>
            Proveedor
          </label>
          <div className="grid grid-cols-2 gap-2">
            {AI_PROVIDERS.map(p => (
              <button
                key={p.value}
                onClick={() => save('ai.provider', p.value)}
                disabled={saving === 'ai.provider'}
                className={`flex flex-col items-start gap-0.5 px-4 py-3 rounded-xl border text-left transition-all ${
                  provider === p.value
                    ? 'border-violet-500 bg-violet-500/10'
                    : 'border-[rgba(74,222,128,0.12)] hover:border-violet-500/40'
                }`}
                style={provider !== p.value ? { background: '#051a0a' } : {}}
              >
                <span className="text-sm font-semibold" style={{ color: provider === p.value ? '#a78bfa' : 'rgba(255,255,255,0.7)' }}>
                  {p.label}
                </span>
                <span className="text-[11px]" style={{ color: 'rgba(255,255,255,0.3)' }}>{p.desc}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Model */}
        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'rgba(255,255,255,0.5)' }}>
            Modelo
          </label>
          <div className="flex gap-2">
            <select
              value={modelList.includes(model) ? model : 'custom'}
              onChange={e => { if (e.target.value !== 'custom') save('ai.model', e.target.value) }}
              disabled={saving === 'ai.model'}
              className="flex-1 rounded-xl px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-violet-500/40"
              style={{ background: '#051a0a', color: '#e2ffe9', border: '1px solid rgba(74,222,128,0.15)' }}
            >
              {modelList.map(m => <option key={m} value={m}>{m}</option>)}
              {!modelList.includes(model) && <option value="custom">{model} (personalizado)</option>}
            </select>
            {saved === 'ai.model' && <CheckCircle size={18} className="self-center text-green-400 shrink-0" />}
          </div>

          {/* Custom model input */}
          <div className="flex gap-2">
            <input
              key={provider}
              type="text"
              defaultValue={model}
              placeholder="O escribe un modelo personalizado…"
              onKeyDown={e => { if (e.key === 'Enter') save('ai.model', (e.target as HTMLInputElement).value.trim()) }}
              className="flex-1 rounded-xl px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-violet-500/40"
              style={{ background: '#051a0a', color: '#e2ffe9', border: '1px solid rgba(74,222,128,0.12)' }}
            />
            <button
              onClick={e => {
                const input = (e.currentTarget.previousElementSibling as HTMLInputElement)
                save('ai.model', input.value.trim())
              }}
              disabled={saving === 'ai.model'}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all"
              style={{ background: 'rgba(139,92,246,0.15)', color: '#a78bfa', border: '1px solid rgba(139,92,246,0.25)' }}
            >
              {saving === 'ai.model'
                ? <RefreshCw size={14} className="animate-spin" />
                : saved === 'ai.model'
                ? <CheckCircle size={14} />
                : <Save size={14} />}
              Guardar
            </button>
          </div>
          <p className="text-[11px]" style={{ color: 'rgba(255,255,255,0.25)' }}>
            Presiona Enter o el botón Guardar para aplicar el modelo
          </p>
        </div>
      </div>

      {/* ── Alertas ───────────────────────────────────────────────── */}
      <div className="card p-6 space-y-4">
        <div className="flex items-center gap-3 mb-1">
          <div className="p-2 rounded-xl" style={{ background: 'rgba(234,179,8,0.15)' }}>
            <Bell size={18} style={{ color: '#facc15' }} />
          </div>
          <div>
            <h3 className="text-sm font-semibold" style={{ color: '#e2ffe9' }}>Notificaciones</h3>
            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>Canales de envío para alertas automáticas</p>
          </div>
        </div>

        {[
          { key: 'alerts.email',     label: 'Correo electrónico', value: emailAlert, desc: 'Envía alertas de umbral y anomalías por email' },
          { key: 'alerts.whatsapp',  label: 'WhatsApp',           value: waAlert,    desc: 'Requiere CallMeBot configurado en cada invernadero' },
        ].map(row => (
          <div key={row.key} className="flex items-center justify-between gap-4 py-3 border-b last:border-0"
               style={{ borderColor: 'rgba(74,222,128,0.08)' }}>
            <div>
              <p className="text-sm font-semibold" style={{ color: '#e2ffe9' }}>{row.label}</p>
              <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>{row.desc}</p>
            </div>
            <button
              onClick={() => toggle(row.key)}
              disabled={saving === row.key}
              className="shrink-0 transition-colors"
            >
              {row.value
                ? <ToggleRight size={28} style={{ color: '#4ade80' }} />
                : <ToggleLeft  size={28} style={{ color: 'rgba(255,255,255,0.2)' }} />}
            </button>
          </div>
        ))}
      </div>

      {/* ── Tabla raw ─────────────────────────────────────────────── */}
      <div className="card p-5">
        <div className="flex items-center gap-2 mb-4">
          <Database size={15} style={{ color: 'rgba(255,255,255,0.4)' }} />
          <h3 className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'rgba(255,255,255,0.4)' }}>
            Todas las claves
          </h3>
          <button onClick={load} className="ml-auto" title="Recargar">
            <RefreshCw size={13} style={{ color: 'rgba(255,255,255,0.3)' }} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
        <div className="space-y-1">
          {settings.map(s => (
            <div key={s.key} className="flex items-center gap-3 px-3 py-2 rounded-xl"
                 style={{ background: '#051a0a' }}>
              <span className="font-mono text-xs w-44 shrink-0" style={{ color: '#a78bfa' }}>{s.key}</span>
              <span className="font-mono text-xs flex-1 truncate" style={{ color: '#4ade80' }}>{s.value}</span>
              {saved === s.key && <CheckCircle size={13} className="text-green-400 shrink-0" />}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
