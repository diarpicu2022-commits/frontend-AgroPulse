import { useState, useRef, useEffect } from 'react'
import { Bot, Send, Sparkles, Lightbulb, TrendingUp, Search, Zap, Building2, Sprout, Thermometer, Droplets, CloudSun, Leaf } from 'lucide-react'
import anime from 'animejs'
import { callAI, getGroqKey, getGitHubToken, getGemmaKey } from '../services/ai-service'
import type { AIResult } from '../services/ai-service'
import { readingRepository, greenhouseRepository, cropRepository } from '../repositories'
import { fetchWeather } from '../lib/weather'
import type { SensorReadingDto, GreenhouseDto, CropDto } from '../types'
import type { WeatherData } from '../lib/weather'

type AIPromptType = 'recommendation' | 'prediction' | 'analysis' | 'custom'

// Prompts por defecto — se usan si el admin no ha configurado nada en SystemSettings.
// Hacen referencia explícita a cultivos y ubicación para mejores respuestas.
const DEFAULT_PROMPTS: Record<string, string> = {
  recommendation:
    'Basándote en los cultivos activos, las lecturas de sensores y el clima exterior del invernadero, proporciona recomendaciones específicas y prácticas. ' +
    'Indica si los valores actuales están dentro de los rangos óptimos de cada cultivo y qué acciones concretas tomar.',
  prediction:
    'Considerando los cultivos activos, el clima exterior y las tendencias de los sensores, predice qué actuadores (bomba, ventilador, calefactor) ' +
    'será necesario activar en las próximas horas y explica el razonamiento.',
  analysis:
    'Analiza el estado del invernadero en función de los cultivos registrados y el clima exterior. ' +
    'Responde con: 1) Estado actual vs rangos óptimos por cultivo, 2) Problemas o riesgos detectados, 3) Acciones recomendadas ordenadas por urgencia.',
}

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
  TEMPERATURE: 'Temp. Interior', TEMPERATURE_INTERNAL: 'Temp. Interior',
  TEMPERATURE_EXTERNAL: 'Temp. Exterior', HUMIDITY: 'Humedad Interior',
  HUMIDITY_INTERNAL: 'Hum. Interior', HUMIDITY_EXTERNAL: 'Hum. Exterior',
  SOIL_MOISTURE: 'Humedad Suelo', LIGHT: 'Luminosidad', CO2: 'CO₂', PRESSURE: 'Presión',
  CURRENT: 'Corriente',
}
const SENSOR_UNITS: Record<string, string> = {
  TEMPERATURE: '°C', TEMPERATURE_INTERNAL: '°C', TEMPERATURE_EXTERNAL: '°C',
  HUMIDITY: '%', HUMIDITY_INTERNAL: '%', HUMIDITY_EXTERNAL: '%',
  SOIL_MOISTURE: '%', LIGHT: ' lx', CO2: ' ppm', PRESSURE: ' hPa', CURRENT: ' A',
}
const STAGE_LABELS: Record<string, string> = {
  SEEDING: 'Siembra', GROWING: 'Crecimiento', FLOWERING: 'Floración',
  HARVESTING: 'Cosecha', DORMANT: 'Reposo',
}

/**
 * Construye un contexto rico para la IA incluyendo:
 * - Info del invernadero y su ubicación
 * - Clima exterior real (Open-Meteo si hay coordenadas)
 * - Cultivos activos con rangos óptimos por tipo de variable
 * - Lecturas actuales de todos los sensores
 */
