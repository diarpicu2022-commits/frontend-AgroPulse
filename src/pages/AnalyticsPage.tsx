import { useState, useEffect } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Thermometer, Droplets, Leaf, RefreshCw } from 'lucide-react'
import { readingRepository } from '../repositories'
import type { SensorReadingDto } from '../types'

interface Stats {
  min: string | number
  max: string | number
  avg: string | number
  current: string | number
}

type RangeKey = '24h' | '7d' | '30d'

export default function AnalyticsPage() {
  const [readings, setReadings]           = useState<SensorReadingDto[]>([])
  const [loading, setLoading]             = useState(true)
  const [range, setRange]                 = useState<RangeKey>('24h')
  const [showPrintPreview, setShowPrintPreview] = useState(false)
  const [error, setError]                 = useState<string | null>(null)

  useEffect(() => { loadReadings() }, [])

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
    switch (range) {
      case '24h': cutoff.setHours(now.getHours() - 24); break
      case '7d':  cutoff.setDate(now.getDate() - 7);    break
      case '30d': cutoff.setDate(now.getDate() - 30);   break
      default:    cutoff.setHours(now.getHours() - 24)
    }
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
    link.setAttribute('href', URL.createObjectURL(blob))
    link.setAttribute('download', `agropulse-export-${new Date().toISOString().split('T')[0]}.csv`)
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
    if (values.length === 0) return { min: 0, max: 0, avg: 0, current: 0 }
    const current = values[0]; const min = Math.min(...values); const max = Math.max(...values)
    const avg = (values.reduce((a, b) => a + b, 0) / values.length).toFixed(1)
    return { min: min.toFixed(1), max: max.toFixed(1), avg, current: current.toFixed(1) }
  }

  const tempStats  = getStats('TEMPERATURE_INTERNAL')
  const humidStats = getStats('HUMIDITY')
  const soilStats  = getStats('SOIL_MOISTURE')

  if (showPrintPreview) {
    return (
      <div className="print-preview">
        <style>{`@media print { body * { visibility: hidden; } .print-preview, .print-preview * { visibility: visible; } .print-preview { position: absolute; left: 0; top: 0; width: 100%; } .print-table { width: 100%; border-collapse: collapse; margin-top: 20px; } .print-table th, .print-table td { border: 1px solid #999; padding: 8px; text-align: left; } .print-table th { background-color: #f0f0f0; font-weight: bold; } .no-print { display: none; } }`}</style>
        <div className="p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-800 mb-2">📊 Reporte de Analíticas AgroPulse</h1>
            <p className="text-gray-600">Generado: {new Date().toLocaleString('es-CO')}</p>
            <p className="text-gray-600">Período: {range === '24h' ? 'Últimas 24 horas' : range === '7d' ? 'Últimos 7 días' : 'Últimos 30 días'}</p>
          </div>
          <div className="mb-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Resumen Ejecutivo</h2>
            <div className="grid grid-cols-4 gap-4 text-sm">
              <div className="border p-3 rounded"><p className="text-gray-600">🌡️ Temperatura</p><p className="text-lg font-bold">Min: {tempStats.min}°C | Máx: {tempStats.max}°C | Prom: {tempStats.avg}°C</p></div>
              <div className="border p-3 rounded"><p className="text-gray-600">💧 Humedad</p><p className="text-lg font-bold">Min: {humidStats.min}% | Máx: {humidStats.max}% | Prom: {humidStats.avg}%</p></div>
              <div className="border p-3 rounded"><p className="text-gray-600">🌱 Suelo</p><p className="text-lg font-bold">Min: {soilStats.min}% | Máx: {soilStats.max}% | Prom: {soilStats.avg}%</p></div>
              <div className="border p-3 rounded"><p className="text-gray-600">📈 Total Lecturas</p><p className="text-lg font-bold">{filteredReadings.length}</p></div>
            </div>
          </div>
          <h2 className="text-xl font-bold text-gray-800 mt-8 mb-4">Datos Detallados</h2>
          <table className="print-table">
            <thead><tr><th>Fecha/Hora</th><th>Tipo de Sensor</th><th>Valor</th><th>Unidad</th><th>Origen</th></tr></thead>
            <tbody>{filteredReadings.slice(0, 500).map((r, idx) => <tr key={idx}><td>{new Date(r.timestamp).toLocaleString('es-CO')}</td><td>{r.sensorType}</td><td>{r.value}</td><td>{r.sensorType === 'SOIL_MOISTURE' || r.sensorType === 'HUMIDITY' ? '%' : '°C'}</td><td>ESP32</td></tr>)}</tbody>
          </table>
          <div className="no-print mt-8 flex gap-3">
            <button onClick={() => setShowPrintPreview(false)} className="bg-gray-500 text-white px-6 py-2 rounded-lg font-semibold">Cerrar Vista Previa</button>
            <button onClick={() => window.print()} className="bg-blue-500 text-white px-6 py-2 rounded-lg font-semibold">🖨️ Imprimir / Guardar como PDF</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-3xl font-bold text-gray-800">📊 Analíticas en Tiempo Real</h2>
          <p className="text-sm text-gray-600 mt-1">Gráficas e históricos de sensores</p>
        </div>
        <div className="flex gap-2">
          <button onClick={loadReadings} className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white px-4 py-2.5 rounded-xl text-sm font-medium shadow-md hover:shadow-lg transition-all duration-200 transform hover:scale-105 flex items-center gap-2"><RefreshCw size={16} /> Refrescar</button>
          <button onClick={exportToCSV} className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white px-4 py-2.5 rounded-xl text-sm font-medium shadow-md hover:shadow-lg transition-all duration-200 transform hover:scale-105 flex items-center gap-2">📥 Descargar CSV</button>
          <button onClick={handlePrintPDF} className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white px-4 py-2.5 rounded-xl text-sm font-medium shadow-md hover:shadow-lg transition-all duration-200 transform hover:scale-105 flex items-center gap-2">📄 Generar PDF</button>
        </div>
      </div>
      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">⚠️ {error}</div>}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
        <div className="flex gap-3 flex-wrap">
          {(['24h', '7d', '30d'] as RangeKey[]).map(r => (
            <button key={r} onClick={() => setRange(r)} className={`px-6 py-2 rounded-xl font-medium transition-all ${range === r ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-md' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
              {r === '24h' ? 'Últimas 24h' : r === '7d' ? 'Últimos 7 días' : 'Últimos 30 días'}
            </button>
          ))}
        </div>
      </div>
      {loading ? (
        <div className="flex items-center justify-center py-12"><div className="text-center"><div className="text-4xl mb-3 animate-bounce">📊</div><p className="text-gray-600">Cargando gráficas...</p></div></div>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {[
              { type: 'TEMPERATURE_INTERNAL', label: 'Temperatura Interior', icon: Thermometer, color: '#f97316', stats: tempStats,  unit: '°C', bg: 'orange' },
              { type: 'HUMIDITY',             label: 'Humedad Ambiente',     icon: Droplets,    color: '#0ea5e9', stats: humidStats, unit: '%',  bg: 'blue'   },
              { type: 'SOIL_MOISTURE',        label: 'Humedad del Suelo',    icon: Leaf,        color: '#22c55e', stats: soilStats,  unit: '%',  bg: 'green'  },
            ].map(({ type, label, icon: Icon, color, stats, unit, bg }) => (
              <div key={type} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
                <h3 className="text-lg font-bold text-gray-800 mb-3 flex items-center gap-2">
                  <Icon size={20} style={{ color }} /> {label}
                </h3>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={getChartData(type)}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ddd" />
                    <XAxis dataKey="time" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} domain={['dataMin - 5', 'dataMax + 5']} />
                    <Tooltip formatter={(v: number | string) => `${v}${unit}`} />
                    <Line type="monotone" dataKey="value" stroke={color} strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
                <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
                  {(['Mín', 'Máx', 'Promedio', 'Actual'] as const).map((lbl, i) => {
                    const val = [stats.min, stats.max, stats.avg, stats.current][i]
                    return <div key={lbl} className={`bg-${bg}-50 p-2 rounded-lg`}><p className="text-gray-600">{lbl}</p><p className={`text-lg font-bold text-${bg}-600`}>{val}{unit}</p></div>
                  })}
                </div>
              </div>
            ))}
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <h3 className="text-lg font-bold text-gray-800 mb-3">📈 Resumen</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
              <div className="border-l-4 border-orange-500 pl-3"><p className="text-gray-600">Lecturas de temperatura</p><p className="text-2xl font-bold text-orange-600">{filteredReadings.filter(r => r.sensorType === 'TEMPERATURE_INTERNAL').length}</p></div>
              <div className="border-l-4 border-blue-500 pl-3"><p className="text-gray-600">Lecturas de humedad</p><p className="text-2xl font-bold text-blue-600">{filteredReadings.filter(r => r.sensorType === 'HUMIDITY').length}</p></div>
              <div className="border-l-4 border-green-600 pl-3"><p className="text-gray-600">Lecturas de suelo</p><p className="text-2xl font-bold text-green-600">{filteredReadings.filter(r => r.sensorType === 'SOIL_MOISTURE').length}</p></div>
              <div className="border-l-4 border-purple-500 pl-3"><p className="text-gray-600">Total de lecturas</p><p className="text-2xl font-bold text-purple-600">{filteredReadings.length}</p></div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
