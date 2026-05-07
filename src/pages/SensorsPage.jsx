import { useState, useEffect } from 'react'
import { Activity } from 'lucide-react'
import api from '../services/api'

const SENSOR_TYPES = ['TEMPERATURE','HUMIDITY','SOIL_MOISTURE','LIGHT','CO2','PRESSURE']
const PROTOCOLS    = ['DHT22','DHT11','ADC','ANALOG','I2C','DIGITAL','ONE_WIRE']

const TYPE_LABEL = {
  TEMPERATURE:   { label: '🌡️ Temperatura',     unit: '°C' },
  HUMIDITY:      { label: '💧 Humedad',           unit: '%'  },
  SOIL_MOISTURE: { label: '🌱 Humedad Suelo',     unit: '%'  },
  LIGHT:         { label: '☀️ Luz',               unit: 'lx' },
  CO2:           { label: '🌫️ CO₂',              unit: 'ppm' },
  PRESSURE:      { label: '🔵 Presión',           unit: 'hPa' },
}

export default function SensorsPage() {
  const [sensors, setSensors]         = useState([])
  const [greenhouses, setGreenhouses] = useState([])
  const [filterGhId, setFilterGhId]   = useState('')
  const [loading, setLoading]         = useState(true)
  const [showForm, setShowForm]       = useState(false)
  const [form, setForm]               = useState({ name: '', type: 'TEMPERATURE', location: '', protocol: 'DHT22', gpioPin: '', greenhouseId: '' })
  const [error, setError]             = useState(null)

  useEffect(() => { loadGreenhouses() }, [])
  useEffect(() => { loadSensors() }, [filterGhId])

  const loadGreenhouses = async () => {
    try {
      const data = await api.greenhouses.list()
      setGreenhouses(data.greenhouses || [])
    } catch {}
  }

  const loadSensors = async () => {
    setLoading(true)
    try {
      const data = await api.sensors.list(filterGhId || null)
      setSensors(data.sensors || [])
      setError(null)
    } catch (err) { setError(err.message) }
    setLoading(false)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      await api.sensors.create({
        ...form,
        gpioPin:      form.gpioPin      ? parseInt(form.gpioPin)      : null,
        greenhouseId: form.greenhouseId ? parseInt(form.greenhouseId) : null,
      })
      setShowForm(false)
      setForm({ name: '', type: 'TEMPERATURE', location: '', protocol: 'DHT22', gpioPin: '', greenhouseId: '' })
      loadSensors()
    } catch (err) { alert('Error: ' + err.message) }
  }

  const handleDelete = async (id) => {
    if (confirm('¿Eliminar sensor?')) {
      try { await api.sensors.delete(id); loadSensors() }
      catch (err) { alert('Error: ' + err.message) }
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-xl font-bold text-gray-800">📡 Sensores</h2>
        <div className="flex gap-2 items-center">
          <select value={filterGhId} onChange={e => setFilterGhId(e.target.value)}
            className="border-2 border-gray-200 rounded-xl px-3 py-2 text-sm focus:border-green-500 focus:outline-none">
            <option value="">Todos los invernaderos</option>
            {greenhouses.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
          <button onClick={() => setShowForm(!showForm)}
            className="bg-primary text-white px-4 py-2 rounded-xl text-sm font-medium">
            {showForm ? 'Cancelar' : '+ Nuevo'}
          </button>
        </div>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">⚠️ {error}</div>}

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 space-y-3">
          <input type="text" placeholder="Nombre del sensor *" value={form.name}
            onChange={e => setForm({...form, name: e.target.value})}
            className="w-full border rounded-xl px-4 py-2 text-sm" required />
          <div className="grid grid-cols-2 gap-2">
            <select value={form.type} onChange={e => setForm({...form, type: e.target.value})}
              className="border rounded-xl px-3 py-2 text-sm">
              {SENSOR_TYPES.map(t => <option key={t}>{t}</option>)}
            </select>
            <select value={form.protocol} onChange={e => setForm({...form, protocol: e.target.value})}
              className="border rounded-xl px-3 py-2 text-sm">
              {PROTOCOLS.map(p => <option key={p}>{p}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input type="number" placeholder="GPIO pin" value={form.gpioPin}
              onChange={e => setForm({...form, gpioPin: e.target.value})}
              className="border rounded-xl px-3 py-2 text-sm" />
            <select value={form.greenhouseId} onChange={e => setForm({...form, greenhouseId: e.target.value})}
              className="border rounded-xl px-3 py-2 text-sm">
              <option value="">Invernadero...</option>
              {greenhouses.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
          </div>
          <input type="text" placeholder="Ubicación (opcional)" value={form.location}
            onChange={e => setForm({...form, location: e.target.value})}
            className="w-full border rounded-xl px-4 py-2 text-sm" />
          <button type="submit" className="w-full bg-primary text-white py-2 rounded-xl font-medium">Guardar</button>
        </form>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-40"><div className="animate-spin text-4xl">🌿</div></div>
      ) : sensors.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Activity size={48} className="mx-auto mb-3 opacity-40" />
          <p>No hay sensores{filterGhId ? ' para este invernadero' : ''}</p>
          <button onClick={() => setShowForm(true)} className="text-primary text-sm mt-2">Crear uno nuevo</button>
        </div>
      ) : (
        <div className="grid gap-3">
          {sensors.map(s => {
            const info = TYPE_LABEL[s.type] || { label: s.type, unit: '' }
            return (
              <div key={s.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <h3 className="font-semibold text-gray-800">{s.name}</h3>
                    <p className="text-sm text-gray-500">{info.label}</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {s.protocol   && <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">{s.protocol}</span>}
                      {s.gpioPin != null && <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded">GPIO {s.gpioPin}</span>}
                      {s.location   && <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded">📍 {s.location}</span>}
                      {s.deviceSource && <span className="text-xs bg-purple-100 text-purple-600 px-2 py-0.5 rounded font-mono">{s.deviceSource}</span>}
                      <span className={`text-xs px-2 py-0.5 rounded ${s.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {s.active ? 'Activo' : 'Inactivo'}
                      </span>
                    </div>
                    {s.lastValue != null && (
                      <p className="text-lg font-bold text-green-700">{s.lastValue} {info.unit}</p>
                    )}
                  </div>
                  <button onClick={() => handleDelete(s.id)} className="text-red-400 hover:text-red-600 text-xs px-2 py-1 rounded hover:bg-red-50 transition-colors">Eliminar</button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