function buildFullContext(
  readings: SensorReadingDto[],
  crops: CropDto[],
  gh?: GreenhouseDto,
  weather?: WeatherData | null,
): string {
  const parts: string[] = []

  // ── Invernadero ──────────────────────────────────────────────
  if (gh) {
    parts.push(`=== Invernadero: ${gh.name} ===`)
    if (gh.location) parts.push(`Ubicación: ${gh.location}`)
    if (gh.description) parts.push(`Descripción: ${gh.description}`)
    if (gh.latitude != null && gh.longitude != null)
      parts.push(`Coordenadas: ${gh.latitude.toFixed(4)}, ${gh.longitude.toFixed(4)}`)
  }

  // ── Clima exterior ────────────────────────────────────────────
  if (weather) {
    parts.push('\n=== Clima exterior actual ===')
    parts.push(`${weather.icon} ${weather.description}`)
    parts.push(
      `Temp: ${weather.temperature}°C | Humedad: ${weather.humidity}% | ` +
      `Viento: ${weather.windSpeed} km/h | UV: ${weather.uvIndex}`
    )
    if (weather.precipitation > 0)
      parts.push(`Precipitación última hora: ${weather.precipitation} mm`)
  }

  // ── Cultivos activos ──────────────────────────────────────────
  const activeCrops = crops.filter(c => c.active === true || c.active === 1)
  if (activeCrops.length > 0) {
    parts.push('\n=== Cultivos activos en este invernadero ===')
    activeCrops.forEach(crop => {
      const stageName = crop.currentStage ? (STAGE_LABELS[crop.currentStage] ?? crop.currentStage) : null
      parts.push(
        `🌱 ${crop.name}` +
        (crop.variety   ? ` (Var: ${crop.variety})`     : '') +
        (stageName      ? ` — Etapa: ${stageName}`        : '')
      )
      const ranges: string[] = []
      if (crop.temp_min != null && crop.temp_max != null)
        ranges.push(`Temp: ${crop.temp_min}–${crop.temp_max}°C`)
      if (crop.humidity_min != null && crop.humidity_max != null)
        ranges.push(`Humedad: ${crop.humidity_min}–${crop.humidity_max}%`)
      if (crop.soil_moisture_min != null && crop.soil_moisture_max != null)
        ranges.push(`Suelo: ${crop.soil_moisture_min}–${crop.soil_moisture_max}%`)
      if (crop.light_min != null && crop.light_max != null)
        ranges.push(`Luz: ${crop.light_min}–${crop.light_max} lx`)
      if (crop.co2_min != null && crop.co2_max != null)
        ranges.push(`CO₂: ${crop.co2_min}–${crop.co2_max} ppm`)
      if (ranges.length > 0) parts.push(`   Rangos óptimos: ${ranges.join(' | ')}`)
    })
  } else if (gh) {
    parts.push('\n=== Cultivos ===')
    parts.push('Sin cultivos activos registrados en este invernadero.')
  }

  // ── Lecturas de sensores ─────────────────────────────────────
  const seen = new Map<string, SensorReadingDto>()
  for (const r of readings) {
    if (r.sensorType && !seen.has(r.sensorType)) seen.set(r.sensorType, r)
  }
  if (seen.size > 0) {
    parts.push('\n=== Lecturas actuales de sensores ===')
    Array.from(seen.values()).forEach(r => {
      const label = SENSOR_LABELS[r.sensorType!] ?? r.sensorType
      const unit  = SENSOR_UNITS[r.sensorType!]  ?? ''
      parts.push(`${label}: ${r.value}${unit}`)
    })
  }

  return parts.join('\n')
}

