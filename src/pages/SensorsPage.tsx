import { useState, useEffect, useRef } from 'react'
import { Activity, Plus, X, Cpu, Wifi } from 'lucide-react'
import anime from 'animejs'
import { useAuth } from '../context/AuthContext'
import { sensorRepository, greenhouseRepository } from '../repositories'
import type { SensorDto, GreenhouseDto, SensorType, Protocol } from '../types'

const SENSOR_TYPES: SensorType[] = ['TEMPERATURE', 'HUMIDITY', 'SOIL_MOISTURE', 'LIGHT', 'CO2', 'PRESSURE']
const PROTOCOLS: Protocol[]      = ['DHT22', 'DHT11', 'ADC', 'ANALOG', 'I2C', 'DIGITAL', 'ONE_WIRE']

const TYPE_LABEL: Record<string, { label: string; unit: string }> = {
  TEMPERATURE:   { label: 'Temperatura',    unit: '°C'  },
  HUMIDITY:      { label: 'Humedad',         unit: '%'   },
  SOIL_MOISTURE: { label: 'Humedad Suelo',   unit: '%'   },
  LIGHT:         { label: 'Luminosidad',     unit: 'lx'  },
  CO2:           { label: 'CO₂',             unit: 'ppm' },
  PRESSURE:      { label: 'Presión',         unit: 'hPa' },
}

interface SensorForm {
  name: string; type: string; location: string; protocol: string; gpioPin: string; greenhouseId: string
}

