import { useState, useRef, useEffect } from 'react'
import { Cpu, TrendingUp, Sparkles, Building2, Sprout } from 'lucide-react'
import anime from 'animejs'
import { callAI } from '../services/ai-service'
import type { AIResult } from '../services/ai-service'
import { readingRepository, greenhouseRepository } from '../repositories'
import type { SensorReadingDto, GreenhouseDto } from '../types'

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

export default function MLPage() {
  const [prediction,    setPrediction]    = useState<AIResult | null>(null)
  const [loading,       setLoading]       = useState(false)
  const [error,         setError]         = useState<string | null>(null)
  const [sensorContext, setSensorContext] = useState('')
  const [greenhouses,   setGreenhouses]   = useState<GreenhouseDto[]>([])
  const [ghFilter,      setGhFilter]      = useState<number | ''>('')
  const resultRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    greenhouseRepository.list().then(d => setGreenhouses(d.greenhouses ?? [])).catch(() => {})
  }, [])

  useEffect(() => {
    const ghId = ghFilter !== '' ? (ghFilter as number) : undefined
    readingRepository.list(null, 100, ghId ?? null).then(d => {
      const gh = ghFilter !== '' ? greenhouses.find(g => g.id === ghFilter) : undefined
      setSensorContext(buildSensorContext(d.readings ?? [], gh?.name))
    }).catch(() => {})
  }, [ghFilter, greenhouses])

  useEffect(() => {
    if (!resultRef.current || !prediction) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced) return
    anime({ targets: resultRef.current, opacity: [0, 1], translateY: [12, 0], duration: 340, easing: 'easeOutCubic' })
  }, [prediction])

  const predict = async () => {
    setLoading(true); setPrediction(null); setError(null)
    const ghLabel = ghFilter !== '' ? greenhouses.find(g => g.id === ghFilter)?.name : undefined
    const prompt = `Basándote en el historial reciente de sensores${ghLabel ? ` del invernadero "${ghLabel}"` : ' del invernadero'}, predice los valores de cada sensor para las próximas 6 horas (en intervalos de 1 hora).

Presenta los resultados con:
- Hora estimada
- Valores predichos para cada sensor
- Tendencia (subiendo, bajando, estable)
- Acciones recomendadas si algún valor saldrá de rango

Sé conciso y práctico.`
    try {
      const result = await callAI(prompt, sensorContext)
      setPrediction(result)
    } catch (err) { setError((err as Error).message) }
    setLoading(false)
  }

  const currentGh = greenhouses.find(g => g.id === ghFilter)

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
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs" style={{ background: 'rgba(74,222,128,0.06)', border: '1px solid rgba(74,222,128,0.15)', color: '#4ade80' }}>
              <Building2 size={12} />
              <span>Prediciendo: <strong>{currentGh.name}</strong>{currentGh.location ? ` · ${currentGh.location}` : ''}</span>
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
              Analiza las tendencias actuales de los sensores y predice los valores futuros con recomendaciones de acción.
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