export default function AIPage() {
  const [prompt,      setPrompt]     = useState('')
  const [response,    setResponse]   = useState<AIResult | null>(null)
  const [loading,     setLoading]    = useState(false)
  const [ctxLoading,  setCtxLoading] = useState(false)

  const [greenhouses, setGreenhouses] = useState<GreenhouseDto[]>([])
  const [ghFilter,    setGhFilter]    = useState<number | ''>('')
  const [crops,       setCrops]       = useState<CropDto[]>([])
  const [weather,     setWeather]     = useState<WeatherData | null>(null)
  const [readings,    setReadings]    = useState<SensorReadingDto[]>([])

  const responseRef = useRef<HTMLDivElement>(null)

  // Carga invernaderos al montar
  useEffect(() => {
    greenhouseRepository.list().then(d => setGreenhouses(d.greenhouses ?? [])).catch(() => {})
  }, [])

  // Cuando cambia el invernadero seleccionado: carga lecturas + cultivos + clima
  useEffect(() => {
    const ghId = ghFilter !== '' ? (ghFilter as number) : null
    const gh   = ghId != null ? greenhouses.find(g => g.id === ghId) : undefined
    setCtxLoading(true)
    setCrops([])
    setWeather(null)

    const promises: Promise<void>[] = []

    // 1. Lecturas de sensores
    promises.push(
      readingRepository.list(null, 80, ghId)
        .then(d => setReadings(d.readings ?? []))
        .catch(() => setReadings([]))
    )

    // 2. Cultivos activos del invernadero
    promises.push(
      cropRepository.list(ghId)
        .then(d => setCrops((d.crops ?? []).filter(c => c.active === true || c.active === 1)))
        .catch(() => setCrops([]))
    )

    // 3. Clima exterior si hay coordenadas
    if (gh?.latitude != null && gh?.longitude != null) {
      promises.push(
        fetchWeather(gh.latitude!, gh.longitude!)
          .then(w => setWeather(w))
          .catch(() => setWeather(null))
      )
    }

    Promise.all(promises).finally(() => setCtxLoading(false))
  }, [ghFilter, greenhouses])

  // Anima la respuesta al aparecer
  useEffect(() => {
    if (!responseRef.current || !response) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced) return
    anime({ targets: responseRef.current, opacity: [0, 1], translateY: [10, 0], duration: 320, easing: 'easeOutCubic' })
  }, [response])

  const currentGh = greenhouses.find(g => g.id === ghFilter)

  // Contexto completo que se envía a la IA (se recalcula en el momento del click)
  const buildContext = () =>
    buildFullContext(readings, crops, currentGh, weather)

  const sendToAI = async (type: AIPromptType) => {
    const text = type === 'custom' ? prompt : getPrompt(type)
    if (!text.trim()) return
    setLoading(true)
    setResponse(null)
    try {
      const result = await callAI(text, buildContext())
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
  const activeCrops  = crops.filter(c => c.active === true || c.active === 1)

  return (
    <div className="space-y-5">
      <div>
        <h2 className="section-title">IA Agronómica</h2>
        <p className="section-subtitle">Recomendaciones basadas en cultivos, sensores y clima real</p>
      </div>

      {/* Badges de IA activa */}
      <div className="flex flex-wrap gap-2">
        {groqActive   && <span className="badge-green"><Zap size={10} />Groq activa</span>}
        {githubActive && <span className="badge-green"><Sparkles size={10} />GitHub AI activa</span>}
        {gemmaActive  && <span className="badge-green"><Bot size={10} />Gemma activa</span>}
        {!hasAI && <span className="badge-yellow">Sin IA configurada — ve a Configuración</span>}
      </div>

      {/* Selector de invernadero */}
      {greenhouses.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'rgba(255,255,255,0.35)' }}>
            Invernadero a consultar
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setGhFilter('')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-2xl text-xs font-semibold transition-all border
                ${ghFilter === '' ? 'bg-green-600 text-white border-green-600' : 'border-[rgba(74,222,128,0.12)]'}`}
              style={ghFilter !== '' ? { background: '#051a0a', color: 'rgba(255,255,255,0.5)' } : {}}
            >
              <Sprout size={11} /> Todos
            </button>
            {greenhouses.map(gh => (
              <button key={gh.id}
                onClick={() => setGhFilter(gh.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-2xl text-xs font-semibold transition-all border
                  ${ghFilter === gh.id ? 'bg-green-600 text-white border-green-600' : 'border-[rgba(74,222,128,0.12)]'}`}
                style={ghFilter !== gh.id ? { background: '#051a0a', color: 'rgba(255,255,255,0.5)' } : {}}
              >
                <Building2 size={11} /> {gh.name}
              </button>
            ))}
          </div>

          {/* Panel de contexto cargado */}
          {currentGh && (
            <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid rgba(74,222,128,0.15)', background: '#071a0c' }}>
              {/* Header */}
              <div className="px-4 py-2.5 flex items-center gap-2 border-b" style={{ borderColor: 'rgba(74,222,128,0.1)' }}>
                <Building2 size={13} style={{ color: '#4ade80' }} />
                <span className="text-sm font-semibold" style={{ color: '#e2ffe9' }}>{currentGh.name}</span>
                {currentGh.location && (
                  <span className="text-xs ml-1" style={{ color: 'rgba(255,255,255,0.35)' }}>· {currentGh.location}</span>
                )}
                {ctxLoading && (
                  <div className="ml-auto w-3 h-3 border-2 border-green-500/30 border-t-green-400 rounded-full animate-spin" />
                )}
              </div>

              {/* Chips de contexto */}
              <div className="px-4 py-3 flex flex-wrap gap-2">
                {/* Sensores */}
                <span className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium"
                      style={{ background: 'rgba(74,222,128,0.08)', color: readings.length > 0 ? '#4ade80' : 'rgba(255,255,255,0.25)', border: '1px solid rgba(74,222,128,0.15)' }}>
                  <Thermometer size={10} />
                  {readings.length > 0 ? `${new Set(readings.map(r => r.sensorType)).size} sensores` : 'Sin lecturas'}
                </span>

                {/* Cultivos */}
                <span className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium"
                      style={{ background: 'rgba(74,222,128,0.08)', color: activeCrops.length > 0 ? '#86efac' : 'rgba(255,255,255,0.25)', border: '1px solid rgba(74,222,128,0.15)' }}>
                  <Leaf size={10} />
                  {activeCrops.length > 0
                    ? activeCrops.map(c => c.name + (c.variety ? ` (${c.variety})` : '')).join(', ')
                    : 'Sin cultivos'}
                </span>

                {/* Clima */}
                {weather ? (
                  <span className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium"
                        style={{ background: 'rgba(125,211,252,0.08)', color: '#7dd3fc', border: '1px solid rgba(125,211,252,0.15)' }}>
                    <CloudSun size={10} />
                    {weather.icon} {weather.temperature}°C · {weather.description}
                  </span>
                ) : currentGh.latitude != null ? (
                  <span className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium"
                        style={{ background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.25)', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <CloudSun size={10} /> Cargando clima…
                  </span>
                ) : (
                  <span className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium"
                        style={{ background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.25)', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <CloudSun size={10} /> Sin coordenadas GPS
                  </span>
                )}

                {/* Humedad exterior si disponible */}
                {weather && (
                  <span className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium"
                        style={{ background: 'rgba(125,211,252,0.06)', color: '#7dd3fc', border: '1px solid rgba(125,211,252,0.1)' }}>
                    <Droplets size={10} />
                    Hum. ext: {weather.humidity}% · UV: {weather.uvIndex}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Acciones rápidas */}
      <div className="grid grid-cols-3 gap-3">
        {QUICK_ACTIONS.map(({ type, label, icon: Icon }) => (
          <button key={type} onClick={() => sendToAI(type)} disabled={loading || ctxLoading}
            className="card-hover p-4 flex flex-col items-center gap-2 text-sm font-medium disabled:opacity-40 disabled:pointer-events-none"
            style={{ color: 'rgba(255,255,255,0.7)' }}>
            <div className="p-2.5 rounded-2xl" style={{ background: 'rgba(74,222,128,0.1)' }}>
              <Icon size={16} className="text-green-600" />
            </div>
            <span>{label}</span>
          </button>
        ))}
      </div>

      {/* Pregunta personalizada */}
      <div className="card p-5">
        <label className="block text-xs font-semibold uppercase tracking-wide mb-3"
               style={{ color: 'rgba(255,255,255,0.35)' }}>
          Pregunta personalizada
        </label>
        <textarea
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          placeholder={
            currentGh
              ? `Pregunta sobre ${currentGh.name}${activeCrops.length ? ` y sus ${activeCrops.length} cultivo(s)` : ''}...`
              : 'Selecciona un invernadero o escribe tu pregunta...'
          }
          className="input-field resize-none"
          rows={3}
        />
        <button
          onClick={() => sendToAI('custom')}
          disabled={loading || !prompt.trim()}
          className="mt-3 w-full btn-primary py-2.5 text-sm">
          {loading
            ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Consultando…</>
            : <><Send size={14} /> Enviar a la IA</>
          }
        </button>
      </div>

      {/* Respuesta */}
      {response && (
        <div ref={responseRef} className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl" style={{ background: 'rgba(74,222,128,0.1)' }}>
                <Bot size={15} className="text-green-400" />
              </div>
              <span className="text-sm font-semibold" style={{ color: '#e2ffe9' }}>
                Respuesta{currentGh ? ` · ${currentGh.name}` : ''}
              </span>
            </div>
            {response.provider && (
              <span className="badge-purple"><Sparkles size={10} />{response.provider}</span>
            )}
          </div>
          <div className="rounded-2xl p-4" style={{ background: '#051a0a', border: '1px solid rgba(74,222,128,0.12)' }}>
            <p className="text-sm whitespace-pre-wrap leading-relaxed" style={{ color: 'rgba(255,255,255,0.7)' }}>
              {response.text}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
