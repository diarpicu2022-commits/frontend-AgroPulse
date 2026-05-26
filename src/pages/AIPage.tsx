import { useState, useRef, useEffect } from 'react'
import { Bot, Send, Sparkles, Lightbulb, TrendingUp, Search, Zap } from 'lucide-react'
import anime from 'animejs'
import { callAI, getGroqKey, getGitHubToken, getGemmaKey } from '../services/ai-service'
import type { AIResult } from '../services/ai-service'
import { readingRepository } from '../repositories'
import type { SensorReadingDto } from '../types'

type AIPromptType = 'recommendation' | 'prediction' | 'analysis' | 'custom'

const QUICK_ACTIONS: { type: AIPromptType; label: string; icon: typeof Lightbulb; prompt: string }[] = [
  { type: 'recommendation', label: 'Recomendación', icon: Lightbulb,   prompt: 'Eres un agrónomo experto. Basándote en las condiciones actuales del invernadero, proporciona recomendaciones específicas para optimizar el cultivo. Considera temperatura, humedad y luminosidad.' },
  { type: 'prediction',     label: 'Predicción',    icon: TrendingUp,  prompt: 'Eres experto en invernaderos. Predice qué actuadores será necesario activar en las próximas horas y por qué. Considera las tendencias actuales de los sensores.' },
  { type: 'analysis',       label: 'Análisis',      icon: Search,      prompt: 'Analiza el estado completo del invernadero. Proporciona: 1) Estado general, 2) Problemas detectados, 3) Acciones recomendadas. Sé conciso y práctico.' },
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

function buildSensorContext(readings: SensorReadingDto[]): string {
  const seen = new Map<string, SensorReadingDto>()
  for (const r of readings) {
    if (r.sensorType && !seen.has(r.sensorType)) seen.set(r.sensorType, r)
  }
  return Array.from(seen.values())
    .map(r => `${SENSOR_LABELS[r.sensorType!] ?? r.sensorType}: ${r.value}${SENSOR_UNITS[r.sensorType!] ?? ''}`)
    .join('\n')
}

export default function AIPage() {
  const [prompt,        setPrompt]       = useState('')
  const [response,      setResponse]     = useState<AIResult | null>(null)
  const [loading,       setLoading]      = useState(false)
  const [sensorContext, setSensorContext] = useState('')
  const responseRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    readingRepository.list(null, 50).then(d => {
      const ctx = buildSensorContext(d.readings ?? [])
      setSensorContext(ctx)
    }).catch(() => {})
  }, [])

  useEffect(() => {
    if (!responseRef.current || !response) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced) return
    anime({ targets: responseRef.current, opacity: [0, 1], translateY: [10, 0], duration: 320, easing: 'easeOutCubic' })
  }, [response])

  const sendToAI = async (type: AIPromptType) => {
    const action = QUICK_ACTIONS.find(a => a.type === type)
    const text   = type === 'custom' ? prompt : (action?.prompt ?? prompt)
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

  return (
    <div className="space-y-5">
      {/* Header */}
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
          placeholder="Escribe tu pregunta sobre el invernadero..."
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
              <span className="text-sm font-semibold" style={{ color: '#e2ffe9' }}>Respuesta</span>
            </div>
            {response.provider && <span className="badge-green"><Sparkles size={10} />{response.provider}</span>}
          </div>
          <div className="rounded-2xl p-4" style={{ background: '#051a0a', border: '1px solid rgba(74,222,128,0.12)' }}>
            <p className="text-sm whitespace-pre-wrap leading-relaxed" style={{ color: 'rgba(255,255,255,0.7)' }}>{response.text}</p>
          </div>
        </div>
      )}
    </div>
  )
}
