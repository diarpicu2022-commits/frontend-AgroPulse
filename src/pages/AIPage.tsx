import { useState, useRef, useEffect } from 'react'
import { Bot, Send, Sparkles, Lightbulb, TrendingUp, Search, Zap, Building2, Sprout } from 'lucide-react'
import anime from 'animejs'
import { callAI, getGroqKey, getGitHubToken, getGemmaKey } from '../services/ai-service'
import type { AIResult } from '../services/ai-service'
import { readingRepository, greenhouseRepository } from '../repositories'
import type { SensorReadingDto, GreenhouseDto } from '../types'

type AIPromptType = 'recommendation' | 'prediction' | 'analysis' | 'custom'

// Prompts por defecto — se usan si el admin no ha configurado nada en SystemSettings
const DEFAULT_PROMPTS: Record<string, string> = {
  recommendation: 'Basándote en las condiciones actuales del invernadero, proporciona recomendaciones específicas para optimizar el cultivo. Considera temperatura, humedad y luminosidad.',
  prediction:     'Predice qué actuadores será necesario activar en las próximas horas y por qué. Considera las tendencias actuales de los sensores.',
  analysis:       'Analiza el estado completo del invernadero. Proporciona: 1) Estado general, 2) Problemas detectados, 3) Acciones recomendadas. Sé conciso y práctico.',
}

// Lee el prompt desde localStorage (sincronizado con BD por SystemSettingsPage).
// Si el admin personalizó el prompt, se usa el personalizado; si no, el default.
const getPrompt = (key: string): string => {
  try { return localStorage.getItem(`agropulse_ai_prompt_${key}`) || DEFAULT_PROMPTS[key] || '' }
  catch { return DEFAULT_PROMPTS[key] || '' }
}

const QUICK_ACTIONS: { type: AIPromptType; label: string; icon: typeof Lightbulb }[] = [
  { type: 'recommendation', label: 'Recomendación', icon: Lightbulb  },
  { type: 'prediction',     label: 'Predicción',    icon: TrendingUp },
  { type: 'analysis',       label: 'Análisis',      icon: Search     },
]

const SENSOR_LABELS: Record<string, string> = {
  TEMPERATURE: 'Temperatura', TEMPERATURE_INTERNAL: 'Temp. Interior',
  TEMPERATURE_EXTERNAL: 'Temp. Exterior', HUMIDITY: 'Humedad',
  HUMIDITY_INTERNAL: 'Hum. Interior', HUMIDITY_EXTERNAL: 'Hum. Exterior',
  SOIL_MOISTURE: 'Humedad Suelo', LIGHT: 'Luminosidad', CO2: 'CO₂', PRESSURE: 'Presión',
}
const SENSOR_UNITS: Record<string, string> = {
  TEMPERATURE: '°C', TEMPERATURE_INTERNAL: '°C', TEMPERATURE_EXTERNAL: '°C',
  HUMIDITY: '%', HUMIDITY_INTERNAL: '%', HUMIDITY_EXTERNAL: '%',
  SOIL_MOISTURE: '%', LIGHT: ' lx', CO2: ' ppm', PRESSURE: ' hPa',
}

function buildSensorContext(readings: SensorReadingDto[], ghName?: string): string {
  const seen = new Map<string, SensorReadingDto>()
  for (const r of readings) {
    if (r.sensorType && !seen.has(r.sensorType)) seen.set(r.sensorType, r)
  }
  const lines = Array.from(seen.values())
    .map(r => `${SENSOR_LABELS[r.sensorType!] ?? r.sensorType}: ${r.value}${SENSOR_UNITS[r.sensorType!] ?? ''}`)
  if (ghName) lines.unshift(`Invernadero: ${ghName}`)
  return lines.join('\n')
}

