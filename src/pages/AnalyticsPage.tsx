import { useState, useEffect, useRef } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Thermometer, Droplets, Leaf, RefreshCw, Download, FileText, type LucideIcon } from 'lucide-react'
import anime from 'animejs'
import { readingRepository } from '../repositories'
import type { SensorReadingDto } from '../types'

interface Stats { min: string | number; max: string | number; avg: string | number; current: string | number }

type RangeKey = '24h' | '7d' | '30d'

interface ChartConfig {
  type: string; label: string; icon: LucideIcon; color: string; unit: string; bg: string
}

const CHARTS: ChartConfig[] = [
  { type: 'TEMPERATURE_INTERNAL', label: 'Temperatura Interior', icon: Thermometer, color: '#f97316', unit: '°C', bg: 'orange' },
  { type: 'HUMIDITY',             label: 'Humedad Ambiente',     icon: Droplets,    color: '#0ea5e9', unit: '%',  bg: 'sky'    },
  { type: 'SOIL_MOISTURE',        label: 'Humedad del Suelo',    icon: Leaf,        color: '#22c55e', unit: '%',  bg: 'green'  },
]

const RANGES: { key: RangeKey; label: string }[] = [
  { key: '24h', label: 'Últimas 24h'  },
  { key: '7d',  label: 'Últimos 7 días' },
  { key: '30d', label: 'Últimos 30 días' },
]