export default function SensorsPage() {
  const { allowedGreenhouseIds } = useAuth()
  const [sensors,     setSensors]     = useState<SensorDto[]>([])
  const [greenhouses, setGreenhouses] = useState<GreenhouseDto[]>([])
  const [filterGhId,  setFilterGhId]  = useState('')
  const [loading,     setLoading]     = useState(true)
  const [showForm,    setShowForm]    = useState(false)
  const [form,        setForm]        = useState<SensorForm>({ name: '', type: 'TEMPERATURE', location: '', protocol: 'DHT22', gpioPin: '', greenhouseId: '' })
  const [error,       setError]       = useState<string | null>(null)
  const gridRef = useRef<HTMLDivElement>(null)
  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    greenhouseRepository.list().then(d => setGreenhouses(d.greenhouses ?? [])).catch(() => {})
  }, [])
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { loadSensors() }, [filterGhId, allowedGreenhouseIds])

  const loadSensors = async () => {
    setLoading(true)
    try {
      const data = await sensorRepository.list(filterGhId ? parseInt(filterGhId) : null)
      const all  = data.sensors ?? []
      // Operators only see sensors of allowed greenhouses
      const filtered = allowedGreenhouseIds === null
        ? all
        : all.filter(s => s.greenhouseId == null || allowedGreenhouseIds.includes(s.greenhouseId))
      setSensors(filtered)
      setError(null)
    } catch (err) { setError((err as Error).message) }
    finally { setLoading(false) }
  }

  // Stagger entrance when grid renders
  useEffect(() => {
    if (!gridRef.current || loading || sensors.length === 0) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced) return
    anime({
      targets:    Array.from(gridRef.current.children) as Element[],
      opacity:    [0, 1],
      translateY: [14, 0],
      delay:      anime.stagger(50),
      duration:   360,
      easing:     'easeOutCubic',
    })
  }, [loading, sensors.length])

  // Form slide-in
  useEffect(() => {
    if (!formRef.current || !showForm) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced) return
    anime({ targets: formRef.current, opacity: [0, 1], scaleY: [0.94, 1], duration: 280, easing: 'easeOutBack' })
  }, [showForm])

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
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className="section-title">Sensores</h2>
          <p className="section-subtitle">Monitoreo y gestión de sensores del invernadero</p>
        </div>
        <div className="flex gap-2 items-center flex-wrap">
          <select value={filterGhId} onChange={e => setFilterGhId(e.target.value)}
            className="input-field py-2 text-sm">
            <option value="">Todos los invernaderos</option>
            {greenhouses.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
          <button onClick={() => setShowForm(!showForm)} className={showForm ? 'btn-secondary px-4 py-2 text-sm' : 'btn-primary px-4 py-2 text-sm'}>
            {showForm ? <><X size={14} /> Cancelar</> : <><Plus size={14} /> Nuevo</>}
          </button>
        </div>
      </div>

      {error && (
        <div className="alert-danger">
          <Activity size={14} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Create form */}
      {showForm && (
        <form ref={formRef} onSubmit={handleSubmit} className="card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-800">Nuevo Sensor</h3>
            <button type="button" onClick={() => setShowForm(false)}
              className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
              <X size={16} />
            </button>
          </div>
          <input type="text" placeholder="Nombre del sensor *" value={form.name}
            onChange={e => setForm({ ...form, name: e.target.value })}
            className="input-field" required />
          <div className="grid grid-cols-2 gap-3">
            <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} className="input-field">
              {SENSOR_TYPES.map(t => <option key={t}>{t}</option>)}
            </select>
            <select value={form.protocol} onChange={e => setForm({ ...form, protocol: e.target.value })} className="input-field">
              {PROTOCOLS.map(p => <option key={p}>{p}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <input type="number" placeholder="GPIO pin" value={form.gpioPin}
              onChange={e => setForm({ ...form, gpioPin: e.target.value })} className="input-field" />
            <select value={form.greenhouseId} onChange={e => setForm({ ...form, greenhouseId: e.target.value })} className="input-field">
              <option value="">Invernadero...</option>
              {greenhouses.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
          </div>
          <input type="text" placeholder="Ubicación (opcional)" value={form.location}
            onChange={e => setForm({ ...form, location: e.target.value })} className="input-field" />
          <button type="submit" className="w-full btn-primary py-2.5 text-sm">Guardar sensor</button>
        </form>
      )}

      {/* List */}
      {loading ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="skeleton h-28 rounded-3xl" />
          ))}
        </div>
      ) : sensors.length === 0 ? (
        <div className="empty-state card p-10">
          <Activity size={40} className="empty-state-icon" />
          <p className="empty-state-title">No hay sensores{filterGhId ? ' en este invernadero' : ''}</p>
          <p className="empty-state-sub">Crea un sensor para comenzar a recibir lecturas.</p>
          <button onClick={() => setShowForm(true)} className="btn-primary px-4 py-2 text-sm mt-4">
            <Plus size={14} /> Nuevo sensor
          </button>
        </div>
      ) : (
        <div ref={gridRef} className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {sensors.map(s => {
            const info    = TYPE_LABEL[s.type] ?? { label: s.type, unit: '' }
            const gh      = greenhouses.find(g => g.id === s.greenhouseId)
            const esp32gh = s.deviceSource ? greenhouses.find(g => g.deviceId && g.deviceId === s.deviceSource) : null
            return (
              <div key={s.id} className="card-hover p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="p-2 bg-green-100 rounded-xl shrink-0">
                      <Activity size={16} className="text-green-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-800 truncate text-sm">{s.name}</h3>
                      <p className="text-xs text-gray-500 mt-0.5">{info.label} · {info.unit}</p>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {gh && (
                          <span className="badge-teal text-[10px]">
                            <Cpu size={8} className="inline mr-0.5" />{gh.name}
                          </span>
                        )}
                        {s.protocol    && <span className="badge-gray">{s.protocol}</span>}
                        {s.gpioPin != null && <span className="badge-yellow">GPIO {s.gpioPin}</span>}
                        {s.deviceSource && (
                          <span className={esp32gh ? 'badge-green text-[10px]' : 'badge-purple font-mono text-[10px]'}>
                            <Wifi size={9} className="inline mr-0.5" />
                            {esp32gh ? `ESP32 · ${esp32gh.name}` : s.deviceSource}
                          </span>
                        )}
                        <span className={s.active ? 'badge-green' : 'badge-gray'}>
                          {s.active ? 'Activo' : 'Inactivo'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <button onClick={() => handleDelete(s.id)}
                    className="shrink-0 p-1.5 rounded-lg hover:bg-red-50 text-red-400 hover:text-red-600 transition-colors">
                    <X size={14} />
                  </button>
                </div>
                {s.location && (
                  <p className="text-[11px] text-gray-400 mt-2 pl-11">
                    <Cpu size={9} className="inline mr-1" />{s.location}
                  </p>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
