import { useState, useRef, useEffect } from 'react'
import { Cpu, TrendingUp, Sparkles, Building2, Sprout, Leaf, CloudSun } from 'lucide-react'
import anime from 'animejs'
import { callAI } from '../services/ai-service'
import type { AIResult } from '../services/ai-service'
import { readingRepository, greenhouseRepository, cropRepository } from '../repositories'
import { fetchWeather } from '../lib/weather'
import type { SensorReadingDto, GreenhouseDto, CropDto } from '../types'
import type { WeatherData } from '../lib/weather'

const DEFAULT_ML_PROMPT =
  'Basándote en el historial reciente de sensores, los cultivos activos y el clima exterior del invernadero, ' +
  'predice los valores de cada sensor para las próximas 6 horas (en intervalos de 1 hora).\n\n' +
  'Presenta los resultados con:\n- Hora estimada\n- Valores predichos por sensor y cultivo afectado\n' +
  '- Tendencia (subiendo, bajando, estable)\n- Acciones recomendadas si algún valor saldrá del rango óptimo del cultivo\n\nSé conciso y práctico.'

const getMlPrompt = (): string => {
  try { return localStorage.getItem('agropulse_ai_prompt_ml') || DEFAULT_ML_PROMPT }
  catch { return DEFAULT_ML_PROMPT }
}

const SENSOR_LABELS: Record<string, string> = {
  TEMPERATURE: 'Temp. Interior', TEMPERATURE_INTERNAL: 'Temp. Interior',
  TEMPERATURE_EXTERNAL: 'Temp. Exterior', HUMIDITY: 'Humedad Interior',
  HUMIDITY_INTERNAL: 'Hum. Interior', HUMIDITY_EXTERNAL: 'Hum. Exterior',
  SOIL_MOISTURE: 'Humedad Suelo', LIGHT: 'Luminosidad', CO2: 'CO₂', PRESSURE: 'Presión', CURRENT: 'Corriente',
}
const SENSOR_UNITS: Record<string, string> = {
  TEMPERATURE: '°C', TEMPERATURE_INTERNAL: '°C', TEMPERATURE_EXTERNAL: '°C',
  HUMIDITY: '%', HUMIDITY_INTERNAL: '%', HUMIDITY_EXTERNAL: '%',
  SOIL_MOISTURE: '%', LIGHT: ' lx', CO2: ' ppm', PRESSURE: ' hPa', CURRENT: ' A',
}
const STAGE_LABELS: Record<string, string> = {
  SEEDING: 'Siembra', GROWING: 'Crecimiento', FLOWERING: 'Floración', HARVESTING: 'Cosecha', DORMANT: 'Reposo',
}

function buildFullContext(
  readings: SensorReadingDto[],
  crops: CropDto[],
  gh?: GreenhouseDto,
  weather?: WeatherData | null,
): string {
  const parts: string[] = []
  if (gh) {
    parts.push(`=== Invernadero: ${gh.name} ===`)
    if (gh.location) parts.push(`Ubicación: ${gh.location}`)
    if (gh.latitude != null && gh.longitude != null)
      parts.push(`Coordenadas: ${gh.latitude.toFixed(4)}, ${gh.longitude.toFixed(4)}`)
  }
  if (weather) {
    parts.push('\n=== Clima exterior actual ===')
    parts.push(`${weather.icon} ${weather.description} | Temp: ${weather.temperature}°C | Humedad: ${weather.humidity}% | Viento: ${weather.windSpeed} km/h | UV: ${weather.uvIndex}`)
    if (weather.precipitation > 0) parts.push(`Precipitación: ${weather.precipitation} mm`)
  }
  const activeCrops = crops.filter(c => c.active === true || c.active === 1)
  if (activeCrops.length > 0) {
    parts.push('\n=== Cultivos activos ===')
    activeCrops.forEach(crop => {
      const stage = crop.currentStage ? (STAGE_LABELS[crop.currentStage] ?? crop.currentStage) : null
      parts.push(`🌱 ${crop.name}${crop.variety ? ` (Var: ${crop.variety})` : ''}${stage ? ` — Etapa: ${stage}` : ''}`)
      const ranges: string[] = []
      if (crop.temp_min != null && crop.temp_max != null) ranges.push(`Temp: ${crop.temp_min}–${crop.temp_max}°C`)
      if (crop.humidity_min != null && crop.humidity_max != null) ranges.push(`Hum: ${crop.humidity_min}–${crop.humidity_max}%`)
      if (crop.soil_moisture_min != null && crop.soil_moisture_max != null) ranges.push(`Suelo: ${crop.soil_moisture_min}–${crop.soil_moisture_max}%`)
      if (ranges.length) parts.push(`   Rangos: ${ranges.join(' | ')}`)
    })
  }
  const seen = new Map<string, SensorReadingDto>()
  for (const r of readings) {
    if (r.sensorType && !seen.has(r.sensorType)) seen.set(r.sensorType, r)
  }
  if (seen.size > 0) {
    parts.push('\n=== Lecturas actuales ===')
    Array.from(seen.values()).forEach(r => {
      parts.push(`${SENSOR_LABELS[r.sensorType!] ?? r.sensorType}: ${r.value}${SENSOR_UNITS[r.sensorType!] ?? ''}`)
    })
  }
  return parts.join('\n')
}

