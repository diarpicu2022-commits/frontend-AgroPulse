import { useState, useEffect, useRef } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import {
  Thermometer, Droplets, Leaf, Sun, Wind, FlaskConical,
  RefreshCw, Download, FileText, Building2, Sprout,
  type LucideIcon,
} from 'lucide-react'
import anime from 'animejs'
import { readingRepository, greenhouseRepository } from '../repositories'
import { useGsapReveal } from '../hooks/useGsapReveal'
import type { SensorReadingDto, GreenhouseDto } from '../types'

interface Stats { min: string | number; max: string | number; avg: string | number; current: string | number }
type RangeKey = '24h' | '7d' | '30d'

interface ChartConfig {
  type: string; label: string; icon: LucideIcon; color: string; unit: string
}

// Fixed charts shown in global mode
const DEFAULT_CHARTS: ChartConfig[] = [
  { type: 'TEMPERATURE_INTERNAL', label: 'Temperatura Interior', icon: Thermometer, color: '#f97316', unit: '°C' },
  { type: 'HUMIDITY',             label: 'Humedad Ambiente',     icon: Droplets,    color: '#0ea5e9', unit: '%'  },
  { type: 'SOIL_MOISTURE',        label: 'Humedad del Suelo',    icon: Leaf,        color: '#22c55e', unit: '%'  },
]

// Full sensor type registry for per-GH dynamic discovery
const SENSOR_META: Record<string, ChartConfig> = {
  TEMPERATURE:          { type: 'TEMPERATURE',          label: 'Temperatura',         icon: Thermometer, color: '#f97316', unit: '°C'  },
  TEMPERATURE_INTERNAL: { type: 'TEMPERATURE_INTERNAL', label: 'Temperatura Interior', icon: Thermometer, color: '#f97316', unit: '°C'  },
  TEMPERATURE_EXTERNAL: { type: 'TEMPERATURE_EXTERNAL', label: 'Temperatura Exterior', icon: Thermometer, color: '#fb923c', unit: '°C'  },
  HUMIDITY:             { type: 'HUMIDITY',             label: 'Humedad Ambiente',     icon: Droplets,    color: '#0ea5e9', unit: '%'   },
  HUMIDITY_INTERNAL:    { type: 'HUMIDITY_INTERNAL',    label: 'Hum. Interior',        icon: Droplets,    color: '#38bdf8', unit: '%'   },
  HUMIDITY_EXTERNAL:    { type: 'HUMIDITY_EXTERNAL',    label: 'Hum. Exterior',        icon: Droplets,    color: '#7dd3fc', unit: '%'   },
  SOIL_MOISTURE:        { type: 'SOIL_MOISTURE',        label: 'Humedad del Suelo',    icon: Leaf,        color: '#22c55e', unit: '%'   },
  LIGHT:                { type: 'LIGHT',                label: 'Luminosidad',          icon: Sun,         color: '#eab308', unit: 'lx'  },
  CO2:                  { type: 'CO2',                  label: 'CO₂',                  icon: FlaskConical,color: '#8b5cf6', unit: 'ppm' },
  WIND_SPEED:           { type: 'WIND_SPEED',           label: 'Viento',               icon: Wind,        color: '#94a3b8', unit: 'm/s' },
  PRESSURE:             { type: 'PRESSURE',             label: 'Presión',              icon: Wind,        color: '#6366f1', unit: 'hPa' },
  PH:                   { type: 'PH',                   label: 'pH',                   icon: FlaskConical,color: '#a78bfa', unit: 'pH'  },
}

// Parse timestamps that may lack 'Z' suffix (backend returns local ISO strings)
const parseTs = (ts: string): Date => new Date(ts.endsWith('Z') ? ts : ts + 'Z')

// Match reading type to chart type — base types alias their _INTERNAL/_EXTERNAL variants
const typeMatches = (readingType: string | null | undefined, chartType: string): boolean => {
  if (!readingType) return false
  if (readingType === chartType) return true
  if (readingType.startsWith(chartType + '_')) return true
  if (chartType.startsWith(readingType + '_')) return true
  return false
}