export default function AnalyticsPage() {
  const [readings,         setReadings]         = useState<SensorReadingDto[]>([])
  const [loading,          setLoading]          = useState(true)
  const [range,            setRange]            = useState<RangeKey>('24h')
  const [showPrintPreview, setShowPrintPreview] = useState(false)
  const [error,            setError]            = useState<string | null>(null)
  const chartsRef = useRef<HTMLDivElement>(null)

  useEffect(() => { loadReadings() }, [])

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
  }, [loading, range])

  const loadReadings = async () => {
    try {
      const data = await readingRepository.list(null, 500)
      setReadings(data.readings || [])
      setError(null)
    } catch (err) { setError((err as Error).message) }
    setLoading(false)
  }

  const getFilteredReadings = (): SensorReadingDto[] => {
    const now = new Date(); const cutoff = new Date()
    if (range === '24h') cutoff.setHours(now.getHours() - 24)
    else if (range === '7d') cutoff.setDate(now.getDate() - 7)
    else cutoff.setDate(now.getDate() - 30)
    return readings.filter(r => { const d = new Date(r.timestamp); return d >= cutoff && d <= now })
  }

  const exportToCSV = () => {
    const filtered = getFilteredReadings()
    if (filtered.length === 0) { alert('No hay datos para exportar'); return }
    const headers = ['Fecha/Hora', 'Tipo de Sensor', 'Valor', 'Unidad', 'Origen']
    const rows = filtered.map(r => {
      const unit = r.sensorType === 'SOIL_MOISTURE' || r.sensorType === 'HUMIDITY' ? '%' : '°C'
      return [new Date(r.timestamp).toLocaleString('es-CO'), r.sensorType, r.value, unit, 'ESP32']
    })
    const csv = [headers.join(','), ...rows.map(row => row.map(cell => `"${cell}"`).join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `agropulse-export-${new Date().toISOString().split('T')[0]}.csv`
    link.style.visibility = 'hidden'
    document.body.appendChild(link); link.click(); document.body.removeChild(link)
  }

  const handlePrintPDF = () => { setShowPrintPreview(true); setTimeout(() => window.print(), 200) }

  const filteredReadings = getFilteredReadings()

  const getChartData = (sensorType: string) => {
    const byTime: Record<string, number[]> = {}
    filteredReadings.filter(r => r.sensorType === sensorType).forEach(r => {
      const key = new Date(r.timestamp).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: false })
      if (!byTime[key]) byTime[key] = []
      byTime[key].push(r.value)
    })
    return Object.entries(byTime)
      .map(([time, values]) => ({ time, value: (values.reduce((a, b) => a + b, 0) / values.length).toFixed(1) }))
      .slice(-24)
  }

  const getStats = (sensorType: string): Stats => {
    const values = filteredReadings.filter(r => r.sensorType === sensorType).map(r => r.value)
    if (values.length === 0) return { min: '—', max: '—', avg: '—', current: '—' }
    const current = values[0]; const min = Math.min(...values); const max = Math.max(...values)
    const avg = (values.reduce((a, b) => a + b, 0) / values.length).toFixed(1)
    return { min: min.toFixed(1), max: max.toFixed(1), avg, current: current.toFixed(1) }
  }

  if (showPrintPreview) {
    const tempStats  = getStats('TEMPERATURE_INTERNAL')
    const humidStats = getStats('HUMIDITY')
    const soilStats  = getStats('SOIL_MOISTURE')
    return (
      <div className="print-preview">
        <style>{`@media print { body * { visibility: hidden; } .print-preview, .print-preview * { visibility: visible; } .print-preview { position: absolute; left: 0; top: 0; width: 100%; } .print-table { width: 100%; border-collapse: collapse; margin-top: 20px; } .print-table th, .print-table td { border: 1px solid #999; padding: 8px; text-align: left; } .print-table th { background-color: #f0f0f0; } .no-print { display: none; } }`}</style>
        <div className="p-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Reporte de Analíticas AgroPulse</h1>
          <p className="text-gray-600 mb-1">Generado: {new Date().toLocaleString('es-CO')}</p>
          <p className="text-gray-600 mb-8">Período: {RANGES.find(r => r.key === range)?.label}</p>
          <h2 className="text-xl font-bold text-gray-800 mb-4">Resumen Ejecutivo</h2>
          <div className="grid grid-cols-4 gap-4 text-sm mb-8">
            <div className="border p-3 rounded"><p className="text-gray-600">Temperatura</p><p className="font-bold">Min: {tempStats.min}°C | Máx: {tempStats.max}°C | Prom: {tempStats.avg}°C</p></div>
            <div className="border p-3 rounded"><p className="text-gray-600">Humedad</p><p className="font-bold">Min: {humidStats.min}% | Máx: {humidStats.max}% | Prom: {humidStats.avg}%</p></div>
            <div className="border p-3 rounded"><p className="text-gray-600">Suelo</p><p className="font-bold">Min: {soilStats.min}% | Máx: {soilStats.max}% | Prom: {soilStats.avg}%</p></div>
            <div className="border p-3 rounded"><p className="text-gray-600">Total Lecturas</p><p className="font-bold">{filteredReadings.length}</p></div>
          </div>
          <h2 className="text-xl font-bold text-gray-800 mb-4">Datos Detallados</h2>
          <table className="print-table">
            <thead><tr><th>Fecha/Hora</th><th>Tipo</th><th>Valor</th><th>Unidad</th><th>Origen</th></tr></thead>
            <tbody>{filteredReadings.slice(0, 500).map((r, idx) => (
              <tr key={idx}><td>{new Date(r.timestamp).toLocaleString('es-CO')}</td><td>{r.sensorType}</td><td>{r.value}</td><td>{r.sensorType === 'SOIL_MOISTURE' || r.sensorType === 'HUMIDITY' ? '%' : '°C'}</td><td>ESP32</td></tr>
            ))}</tbody>
          </table>
          <div className="no-print mt-8 flex gap-3">
            <button onClick={() => setShowPrintPreview(false)} className="bg-gray-500 text-white px-6 py-2 rounded-lg font-semibold">Cerrar</button>
            <button onClick={() => window.print()} className="bg-blue-500 text-white px-6 py-2 rounded-lg font-semibold">Imprimir / PDF</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className="section-title">Analíticas en Tiempo Real</h2>
          <p className="section-subtitle">Gráficas e históricos de sensores</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={loadReadings} className="btn-primary px-4 py-2 text-sm">
            <RefreshCw size={14} /> Refrescar
          </button>
          <button onClick={exportToCSV} className="btn-secondary px-4 py-2 text-sm">
            <Download size={14} /> CSV
          </button>
          <button onClick={handlePrintPDF} className="btn-secondary px-4 py-2 text-sm">
            <FileText size={14} /> PDF
          </button>
        </div>
      </div>

      {error && (
        <div className="alert-danger text-sm">{error}</div>
      )}

      {/* Range selector */}
      <div className="card p-3">
        <div className="flex gap-2">
          {RANGES.map(r => (
            <button key={r.key} onClick={() => setRange(r.key)}
              className={`px-5 py-2 rounded-xl text-sm font-semibold transition-all ${
                range === r.key
                  ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-glow-sm'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}>
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
          <div ref={chartsRef} className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {CHARTS.map(({ type, label, icon: Icon, color, unit }) => {
              const stats = getStats(type)
              const data  = getChartData(type)
              return (
                <div key={type} className="card p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <Icon size={16} style={{ color }} />
                    <h3 className="font-semibold text-gray-800 text-sm">{label}</h3>
                  </div>
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={data}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f4f0" />
                      <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} domain={['dataMin - 5', 'dataMax + 5']} />
                      <Tooltip
                        contentStyle={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '12px', boxShadow: '0 4px 16px rgba(0,0,0,0.06)', fontSize: 12 }}
                        formatter={(v: number | string) => [`${v}${unit}`, label]}
                      />
                      <Line type="monotone" dataKey="value" stroke={color} strokeWidth={2} dot={false} activeDot={{ r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                  <div className="grid grid-cols-4 gap-2 mt-3">
                    {[['Mín', stats.min], ['Máx', stats.max], ['Prom', stats.avg], ['Actual', stats.current]].map(([lbl, val]) => (
                      <div key={String(lbl)} className="bg-gray-50 rounded-xl p-2 text-center">
                        <p className="text-[10px] text-gray-500 uppercase tracking-wide">{lbl}</p>
                        <p className="text-sm font-bold text-gray-800 font-mono mt-0.5">{val}{typeof val === 'string' && val !== '—' ? unit : ''}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Summary */}
          <div className="card p-5">
            <h3 className="text-sm font-semibold text-gray-800 mb-4">Resumen del período</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Lecturas temperatura', count: filteredReadings.filter(r => r.sensorType === 'TEMPERATURE_INTERNAL').length, color: 'border-orange-500' },
                { label: 'Lecturas humedad',      count: filteredReadings.filter(r => r.sensorType === 'HUMIDITY').length,             color: 'border-sky-500'    },
                { label: 'Lecturas suelo',         count: filteredReadings.filter(r => r.sensorType === 'SOIL_MOISTURE').length,        color: 'border-green-500'  },
                { label: 'Total lecturas',          count: filteredReadings.length,                                                      color: 'border-purple-500' },
              ].map(({ label, count, color }) => (
                <div key={label} className={`border-l-4 ${color} pl-3`}>
                  <p className="text-xs text-gray-500">{label}</p>
                  <p className="text-2xl font-bold text-gray-800 font-mono">{count}</p>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
