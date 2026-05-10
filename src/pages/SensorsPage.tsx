import { useState, useEffect } from 'react'
import { Activity } from 'lucide-react'
import { sensorRepository, greenhouseRepository } from '../repositories'
import type { SensorDto, GreenhouseDto, SensorType, Protocol } from '../types'

const SENSOR_TYPES: SensorType[] = ['TEMPERATURE', 'HUMIDITY', 'SOIL_MOISTURE', 'LIGHT', 'CO2', 'PRESSURE']
const PROTOCOLS: Protocol[]      = ['DHT22', 'DHT11', 'ADC', 'ANALOG', 'I2C', 'DIGITAL', 'ONE_WIRE']

const TYPE_LABEL: Record<string, { label: string; unit: string }> = {
  TEMPERATURE:   { label: '🌡️ Temperatura',  unit: '°C'  },
  HUMIDITY:      { label: '💧 Humedad',        unit: '%'   },
  SOIL_MOISTURE: { label: '🌱 Humedad Suelo',  unit: '%'   },
  LIGHT:         { label: '☀️ Luz',            unit: 'lx'  },
  CO2:           { label: '🌫️ CO₂',           unit: 'ppm' },
  PRESSURE:      { label: '🔵 Presión',        unit: 'hPa' },
}

interface SensorForm {
  name: string; type: string; location: string; protocol: string; gpioPin: string; greenhouseId: string
}

export default function SensorsPage() {
  const [sensors,     setSensors]     = useState<SensorDto[]>([])
  const [greenhouses, setGreenhouses] = useState<GreenhouseDto[]>([])
  const [filterGhId,  setFilterGhId]  = useState('')
  const [loading,     setLoading]     = useState(true)
  const [showForm,    setShowForm]    = useState(false)
  const [form,        setForm]        = useState<SensorForm>({ name: '', type: 'TEMPERATURE', location: '', protocol: 'DHT22', gpioPin: '', greenhouseId: '' })
  const [error,       setError]       = useState<string | null>(null)

  useEffect(() => {
    greenhouseRepository.list().then(d => setGreenhouses(d.greenhouses ?? [])).catch(() => {})
  }, [])
  useEffect(() => { loadSensors() }, [filterGhId])

  const loadSensors = async () => {
    setLoading(true)
    try {
      const data = await sensorRepository.list(filterGhId ? parseInt(filterGhId) : null)
      setSensors(data.sensors ?? [])
      setError(null)
    } catch (err) { setError((err as Error).message) }
    finally { setLoading(false) }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await sensorRepository.create({
        ...form,
        gpioPin:      form.gpioPin      ? parseInt(form.gpioPin)      : null,
        greenhouseId: form.greenhouseId ? parseInt(form.greenhouseId) : undefined,
        active: true,
      } as Partial<SensorDto>)
      setShowForm(false)
      setForm({ name: '', type: 'TEMPERATURE', location: '', protocol: 'DHT22', gpioPin: '', greenhouseId: '' })
      loadSensors()
    } catch (err) { alert('Error: ' + (err as Error).message) }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('¿Eliminar sensor?')) return
    try { await sensorRepository.remove(id); loadSensors() }
    catch (err) { alert('Error: ' + (err as Error).message) }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-xl font-bold text-gray-800">📡 Sensores</h2>
        <div className="flex gap-2 items-center flex-wrap">
          <select value={filterGhId} onChange={e => setFilterGhId(e.target.value)}
            className="border-2 border-gray-200 rounded-xl px-3 py-2 text-sm focus:border-green-500 focus:outline-none">
            <option value="">Todos los invernaderos</option>
            {greenhouses.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
          <button onClick={() => setShowForm(!showForm)}
            className="bg-primary text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-green-700 transition-colors">
            {showForm ? 'Cancelar' : '+ Nuevo'}
          </button>
        </div>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">⚠️ {error}</div>}

      {showForm && (
        <form onSubmit={handleSubmit} className="card p-4 space-y-3 animate-slide-up">
          <input type="text" placeholder="Nombre del sensor *" value={form.name}
            onChange={e => setForm({ ...form, name: e.target.value })}
            className="input-field" required />
          <div className="grid grid-cols-2 gap-2">
            <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} className="input-field py-2">
              {SENSOR_TYPES.map(t => <option key={t}>{t}</option>)}
            </select>
            <select value={form.protocol} onChange={e => setForm({ ...form, protocol: e.target.value })} className="input-field py-2">
              {PROTOCOLS.map(p => <option key={p}>{p}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <input type="number" placeholder="GPIO pin" value={form.gpioPin}
              onChange={e => setForm({ ...form, gpioPin: e.target.value })} className="input-field" />
            <select value={form.greenhouseId} onChange={e => setForm({ ...form, greenhouseId: e.target.value })} className="input-field py-2">
              <option value="">Invernadero...</option>
              {greenhouses.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
          </div>
          <input type="text" placeholder="Ubicación (opcional)" value={form.location}
            onChange={e => setForm({ ...form, location: e.target.value })} className="input-field" />
          <button type="submit" className="w-full btn-primary py-2 text-sm font-medium">Guardar</button>
        </form>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-40"><div className="animate-spin text-4xl">🌿</div></div>
      ) : sensors.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Activity size={48} className="mx-auto mb-3 opacity-40" />
          <p>No hay sensores{filterGhId ? ' para este invernadero' : ''}</p>
          <button onClick={() => setShowForm(true)} className="text-primary text-sm mt-2 hover:underline">Crear uno nuevo</button>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {sensors.map(s => {
            const info = TYPE_LABEL[s.type] ?? { label: s.type, unit: '' }
            return (
              <div key={s.id} className="card-hover p-4 animate-fade-in">
                <div className="flex items-start justify-between">
                  <div className="space-y-1 flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-800 truncate">{s.name}</h3>
                    <p className="text-sm text-gray-500">{info.label}</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {s.protocol   && <span className="badge-gray">{s.protocol}</span>}
                      {s.gpioPin != null && <span className="badge-yellow">GPIO {s.gpioPin}</span>}
                      {s.deviceSource && <span className="badge-purple font-mono">{s.deviceSource}</span>}
                      <span className={s.active ? 'badge-green' : 'badge-gray'}>{s.active ? 'Activo' : 'Inactivo'}</span>
                    </div>
                  </div>
                  <button onClick={() => handleDelete(s.id)}
                    className="text-red-400 hover:text-red-600 text-xs px-2 py-1 rounded hover:bg-red-50 transition-colors shrink-0 ml-2">
                    Eliminar
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