const RANGES: { key: RangeKey; label: string }[] = [
  { key: '24h', label: 'Últimas 24h'    },
  { key: '7d',  label: 'Últimos 7 días' },
  { key: '30d', label: 'Últimos 30 días'},
]

export default function AnalyticsPage() {
  const revealRef = useGsapReveal<HTMLDivElement>({ stagger: 0.06, duration: 0.45 })
  const [readings,         setReadings]         = useState<SensorReadingDto[]>([])
  const [greenhouses,      setGreenhouses]      = useState<GreenhouseDto[]>([])
  const [loading,          setLoading]          = useState(true)
  const [range,            setRange]            = useState<RangeKey>('24h')
  const [ghFilter,         setGhFilter]         = useState<number | ''>('')
  const [showPrintPreview, setShowPrintPreview] = useState(false)
  const [error,            setError]            = useState<string | null>(null)
  const chartsRef = useRef<HTMLDivElement>(null)
  const headerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    greenhouseRepository.list().then(d => setGreenhouses(d.greenhouses || [])).catch(() => {})
  }, [])

  useEffect(() => { loadReadings() }, [ghFilter, range])  // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!headerRef.current) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced) return
    anime({ targets: headerRef.current, opacity: [0, 1], translateY: [-10, 0], duration: 400, easing: 'easeOutCubic' })
  }, [])

  useEffect(() => {
    if (!chartsRef.current || loading) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced) return
    anime({
      targets:    Array.from(chartsRef.current.children) as Element[],
      opacity:    [0, 1],
      translateY: [18, 0],
      delay:      anime.stagger(80),
      duration:   420,
      easing:     'easeOutCubic',
    })
  }, [loading, range, ghFilter])

  const loadReadings = async () => {
    setLoading(true)
    try {
      const limit = range === '24h' ? 1000 : range === '7d' ? 3000 : 8000
      const data = await readingRepository.list(null, limit, ghFilter !== '' ? (ghFilter as number) : null)
      setReadings(data.readings || [])
      setError(null)
    } catch (err) { setError((err as Error).message) }
    setLoading(false)
  }

  const getRangeCutoff = (): Date => {
    const cutoff = new Date()
    if (range === '24h') cutoff.setHours(cutoff.getHours() - 24)
    else if (range === '7d') cutoff.setDate(cutoff.getDate() - 7)
    else cutoff.setDate(cutoff.getDate() - 30)
    return cutoff
  }

  const getFilteredReadings = (): SensorReadingDto[] => {
    const cutoff = getRangeCutoff(); const now = new Date()
    return readings.filter(r => { const d = parseTs(r.timestamp); return d >= cutoff && d <= now })
  }

  const getTimeKey = (timestamp: string): string => {
    const d = parseTs(timestamp)
    if (range === '24h') return d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: false })
    if (range === '7d')  return d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short' }) + ' ' +
                                d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: false })
    return d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })
  }

  const getChartData = (sensorType: string, source: SensorReadingDto[]) => {
    const sorted = source
      .filter(r => typeMatches(r.sensorType, sensorType))
      .sort((a, b) => parseTs(a.timestamp).getTime() - parseTs(b.timestamp).getTime())
    // Muestreo uniforme sobre TODO el rango — antes slice(-150) hacía que
    // 7d y 30d mostraran los mismos 150 datos más recientes.
    const MAX = 120
    const step = sorted.length > MAX ? Math.ceil(sorted.length / MAX) : 1
    return sorted
      .filter((_, i) => i % step === 0)
      .map(r => ({ time: getTimeKey(r.timestamp), value: r.value }))
  }

  const getStats = (sensorType: string, source: SensorReadingDto[]): Stats => {
    const values = source.filter(r => typeMatches(r.sensorType, sensorType)).map(r => r.value)
    if (values.length === 0) return { min: '—', max: '—', avg: '—', current: '—' }
    const current = values[0]
    return {
      min:     Math.min(...values).toFixed(1),
      max:     Math.max(...values).toFixed(1),
      avg:     (values.reduce((a, b) => a + b, 0) / values.length).toFixed(1),
      current: current.toFixed(1),
    }
  }

  const currentGh = greenhouses.find(g => g.id === ghFilter)
  const filteredReadings = getFilteredReadings()

  // For per-GH mode discover all sensor types present in loaded readings
  const detectedTypes = [...new Set(readings.map(r => r.sensorType).filter(Boolean))] as string[]
  const chartsToShow: ChartConfig[] = ghFilter !== '' && detectedTypes.length > 0
    ? detectedTypes.map(t => SENSOR_META[t] ?? { type: t, label: t, icon: Leaf, color: '#6b7280', unit: '' })
    : DEFAULT_CHARTS

  const ghDisplayName = (ghId?: number) =>
    ghId ? (greenhouses.find(g => g.id === ghId)?.name ?? `GH-${ghId}`) : '—'

  const exportToCSV = (specificGh?: GreenhouseDto) => {
    const source = specificGh
      ? filteredReadings.filter(r => r.greenhouseId === specificGh.id)
      : filteredReadings
    if (source.length === 0) { alert('No hay datos para exportar'); return }
    const headers = ['Fecha/Hora', 'Tipo de Sensor', 'Valor', 'Unidad', 'Invernadero', 'Origen']
    const rows = source.map(r => {
      const unit  = SENSOR_META[r.sensorType ?? '']?.unit ?? ''
      const ghName = specificGh?.name ?? ghDisplayName(r.greenhouseId)
      return [new Date(r.timestamp).toLocaleString('es-CO'), r.sensorType, r.value, unit, ghName, 'ESP32']
    })
    const csv  = [headers.join(','), ...rows.map(row => row.map(c => `"${c}"`).join(','))].join('\n')
    const link = document.createElement('a')
    link.href     = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }))
    const label   = (specificGh ?? currentGh)?.name.toLowerCase().replace(/\s+/g, '-') ?? 'global'
    link.download = `agropulse-${label}-${new Date().toISOString().split('T')[0]}.csv`
    link.style.visibility = 'hidden'
    document.body.appendChild(link); link.click(); document.body.removeChild(link)
  }

  const handlePrintPDF = () => { setShowPrintPreview(true); setTimeout(() => window.print(), 200) }

  // ── Print preview ──────────────────────────────────────────────────────────
  if (showPrintPreview) {
    const ghLabel = currentGh ? currentGh.name : 'Todos los invernaderos'
    const ghLoc   = currentGh?.location ? ` — ${currentGh.location}` : ''
    return (
      <div className="print-preview">
        <style>{`
          @media print {
            body * { visibility: hidden; }
            .print-preview, .print-preview * { visibility: visible; }
            .print-preview { position: absolute; left: 0; top: 0; width: 100%; }
            .print-table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            .print-table th, .print-table td { border: 1px solid #999; padding: 8px; text-align: left; font-size: 12px; }
            .print-table th { background-color: #f0f0f0; }
            .no-print { display: none; }
          }
        `}</style>
        <div className="p-8 max-w-4xl">
          <h1 className="text-2xl font-bold text-gray-800 mb-1">Reporte de Analíticas — AgroPulse</h1>
          <h2 className="text-base font-semibold text-green-700 mb-1">{ghLabel}{ghLoc}</h2>
          <p className="text-sm text-gray-600 mb-1">Generado: {new Date().toLocaleString('es-CO')}</p>
          <p className="text-sm text-gray-600 mb-6">Período: {RANGES.find(r => r.key === range)?.label}</p>

          <h2 className="text-lg font-bold text-gray-800 mb-3">Resumen Ejecutivo</h2>
          <div className="grid grid-cols-4 gap-3 text-sm mb-6">
            {chartsToShow.slice(0, 4).map(cfg => {
              const s = getStats(cfg.type, filteredReadings)
              return (
                <div key={cfg.type} className="border p-3 rounded">
                  <p className="text-gray-500 text-xs mb-1">{cfg.label}</p>
                  <p className="font-bold text-xs">Mín: {s.min}{cfg.unit} | Máx: {s.max}{cfg.unit} | Prom: {s.avg}{cfg.unit}</p>
                </div>
              )
            })}
          </div>

          <h2 className="text-lg font-bold text-gray-800 mb-3">
            Datos Detallados ({filteredReadings.length} lecturas)
          </h2>
          <table className="print-table">
            <thead>
              <tr>
                <th>Fecha/Hora</th><th>Tipo</th><th>Valor</th><th>Unidad</th>
                {!currentGh && <th>Invernadero</th>}
                <th>Origen</th>
              </tr>
            </thead>
            <tbody>
              {filteredReadings.slice(0, 500).map((r, idx) => (
                <tr key={idx}>
                  <td>{new Date(r.timestamp).toLocaleString('es-CO')}</td>
                  <td>{SENSOR_META[r.sensorType ?? '']?.label ?? r.sensorType}</td>
                  <td>{r.value}</td>
                  <td>{SENSOR_META[r.sensorType ?? '']?.unit ?? ''}</td>
                  {!currentGh && <td>{ghDisplayName(r.greenhouseId)}</td>}
                  <td>ESP32</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="no-print mt-8 flex gap-3">
            <button onClick={() => setShowPrintPreview(false)}
              className="px-6 py-2 rounded-lg font-semibold" style={{ background: 'rgba(74,222,128,0.1)', color: '#4ade80', border: '1px solid rgba(74,222,128,0.2)' }}>Cerrar</button>
            <button onClick={() => window.print()}
              className="bg-blue-500 text-white px-6 py-2 rounded-lg font-semibold">Imprimir / Guardar PDF</button>
          </div>
        </div>
      </div>
    )
  }

  // ── Main view ──────────────────────────────────────────────────────────────
  return (
    <div ref={revealRef} className="space-y-5">
      {/* Header */}
      <div ref={headerRef} className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className="section-title">Analíticas</h2>
          <p className="section-subtitle">
            {currentGh
              ? `${currentGh.name}${currentGh.location ? ` · ${currentGh.location}` : ''}`
              : 'Comportamiento global de todos los invernaderos'}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={loadReadings} className="btn-primary px-4 py-2 text-sm">
            <RefreshCw size={14} /> Refrescar
          </button>
          <button onClick={() => exportToCSV()} className="btn-secondary px-4 py-2 text-sm">
            <Download size={14} /> {currentGh ? 'CSV individual' : 'CSV global'}
          </button>
          <button onClick={handlePrintPDF} className="btn-secondary px-4 py-2 text-sm">
            <FileText size={14} /> {currentGh ? 'PDF individual' : 'PDF global'}
          </button>
        </div>
      </div>

      {/* Greenhouse filter chips */}
      {greenhouses.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setGhFilter('')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-2xl text-xs font-semibold transition-all border
              ${ghFilter === ''
                ? 'bg-green-600 text-white border-green-600 shadow-sm'
                : 'border-[rgba(74,222,128,0.12)] hover:border-green-400/20'}`}
            style={ghFilter !== '' ? { background: '#051a0a', color: 'rgba(255,255,255,0.5)' } : {}}
          >
            <Sprout size={11} /> Todos
          </button>
          {greenhouses.map(gh => (
            <button key={gh.id}
              onClick={() => setGhFilter(gh.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-2xl text-xs font-semibold transition-all border
                ${ghFilter === gh.id
                  ? 'bg-green-600 text-white border-green-600 shadow-sm'
                  : 'border-[rgba(74,222,128,0.12)] hover:border-green-400/20'}`}
              style={ghFilter !== gh.id ? { background: '#051a0a', color: 'rgba(255,255,255,0.5)' } : {}}
            >
              <Building2 size={11} /> {gh.name}
            </button>
          ))}
        </div>
      )}

      {/* Per-greenhouse info banner */}
      {currentGh && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-2xl" style={{ background: 'rgba(74,222,128,0.06)', border: '1px solid rgba(74,222,128,0.15)' }}>
          <div className="p-2 rounded-xl shrink-0" style={{ background: 'rgba(74,222,128,0.1)' }}>
            <Building2 size={16} className="text-green-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold" style={{ color: '#4ade80' }}>{currentGh.name}</p>
            <p className="text-xs truncate" style={{ color: 'rgba(74,222,128,0.7)' }}>
              {[currentGh.location, currentGh.description].filter(Boolean).join(' · ') || 'Sin descripción'}
            </p>
          </div>
          {currentGh.deviceId && (
            <span className="font-mono text-xs px-2 py-1 rounded-lg shrink-0" style={{ color: 'rgba(255,255,255,0.35)', background: '#051a0a', border: '1px solid rgba(74,222,128,0.12)' }}>
              {currentGh.deviceId}
            </span>
          )}
        </div>
      )}

      {error && <div className="alert-danger text-sm">{error}</div>}

      {/* Range selector */}
      <div className="card p-3">
        <div className="flex gap-2 flex-wrap">
          {RANGES.map(r => (
            <button key={r.key} onClick={() => setRange(r.key)}
              className={`px-5 py-2 rounded-xl text-sm font-semibold transition-all ${
                range === r.key
                  ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-glow-sm'
                  : 'hover:bg-[rgba(74,222,128,0.08)]'
              }`}
              style={range !== r.key ? { background: 'rgba(74,222,128,0.06)', color: 'rgba(255,255,255,0.5)' } : {}}>
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => <div key={i} className="skeleton h-80 rounded-3xl" />)}
        </div>
      ) : (
        <>
          {/* Charts grid */}
          <div ref={chartsRef} className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {chartsToShow.map(({ type, label, icon: Icon, color, unit }) => {
              const stats = getStats(type, filteredReadings)
              const data  = getChartData(type, filteredReadings)
              return (
                <div key={type} className="card p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <Icon size={16} style={{ color }} />
                    <h3 className="font-semibold text-sm" style={{ color: '#e2ffe9' }}>{label}</h3>
                    <span className="ml-auto text-[10px] font-mono px-2 py-0.5 rounded-lg" style={{ color: 'rgba(255,255,255,0.35)', background: '#051a0a', border: '1px solid rgba(74,222,128,0.12)' }}>
                      {filteredReadings.filter(r => typeMatches(r.sensorType, type)).length} lect.
                    </span>
                  </div>
                  {data.length === 0 ? (
                    <div className="h-[200px] flex items-center justify-center text-gray-400 text-sm">
                      Sin datos en este período
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height={200}>
                      <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(74,222,128,0.08)" />
                        <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false}
                          domain={['auto', 'auto']} tickCount={5} />
                        <Tooltip
                          contentStyle={{ background: '#0f2d17', border: '1px solid rgba(74,222,128,0.2)', borderRadius: '12px', boxShadow: '0 4px 16px rgba(0,0,0,0.4)', fontSize: 12, color: '#e2ffe9' }}
                          formatter={(v: number) => [`${v}${unit}`, label]}
                        />
                        <Line type="monotone" dataKey="value" stroke={color} strokeWidth={2}
                          dot={false} activeDot={{ r: 3 }} isAnimationActive={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                  <div className="grid grid-cols-4 gap-2 mt-3">
                    {(['Mín', 'Máx', 'Prom', 'Actual'] as const).map((lbl, i) => {
                      const val = [stats.min, stats.max, stats.avg, stats.current][i]
                      return (
                        <div key={lbl} className="rounded-xl p-2 text-center" style={{ background: 'rgba(74,222,128,0.06)' }}>
                          <p className="text-[10px] uppercase tracking-wide" style={{ color: 'rgba(255,255,255,0.35)' }}>{lbl}</p>
                          <p className="text-sm font-bold font-mono mt-0.5" style={{ color: '#e2ffe9' }}>
                            {val}{typeof val === 'string' && val !== '—' ? unit : ''}
                          </p>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Summary card */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold" style={{ color: '#e2ffe9' }}>
                Resumen — {RANGES.find(r => r.key === range)?.label}
                {currentGh && <span className="ml-2 text-green-600 font-normal">· {currentGh.name}</span>}
              </h3>
              <span className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>{filteredReadings.length} lecturas totales</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Temperatura', count: filteredReadings.filter(r => r.sensorType?.startsWith('TEMP')).length, color: 'border-orange-500' },
                { label: 'Humedad',     count: filteredReadings.filter(r => r.sensorType === 'HUMIDITY').length,      color: 'border-sky-500'    },
                { label: 'Suelo',       count: filteredReadings.filter(r => r.sensorType === 'SOIL_MOISTURE').length, color: 'border-green-500'  },
                { label: 'Total',       count: filteredReadings.length,                                               color: 'border-purple-500' },
              ].map(({ label, count, color }) => (
                <div key={label} className={`border-l-4 ${color} pl-3`}>
                  <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>{label}</p>
                  <p className="text-2xl font-bold font-mono" style={{ color: '#e2ffe9' }}>{count}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Per-GH activity breakdown — only in global mode with 2+ greenhouses */}
          {ghFilter === '' && greenhouses.length > 1 && (
            <div className="card p-5">
              <h3 className="text-sm font-semibold mb-4" style={{ color: '#e2ffe9' }}>
                Actividad por invernadero
                <span className="ml-2 text-xs font-normal" style={{ color: 'rgba(255,255,255,0.35)' }}>
                  — {RANGES.find(r => r.key === range)?.label}
                </span>
              </h3>
              <div className="space-y-3">
                {greenhouses.map(gh => {
                  const ghReadings = filteredReadings.filter(r => r.greenhouseId === gh.id)
                  const pct = filteredReadings.length > 0
                    ? Math.round((ghReadings.length / filteredReadings.length) * 100)
                    : 0
                  const tempVals  = ghReadings.filter(r => r.sensorType?.startsWith('TEMP')).map(r => r.value)
                  const avgTemp   = tempVals.length > 0
                    ? (tempVals.reduce((a, b) => a + b, 0) / tempVals.length).toFixed(1)
                    : null
                  return (
                    <div key={gh.id} className="flex items-center gap-3">
                      <div className="flex items-center gap-2 w-36 shrink-0">
                        <Building2 size={12} className="text-green-500 shrink-0" />
                        <span className="text-xs font-medium truncate" style={{ color: 'rgba(255,255,255,0.7)' }}>{gh.name}</span>
                      </div>
                      <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: 'rgba(74,222,128,0.1)' }}>
                        <div
                          className="h-full bg-gradient-to-r from-green-400 to-emerald-500 rounded-full transition-all duration-700"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        {avgTemp && (
                          <span className="text-xs font-mono px-1.5 py-0.5 rounded-lg" style={{ color: '#fb923c', background: 'rgba(251,146,60,0.1)', border: '1px solid rgba(251,146,60,0.15)' }}>
                            {avgTemp}°C
                          </span>
                        )}
                        <span className="text-xs font-mono w-16 text-right" style={{ color: 'rgba(255,255,255,0.35)' }}>{ghReadings.length} lect.</span>
                        <div className="flex gap-1 shrink-0">
                          <button onClick={() => setGhFilter(gh.id)}
                            className="text-[10px] font-semibold text-green-600 hover:text-green-800 underline underline-offset-2">
                            Ver
                          </button>
                          <span className="text-gray-300">·</span>
                          <button onClick={() => exportToCSV(gh)}
                            className="text-[10px] font-semibold text-blue-600 hover:text-blue-800 underline underline-offset-2 flex items-center gap-0.5">
                            <Download size={9} /> CSV
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