export default function MLPage() {
  const [prediction,  setPrediction]  = useState<AIResult | null>(null)
  const [loading,     setLoading]     = useState(false)
  const [ctxLoading,  setCtxLoading]  = useState(false)
  const [error,       setError]       = useState<string | null>(null)
  const [greenhouses, setGreenhouses] = useState<GreenhouseDto[]>([])
  const [ghFilter,    setGhFilter]    = useState<number | ''>('')
  const [crops,       setCrops]       = useState<CropDto[]>([])
  const [weather,     setWeather]     = useState<WeatherData | null>(null)
  const [readings,    setReadings]    = useState<SensorReadingDto[]>([])
  const resultRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    greenhouseRepository.list().then(d => setGreenhouses(d.greenhouses ?? [])).catch(() => {})
  }, [])

  useEffect(() => {
    const ghId = ghFilter !== '' ? (ghFilter as number) : null
    const gh   = ghId != null ? greenhouses.find(g => g.id === ghId) : undefined
    setCtxLoading(true)
    setCrops([]); setWeather(null)
    const ps: Promise<void>[] = [
      readingRepository.list(null, 150, ghId).then(d => setReadings(d.readings ?? [])).catch(() => setReadings([])),
      cropRepository.list(ghId).then(d => setCrops((d.crops ?? []).filter(c => c.active === true || c.active === 1))).catch(() => setCrops([])),
    ]
    if (gh?.latitude != null && gh?.longitude != null)
      ps.push(fetchWeather(gh.latitude!, gh.longitude!).then(w => setWeather(w)).catch(() => setWeather(null)))
    Promise.all(ps).finally(() => setCtxLoading(false))
  }, [ghFilter, greenhouses])

  useEffect(() => {
    if (!resultRef.current || !prediction) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced) return
    anime({ targets: resultRef.current, opacity: [0, 1], translateY: [12, 0], duration: 340, easing: 'easeOutCubic' })
  }, [prediction])

  const currentGh    = greenhouses.find(g => g.id === ghFilter)
  const activeCrops  = crops.filter(c => c.active === true || c.active === 1)

  const predict = async () => {
    setLoading(true); setPrediction(null); setError(null)
    const basePrompt = getMlPrompt()
    const prompt = currentGh
      ? basePrompt.replace('del invernadero', `del invernadero "${currentGh.name}"`)
      : basePrompt
    try {
      const result = await callAI(prompt, buildFullContext(readings, crops, currentGh, weather))
      setPrediction(result)
    } catch (err) { setError((err as Error).message) }
    setLoading(false)
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="section-title">Machine Learning</h2>
        <p className="section-subtitle">Predicciones de sensores con inteligencia artificial</p>
      </div>

      <div className="flex items-center gap-2 rounded-2xl px-4 py-2.5 w-fit" style={{ background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.2)' }}>
        <Cpu size={14} className="text-green-400" />
        <span className="text-sm font-medium" style={{ color: '#4ade80' }}>Predicción basada en histórico de sensores</span>
      </div>

      {/* Greenhouse selector */}
      {greenhouses.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'rgba(255,255,255,0.35)' }}>Invernadero a predecir</p>
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
            <div className="rounded-2xl overflow-hidden" style={{ border:'1px solid rgba(74,222,128,0.15)', background:'#071a0c' }}>
              <div className="px-4 py-2.5 flex items-center gap-2 border-b" style={{ borderColor:'rgba(74,222,128,0.1)' }}>
                <Building2 size={13} style={{ color:'#4ade80' }} />
                <span className="text-sm font-semibold" style={{ color:'#e2ffe9' }}>{currentGh.name}</span>
                {currentGh.location && <span className="text-xs ml-1" style={{ color:'rgba(255,255,255,0.35)' }}>· {currentGh.location}</span>}
                {ctxLoading && <div className="ml-auto w-3 h-3 border-2 border-green-500/30 border-t-green-400 rounded-full animate-spin" />}
              </div>
              <div className="px-4 py-3 flex flex-wrap gap-2">
                {activeCrops.length > 0 ? (
                  <span className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium"
                        style={{ background:'rgba(74,222,128,0.08)', color:'#86efac', border:'1px solid rgba(74,222,128,0.15)' }}>
                    <Leaf size={10} />
                    {activeCrops.map(c => c.name + (c.variety ? ` (${c.variety})` : '')).join(', ')}
                  </span>
                ) : (
                  <span className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px]"
                        style={{ background:'rgba(255,255,255,0.04)', color:'rgba(255,255,255,0.25)', border:'1px solid rgba(255,255,255,0.08)' }}>
                    <Leaf size={10} /> Sin cultivos activos
                  </span>
                )}
                {weather ? (
                  <span className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium"
                        style={{ background:'rgba(125,211,252,0.08)', color:'#7dd3fc', border:'1px solid rgba(125,211,252,0.15)' }}>
                    <CloudSun size={10} /> {weather.icon} {weather.temperature}°C · {weather.description}
                  </span>
                ) : currentGh.latitude != null ? (
                  <span className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px]"
                        style={{ background:'rgba(255,255,255,0.04)', color:'rgba(255,255,255,0.25)', border:'1px solid rgba(255,255,255,0.08)' }}>
                    <CloudSun size={10} /> Cargando clima…
                  </span>
                ) : null}
              </div>
            </div>
          )}
        </div>
      )}

      {error && <div className="alert-danger text-sm">{error}</div>}

      {/* Action card */}
      <div className="card p-5">
        <div className="flex items-start gap-4 mb-5">
          <div className="p-3 rounded-2xl shrink-0" style={{ background: 'rgba(74,222,128,0.1)' }}>
            <TrendingUp size={20} className="text-green-400" />
          </div>
          <div>
            <h3 className="font-semibold" style={{ color: '#e2ffe9' }}>
              Predicción a 6 horas{currentGh ? ` — ${currentGh.name}` : ''}
            </h3>
            <p className="text-sm mt-0.5" style={{ color: 'rgba(255,255,255,0.5)' }}>
              {activeCrops.length > 0
                ? `Predicción ajustada para ${activeCrops.map(c => c.name).join(', ')} · Incluye clima exterior`
                : 'Analiza tendencias actuales y predice valores futuros con recomendaciones de acción.'}
            </p>
          </div>
        </div>
        <button onClick={predict} disabled={loading} className="w-full btn-primary py-3 text-sm">
          {loading
            ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Calculando predicción...</>
            : <><TrendingUp size={15} /> Predecir próximas 6 horas{currentGh ? ` · ${currentGh.name}` : ''}</>
          }
        </button>
      </div>

      {/* Result */}
      {prediction && (
        <div ref={resultRef} className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl" style={{ background: 'rgba(34,211,238,0.1)' }}>
                <Cpu size={15} style={{ color: '#22d3ee' }} />
              </div>
              <span className="text-sm font-semibold" style={{ color: '#e2ffe9' }}>
                Predicción generada{currentGh ? ` · ${currentGh.name}` : ''}
              </span>
            </div>
            {prediction.provider && <span className="badge-blue"><Sparkles size={10} />{prediction.provider}</span>}
          </div>
          <div className="rounded-2xl p-4" style={{ background: '#051a0a', border: '1px solid rgba(74,222,128,0.12)' }}>
            <p className="text-sm whitespace-pre-wrap leading-relaxed" style={{ color: 'rgba(255,255,255,0.7)' }}>{prediction.text}</p>
          </div>
        </div>
      )}
    </div>
  )
}
