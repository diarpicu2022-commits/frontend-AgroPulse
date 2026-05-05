import { useState, useEffect } from 'react'
import { Activity } from 'lucide-react'
import api from '../services/api'

export default function SensorsPage() {
  const [sensors, setSensors] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', type: 'TEMPERATURE_INTERNAL', location: '' })
  const [error, setError] = useState(null)

  useEffect(() => { loadSensors() }, [])

  const loadSensors = async () => {
    try {
      const data = await api.sensors.list()
      setSensors(data.sensors || [])
      setError(null)
    } catch (err) { setError(err.message) }
    setLoading(false)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      await api.sensors.create(form)
      setShowForm(false)
      setForm({ name: '', type: 'TEMPERATURE_INTERNAL', location: '' })
      loadSensors()
    } catch (err) { alert('Error: ' + err.message) }
  }

  const handleDelete = async (id) => {
    if (confirm('¿Eliminar?')) {
      try { await api.sensors.delete(id); loadSensors() }
      catch (err) { alert('Error: ' + err.message) }
    }
  }

  const typeLabel = {
    TEMPERATURE_INTERNAL: { label: '🌡️ Temp. Interior', unit: '°C' },
    TEMPERATURE_EXTERNAL: { label: '🌡️ Temp. Exterior', unit: '°C' },
    HUMIDITY:             { label: '💧 Humedad',         unit: '%' },
    SOIL_MOISTURE:        { label: '🌱 Humedad Suelo',   unit: '%' },
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-800">📡 Sensores</h2>
        <button onClick={() => setShowForm(!showForm)} className="bg-primary text-white px-4 py-2 rounded-xl text-sm font-medium">
          {showForm ? 'Cancelar' : '+ Nuevo'}
        </button>
      </div>
      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">⚠️ {error}</div>}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 space-y-3">
          <input type="text" placeholder="Nombre del sensor" value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="w-full border rounded-xl px-4 py-2 text-sm" required />
          <select value={form.type} onChange={e => setForm({...form, type: e.target.value})} className="w-full border rounded-xl px-4 py-2 text-sm">
            <option value="TEMPERATURE_INTERNAL">Temp. Interior</option>
            <option value="TEMPERATURE_EXTERNAL">Temp. Exterior</option>
            <option value="HUMIDITY">Humedad</option>
            <option value="SOIL_MOISTURE">Humedad Suelo</option>
          </select>
          <input type="text" placeholder="Ubicación" value={form.location} onChange={e => setForm({...form, location: e.target.value})} className="w-full border rounded-xl px-4 py-2 text-sm" />
          <button type="submit" className="w-full bg-primary text-white py-2 rounded-xl font-medium">Guardar</button>
        </form>
      )}
      {loading ? (
        <div className="flex items-center justify-center h-40"><div className="animate-spin text-4xl">🌿</div></div>
      ) : sensors.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Activity size={48} className="mx-auto mb-3 opacity-40" />
          <p>No hay sensores</p>
          <button onClick={() => setShowForm(true)} className="text-primary text-sm mt-2">Crear uno nuevo</button>
        </div>
      ) : (
        <div className="grid gap-3">
          {sensors.map(s => {
            const info = typeLabel[s.type] || { label: s.type, unit: '' }
            return (
              <div key={s.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-800">{s.name}</h3>
                    <p className="text-sm text-gray-500">{info.label}</p>
                    <p className="text-xs text-gray-400">{s.location}</p>
                  </div>
                  <button onClick={() => handleDelete(s.id)} className="text-red-500 text-sm">Eliminar</button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
