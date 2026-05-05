import { useState } from 'react'
import { RefreshCw } from 'lucide-react'
import api from '../services/api'

export default function SimulationPage() {
  const [generated, setGenerated] = useState(null)
  const [loading, setLoading]     = useState(false)
  const [history, setHistory]     = useState([])
  const [error, setError]         = useState(null)

  const randBetween = (min, max) => +(Math.random() * (max - min) + min).toFixed(1)

  const generateAndInsert = async () => {
    setLoading(true); setError(null)
    const timestamp = new Date().toISOString()
    const readings = [
      { sensor_id: 1, sensor_type: 'TEMPERATURE_INTERNAL', value: randBetween(15, 40), timestamp, source: 'SIMULATION' },
      { sensor_id: 2, sensor_type: 'TEMPERATURE_EXTERNAL', value: randBetween(5, 35),  timestamp, source: 'SIMULATION' },
      { sensor_id: 3, sensor_type: 'HUMIDITY',             value: randBetween(30, 90), timestamp, source: 'SIMULATION' },
      { sensor_id: 4, sensor_type: 'SOIL_MOISTURE',        value: randBetween(20, 80), timestamp, source: 'SIMULATION' },
    ]
    setGenerated(readings)
    try {
      for (const r of readings) await api.readings.create(r)
      setHistory(prev => [{ time: timestamp, readings }, ...prev].slice(0, 10))
    } catch (err) { setError(err.message) }
    setLoading(false)
  }

  const typeEmoji  = { TEMPERATURE_INTERNAL: '🌡️', TEMPERATURE_EXTERNAL: '🌡️', HUMIDITY: '💧', SOIL_MOISTURE: '🌱' }
  const typeLabel  = { TEMPERATURE_INTERNAL: 'Temp. Interior', TEMPERATURE_EXTERNAL: 'Temp. Exterior', HUMIDITY: 'Humedad', SOIL_MOISTURE: 'Humedad Suelo' }
  const typeUnit   = { TEMPERATURE_INTERNAL: '°C', TEMPERATURE_EXTERNAL: '°C', HUMIDITY: '%', SOIL_MOISTURE: '%' }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-gray-800">🧪 Simular Lecturas</h2>
      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">⚠️ {error}</div>}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
        <p className="text-sm text-gray-600 mb-3">Genera lecturas aleatorias de sensores y las inserta en la base de datos para probar el sistema.</p>
        <button onClick={generateAndInsert} disabled={loading} className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-xl text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50 transition-colors">
          {loading ? <><div className="animate-spin text-lg">🌿</div> Generando...</> : <><RefreshCw size={16} /> Generar lecturas aleatorias</>}
        </button>
      </div>
      {generated && (
        <div className="bg-white rounded-2xl shadow-sm border border-green-200 p-4">
          <h3 className="text-sm font-semibold text-green-700 mb-3">✅ Lecturas generadas</h3>
          <div className="space-y-2">
            {generated.map((r, i) => (
              <div key={i} className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0">
                <span className="text-sm text-gray-600">{typeEmoji[r.sensor_type]} {typeLabel[r.sensor_type]}</span>
                <span className="text-sm font-bold text-gray-800">{r.value} {typeUnit[r.sensor_type]}</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-2">{new Date(generated[0].timestamp).toLocaleString('es-CO')}</p>
        </div>
      )}
      {history.length > 1 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-2">📋 Historial de simulaciones</h3>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {history.slice(1).map((h, i) => (
              <div key={i} className="text-xs text-gray-500 flex items-center gap-2">
                <span className="text-gray-300">•</span>
                {new Date(h.time).toLocaleTimeString('es-CO')} — {h.readings.length} lecturas
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