export default function AIPage() {
  const [prompt,        setPrompt]       = useState('')
  const [response,      setResponse]     = useState<AIResult | null>(null)
  const [loading,       setLoading]      = useState(false)
  const [sensorContext, setSensorContext] = useState('')
  const [greenhouses,   setGreenhouses]  = useState<GreenhouseDto[]>([])
  const [ghFilter,      setGhFilter]     = useState<number | ''>('')
  const responseRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    greenhouseRepository.list().then(d => setGreenhouses(d.greenhouses ?? [])).catch(() => {})
  }, [])

  useEffect(() => {
    const ghId = ghFilter !== '' ? (ghFilter as number) : undefined
    readingRepository.list(null, 50, ghId ?? null).then(d => {
      const gh = ghFilter !== '' ? greenhouses.find(g => g.id === ghFilter) : undefined
      setSensorContext(buildSensorContext(d.readings ?? [], gh?.name))
    }).catch(() => {})
  }, [ghFilter, greenhouses])

  useEffect(() => {
    if (!responseRef.current || !response) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced) return
    anime({ targets: responseRef.current, opacity: [0, 1], translateY: [10, 0], duration: 320, easing: 'easeOutCubic' })
  }, [response])

  const sendToAI = async (type: AIPromptType) => {
    // Lee el prompt desde localStorage/BD en el momento del click (captura cambios en caliente)
    const text = type === 'custom' ? prompt : getPrompt(type)
    if (!text.trim()) return
    setLoading(true); setResponse(null)
    try {
      const result = await callAI(text, sensorContext)
      setResponse(result)
    } catch (err) {
      setResponse({ text: 'Error: ' + (err as Error).message, provider: '' })
    }
    setLoading(false)
  }

  const groqActive   = getGroqKey()
  const githubActive = getGitHubToken()
  const gemmaActive  = getGemmaKey()
  const hasAI        = groqActive || githubActive || gemmaActive
  const currentGh    = greenhouses.find(g => g.id === ghFilter)

  return (
    <div className="space-y-5">
      <div>
        <h2 className="section-title">IA Agronómica</h2>
        <p className="section-subtitle">Consulta inteligente para optimizar tu invernadero</p>
      </div>

      {/* AI status chips */}
      <div className="flex flex-wrap gap-2">
        {groqActive   && <span className="badge-green"><Zap size={10} />Groq activa</span>}
        {githubActive && <span className="badge-green"><Sparkles size={10} />GitHub AI activa</span>}
        {gemmaActive  && <span className="badge-green"><Bot size={10} />Gemma activa</span>}
        {!hasAI && <span className="badge-yellow">Sin IA configurada — ve a Configuración</span>}
      </div>

      {/* Greenhouse selector */}
      {greenhouses.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'rgba(255,255,255,0.35)' }}>Invernadero a consultar</p>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setGhFilter('')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-2xl text-xs font-semibold transition-all border ${ghFilter === '' ? 'bg-green-600 text-white border-green-600' : 'border-[rgba(74,222,128,0.12)]'}`}
              style={ghFilter !== '' ? { background: '#051a0a', color: 'rgba(255,255,255,0.5)' } : {}}
            >
              <Sprout size={11} /> Todos
            </button>
            {greenhouses.map(gh => (
              <button key={gh.id}
                onClick={() => setGhFilter(gh.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-2xl text-xs font-semibold transition-all border ${ghFilter === gh.id ? 'bg-green-600 text-white border-green-600' : 'border-[rgba(74,222,128,0.12)]'}`}
                style={ghFilter !== gh.id ? { background: '#051a0a', color: 'rgba(255,255,255,0.5)' } : {}}
              >
                <Building2 size={11} /> {gh.name}
              </button>
            ))}
          </div>
          {currentGh && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs" style={{ background: 'rgba(74,222,128,0.06)', border: '1px solid rgba(74,222,128,0.15)', color: '#4ade80' }}>
              <Building2 size={12} />
              <span>Consultando: <strong>{currentGh.name}</strong>{currentGh.location ? ` · ${currentGh.location}` : ''}</span>
            </div>
          )}
        </div>
      )}

      {/* Quick actions */}
      <div className="grid grid-cols-3 gap-3">
        {QUICK_ACTIONS.map(({ type, label, icon: Icon }) => (
          <button key={type} onClick={() => sendToAI(type)} disabled={loading}
            className="card-hover p-4 flex flex-col items-center gap-2 text-sm font-medium disabled:opacity-50 disabled:pointer-events-none"
            style={{ color: 'rgba(255,255,255,0.7)' }}>
            <div className="p-2.5 rounded-2xl" style={{ background: 'rgba(74,222,128,0.1)' }}>
              <Icon size={16} className="text-green-600" />
            </div>
            <span>{label}</span>
          </button>
        ))}
      </div>

      {/* Custom prompt */}
      <div className="card p-5">
        <label className="block text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: 'rgba(255,255,255,0.35)' }}>Pregunta personalizada</label>
        <textarea
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          placeholder={currentGh ? `Pregunta sobre ${currentGh.name}...` : 'Escribe tu pregunta sobre el invernadero...'}
          className="input-field resize-none"
          rows={3}
        />
        <button
          onClick={() => sendToAI('custom')}
          disabled={loading || !prompt.trim()}
          className="mt-3 w-full btn-primary py-2.5 text-sm">
          {loading
            ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Consultando...</>
            : <><Send size={14} /> Enviar a la IA</>
          }
        </button>
      </div>

      {/* Response */}
      {response && (
        <div ref={responseRef} className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl" style={{ background: 'rgba(74,222,128,0.1)' }}>
                <Bot size={15} className="text-green-400" />
              </div>
              <span className="text-sm font-semibold" style={{ color: '#e2ffe9' }}>Respuesta{currentGh ? ` · ${currentGh.name}` : ''}</span>
            </div>
            {response.provider && <span className="badge-purple"><Sparkles size={10} />{response.provider}</span>}
          </div>
          <div className="rounded-2xl p-4" style={{ background: '#051a0a', border: '1px solid rgba(74,222,128,0.12)' }}>
            <p className="text-sm whitespace-pre-wrap leading-relaxed" style={{ color: 'rgba(255,255,255,0.7)' }}>{response.text}</p>
          </div>
        </div>
      )}
    </div>
  )
}
