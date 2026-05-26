import { useState, useEffect, useRef } from 'react'
import { Activity, Plus, X, Cpu, Wifi, RefreshCw, Settings, ChevronDown, ChevronUp } from 'lucide-react'
import anime from 'animejs'
import { useAuth } from '../context/AuthContext'
import { sensorRepository, greenhouseRepository } from '../repositories'
import type { SensorDto, GreenhouseDto, SensorType, Protocol, SensorThresholdDto } from '../types'
import PageHeader from '../components/ui/PageHeader'

const SENSOR_TYPES: SensorType[] = [
  'TEMPERATURE', 'TEMPERATURE_INTERNAL', 'TEMPERATURE_EXTERNAL',
  'HUMIDITY',    'HUMIDITY_INTERNAL',    'HUMIDITY_EXTERNAL',
  'SOIL_MOISTURE', 'LIGHT', 'CO2', 'PRESSURE',
]
const PROTOCOLS: Protocol[] = ['DHT22', 'DHT11', 'ADC', 'ANALOG', 'I2C', 'DIGITAL', 'ONE_WIRE']

const TYPE_LABEL: Record<string, { label: string; unit: string }> = {
  TEMPERATURE:          { label: 'Temperatura',     unit: '°C'  },
  TEMPERATURE_INTERNAL: { label: 'Temp. Interior',  unit: '°C'  },
  TEMPERATURE_EXTERNAL: { label: 'Temp. Exterior',  unit: '°C'  },
  HUMIDITY:             { label: 'Humedad',          unit: '%'   },
  HUMIDITY_INTERNAL:    { label: 'Hum. Interior',   unit: '%'   },
  HUMIDITY_EXTERNAL:    { label: 'Hum. Exterior',   unit: '%'   },
  SOIL_MOISTURE:        { label: 'Humedad Suelo',   unit: '%'   },
  LIGHT:                { label: 'Luminosidad',     unit: 'lx'  },
  CO2:                  { label: 'CO₂',             unit: 'ppm' },
  PRESSURE:             { label: 'Presión',         unit: 'hPa' },
}

interface SensorForm {
  name: string; type: string; location: string; protocol: string; gpioPin: string; greenhouseId: string
}

export default function SensorsPage() {
  const { allowedGreenhouseIds } = useAuth()
  const wrapperRef = useRef<HTMLDivElement>(null)
  const [sensors,     setSensors]     = useState<SensorDto[]>([])
  const [greenhouses, setGreenhouses] = useState<GreenhouseDto[]>([])
  const [filterGhId,  setFilterGhId]  = useState('')
  const [loading,     setLoading]     = useState(true)
  const [showForm,    setShowForm]    = useState(false)
  const [form,        setForm]        = useState<SensorForm>({ name: '', type: 'TEMPERATURE', location: '', protocol: 'DHT22', gpioPin: '', greenhouseId: '' })
  const [error,         setError]         = useState<string | null>(null)
  const [deduplicating, setDeduplicating] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [lastSyncSecs, setLastSyncSecs] = useState(0)
  const [expandedThreshold, setExpandedThreshold] = useState<number | null>(null)
  const [thresholds,        setThresholds]         = useState<Record<number, SensorThresholdDto>>({})
  const [savingThreshold,   setSavingThreshold]    = useState<number | null>(null)
  const [thresholdForms,    setThresholdForms]     = useState<Record<number, {
    minValue: string; maxValue: string; noDataMinutes: string; stuckMinutes: string; spikePercent: string
  }>>({})
  const gridRef = useRef<HTMLDivElement>(null)
  const formRef = useRef<HTMLFormElement>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    greenhouseRepository.list().then(d => setGreenhouses(d.greenhouses ?? [])).catch(() => {})
  }, [])

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  const normSensorTypeGlobal = (t?: string | null) => {
    if (t === 'TEMPERATURE_INTERNAL') return 'TEMPERATURE'
    if (t === 'HUMIDITY_INTERNAL')    return 'HUMIDITY'
    return t ?? ''
  }

  const runSilentDedup = async (allSensors: SensorDto[]) => {
    if (allowedGreenhouseIds !== null) return
    // Group by normalized type+greenhouseId: one sensor record per variable per greenhouse
    const groups = new Map<string, SensorDto[]>()
    for (const s of allSensors) {
      const key = `${normSensorTypeGlobal(s.type)}|${s.greenhouseId ?? ''}`
      if (!groups.has(key)) groups.set(key, [])
      groups.get(key)!.push(s)
    }
    let deleted = 0
    for (const [, group] of groups) {
      if (group.length <= 1) continue
      group.sort((a, b) => b.id - a.id)
      for (let i = 1; i < group.length; i++) {
        await sensorRepository.remove(group[i].id).catch(() => {})
        deleted++
      }
    }
    if (deleted > 0) {
      showToast(`${deleted} duplicado${deleted > 1 ? 's' : ''} eliminado${deleted > 1 ? 's' : ''}`)
      loadSensors()
    }
  }

  const loadSensors = async () => {
    setLoading(true)
    try {
      const data = await sensorRepository.list(filterGhId ? parseInt(filterGhId) : null)
      const all  = data.sensors ?? []
      // Operators only see sensors from their greenhouses (by greenhouseId or by ESP32 deviceSource)
      const norm = (v?: string | null) => v?.trim().toLowerCase() ?? ''
      const filtered = allowedGreenhouseIds === null
        ? all
        : all.filter(s => {
            if (s.greenhouseId != null && allowedGreenhouseIds.includes(s.greenhouseId)) return true
            if (s.deviceSource) {
              const gh = greenhouses.find(g =>
                norm(g.deviceId) === norm(s.deviceSource) && allowedGreenhouseIds.includes(g.id)
              )
              if (gh) return true
            }
            return false
          })
      // Normalize aliased types so TEMPERATURE_INTERNAL and TEMPERATURE count as one variable
      const normSensorType = (t?: string | null) => {
        if (t === 'TEMPERATURE_INTERNAL') return 'TEMPERATURE'
        if (t === 'HUMIDITY_INTERNAL')    return 'HUMIDITY'
        return t ?? ''
      }
      // Resolve greenhouse for sensors registered without explicit greenhouseId (deviceSource path)
      const resolveGhId = (s: SensorDto): string => {
        if (s.greenhouseId != null) return String(s.greenhouseId)
        if (s.deviceSource) {
          const gh = greenhouses.find(g => g.deviceId && norm(g.deviceId) === norm(s.deviceSource!))
          if (gh) return String(gh.id)
        }
        return ''
      }
      // One card per variable: keep the highest ID (most recently registered) for each type per greenhouse
      const dedupMap = new Map<string, SensorDto>()
      for (const s of filtered) {
        const key = `${normSensorType(s.type)}|${resolveGhId(s)}`
        const existing = dedupMap.get(key)
        if (!existing || s.id > existing.id) dedupMap.set(key, s)
      }
      setSensors(Array.from(dedupMap.values()))
      setLastSyncSecs(0)
      setError(null)
      // Load thresholds for all sensors
      const thresholdResults = await Promise.allSettled(
        filtered.map(s => sensorRepository.getThreshold(s.id))
      )
      const newThresholds: Record<number, SensorThresholdDto> = {}
      const newForms: Record<number, { minValue: string; maxValue: string; noDataMinutes: string; stuckMinutes: string; spikePercent: string }> = {}
      filtered.forEach((s, i) => {
        const result = thresholdResults[i]
        if (result.status === 'fulfilled') {
          newThresholds[s.id] = result.value
          newForms[s.id] = {
            minValue:      result.value.minValue     != null ? String(result.value.minValue)     : '',
            maxValue:      result.value.maxValue     != null ? String(result.value.maxValue)     : '',
            noDataMinutes: String(result.value.noDataMinutes),
            stuckMinutes:  String(result.value.stuckMinutes),
            spikePercent:  String(result.value.spikePercent),
          }
        } else {
          newForms[s.id] = { minValue: '', maxValue: '', noDataMinutes: '10', stuckMinutes: '30', spikePercent: '50' }
        }
      })
      setThresholds(newThresholds)
      setThresholdForms(prev => ({ ...prev, ...newForms }))
      if (allowedGreenhouseIds === null) {
        runSilentDedup(all).catch(() => {})
      }
    } catch (err) { setError((err as Error).message) }
    finally { setLoading(false) }
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    loadSensors()
    const startPoll = () => {
      if (pollRef.current) clearInterval(pollRef.current)
      pollRef.current = setInterval(loadSensors, 15_000)
    }
    startPoll()
    const onVisibility = () => {
      if (document.hidden) {
        if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null }
      } else { startPoll() }
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
      document.removeEventListener('visibilitychange', onVisibility)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterGhId, allowedGreenhouseIds, greenhouses.length])

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

  // Wrapper entrance animation
  useEffect(() => {
    if (!wrapperRef.current) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced) return
    anime({ targets: wrapperRef.current, opacity: [0, 1], translateY: [16, 0], duration: 400, easing: 'easeOutCubic' })
  }, [])

  // Last sync counter
  useEffect(() => {
    const t = setInterval(() => setLastSyncSecs(s => s + 1), 1000)
    return () => clearInterval(t)
  }, [])

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

  const handleSaveThreshold = async (sensorId: number) => {
    const form = thresholdForms[sensorId]
    if (!form) return
    setSavingThreshold(sensorId)
    try {
      const payload: Partial<SensorThresholdDto> = {
        minValue:      form.minValue      ? parseFloat(form.minValue)      : null,
        maxValue:      form.maxValue      ? parseFloat(form.maxValue)      : null,
        noDataMinutes: form.noDataMinutes ? parseInt(form.noDataMinutes)   : 10,
        stuckMinutes:  form.stuckMinutes  ? parseInt(form.stuckMinutes)    : 30,
        spikePercent:  form.spikePercent  ? parseFloat(form.spikePercent)  : 50,
      }
      const saved = await sensorRepository.setThreshold(sensorId, payload)
      setThresholds(prev => ({ ...prev, [sensorId]: saved }))
      showToast('Umbrales guardados')
      setExpandedThreshold(null)
    } catch (err) {
      showToast('Error guardando umbrales: ' + (err as Error).message)
    }
    setSavingThreshold(null)
  }

  const handleDeduplicate = async () => {
    setDeduplicating(true)
    try {
      const data = await sensorRepository.list(null)
      const all  = data.sensors ?? []
      const groups = new Map<string, SensorDto[]>()
      for (const s of all) {
        const key = `${normSensorTypeGlobal(s.type)}|${s.greenhouseId ?? ''}`
        if (!groups.has(key)) groups.set(key, [])
        groups.get(key)!.push(s)
      }
      let deleted = 0
      for (const [, group] of groups) {
        if (group.length <= 1) continue
        group.sort((a, b) => b.id - a.id)
        for (let i = 1; i < group.length; i++) {
          await sensorRepository.remove(group[i].id)
          deleted++
        }
      }
      showToast(deleted > 0 ? `${deleted} duplicado${deleted > 1 ? 's' : ''} eliminado${deleted > 1 ? 's' : ''}` : 'Sin duplicados')
      if (deleted > 0) loadSensors()
    } catch (err) { showToast('Error: ' + (err as Error).message) }
    setDeduplicating(false)
  }

  return (
    <div ref={wrapperRef} className="space-y-5">
      <PageHeader
        title="Sensores"
        subtitle={`Monitoreo y gestión${lastSyncSecs > 0 ? ` · hace ${lastSyncSecs}s` : ''}`}
        action={
          <div className="flex gap-2 items-center">
            <select value={filterGhId} onChange={e => setFilterGhId(e.target.value)}
                    className="input-field py-1.5 text-sm" style={{ width: 'auto' }}>
              <option value="">Todos</option>
              {greenhouses.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
            {allowedGreenhouseIds === null && (
              <button onClick={handleDeduplicate} disabled={deduplicating} className="btn-secondary px-3 py-1.5 text-sm">
                <RefreshCw size={13} className={deduplicating ? 'animate-spin' : ''} />
                {deduplicating ? 'Limpiando…' : 'Dedup'}
              </button>
            )}
            <button onClick={() => setShowForm(!showForm)} className={showForm ? 'btn-secondary px-3 py-1.5 text-sm' : 'btn-primary px-3 py-1.5 text-sm'}>
              {showForm ? <><X size={13} />Cancelar</> : <><Plus size={13} />Nuevo</>}
            </button>
          </div>
        }
      />

      {error && (
        <div className="alert-danger">
          <Activity size={14} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {toast && (
        <div className="alert-info text-sm">
          <Activity size={14} className="shrink-0" />
          <span>{toast}</span>
        </div>
      )}

      {/* Create form */}
      {showForm && (
        <form ref={formRef} onSubmit={handleSubmit} className="biopunk-card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold" style={{ color: '#e2ffe9' }}>Nuevo Sensor</h3>
            <button type="button" onClick={() => setShowForm(false)}
              className="p-1.5 rounded-lg transition-colors" style={{ color: 'rgba(255,255,255,0.35)' }}>
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
          <p className="empty-state-title">
            {allowedGreenhouseIds !== null
              ? 'No hay sensores registrados en tu invernadero'
              : filterGhId ? 'No hay sensores en este invernadero' : 'No hay sensores'}
          </p>
          <p className="empty-state-sub">
            {allowedGreenhouseIds !== null
              ? 'Los sensores aparecen aquí una vez que el ESP32 se conecta y reporta al backend.'
              : 'Crea un sensor para comenzar a recibir lecturas.'}
          </p>
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
                    <div className="p-2 rounded-xl shrink-0" style={{ background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.2)' }}>
                      <Activity size={16} style={{ color: '#4ade80' }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold truncate text-sm" style={{ color: '#e2ffe9' }}>{s.name}</h3>
                      <p className="text-xs mt-0.5 font-mono" style={{ color: 'rgba(255,255,255,0.35)' }}>{info.label} · {info.unit}</p>
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
                  <p className="text-[11px] mt-2 pl-11 font-mono" style={{ color: 'rgba(255,255,255,0.35)' }}>
                    <Cpu size={9} className="inline mr-1" />{s.location}
                  </p>
                )}

                {/* Threshold toggle row */}
                <div className="flex items-center justify-between mt-3 pt-2.5"
                     style={{ borderTop: '1px solid rgba(74,222,128,0.08)' }}>
                  {thresholds[s.id] ? (
                    <span className="badge-green text-[10px]">✓ Umbrales configurados</span>
                  ) : (
                    <span className="badge-gray text-[10px]">Sin umbrales</span>
                  )}
                  <button
                    onClick={() => {
                      const next = expandedThreshold === s.id ? null : s.id
                      setExpandedThreshold(next)
                      if (next) {
                        setTimeout(() => {
                          const el = document.getElementById(`threshold-panel-${s.id}`)
                          if (el) anime({ targets: el, opacity: [0, 1], translateY: [-6, 0], duration: 220, easing: 'easeOutCubic' })
                        }, 10)
                      }
                    }}
                    className="flex items-center gap-1 text-xs px-2 py-1 rounded-lg transition-colors"
                    style={{ background: 'rgba(74,222,128,0.06)', color: 'rgba(255,255,255,0.6)' }}>
                    <Settings size={11} />
                    {expandedThreshold === s.id ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
                  </button>
                </div>

                {/* Threshold panel */}
                {expandedThreshold === s.id && (
                  <div id={`threshold-panel-${s.id}`}
                       className="mt-2 space-y-2 p-3 rounded-xl"
                       style={{ background: '#051a0a', border: '1px solid rgba(74,222,128,0.10)' }}>
                    <p className="biopunk-label mb-2">Configurar umbrales de alerta</p>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="biopunk-label block mb-1">Valor mínimo</label>
                        <input type="number" placeholder="ej. 10"
                          value={thresholdForms[s.id]?.minValue ?? ''}
                          onChange={e => setThresholdForms(prev => ({
                            ...prev, [s.id]: { ...prev[s.id], minValue: e.target.value }
                          }))}
                          className="w-full rounded-lg px-2 py-1.5 text-xs"
                          style={{ background: '#0a1e0f', border: '1px solid rgba(74,222,128,0.15)', color: '#e2ffe9' }} />
                      </div>
                      <div>
                        <label className="biopunk-label block mb-1">Valor máximo</label>
                        <input type="number" placeholder="ej. 40"
                          value={thresholdForms[s.id]?.maxValue ?? ''}
                          onChange={e => setThresholdForms(prev => ({
                            ...prev, [s.id]: { ...prev[s.id], maxValue: e.target.value }
                          }))}
                          className="w-full rounded-lg px-2 py-1.5 text-xs"
                          style={{ background: '#0a1e0f', border: '1px solid rgba(74,222,128,0.15)', color: '#e2ffe9' }} />
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="biopunk-label block mb-1">Sin datos (min)</label>
                        <input type="number" placeholder="10"
                          value={thresholdForms[s.id]?.noDataMinutes ?? '10'}
                          onChange={e => setThresholdForms(prev => ({
                            ...prev, [s.id]: { ...prev[s.id], noDataMinutes: e.target.value }
                          }))}
                          className="w-full rounded-lg px-2 py-1.5 text-xs"
                          style={{ background: '#0a1e0f', border: '1px solid rgba(74,222,128,0.15)', color: '#e2ffe9' }} />
                      </div>
                      <div>
                        <label className="biopunk-label block mb-1">Constante (min)</label>
                        <input type="number" placeholder="30"
                          value={thresholdForms[s.id]?.stuckMinutes ?? '30'}
                          onChange={e => setThresholdForms(prev => ({
                            ...prev, [s.id]: { ...prev[s.id], stuckMinutes: e.target.value }
                          }))}
                          className="w-full rounded-lg px-2 py-1.5 text-xs"
                          style={{ background: '#0a1e0f', border: '1px solid rgba(74,222,128,0.15)', color: '#e2ffe9' }} />
                      </div>
                      <div>
                        <label className="biopunk-label block mb-1">Spike (%)</label>
                        <input type="number" placeholder="50"
                          value={thresholdForms[s.id]?.spikePercent ?? '50'}
                          onChange={e => setThresholdForms(prev => ({
                            ...prev, [s.id]: { ...prev[s.id], spikePercent: e.target.value }
                          }))}
                          className="w-full rounded-lg px-2 py-1.5 text-xs"
                          style={{ background: '#0a1e0f', border: '1px solid rgba(74,222,128,0.15)', color: '#e2ffe9' }} />
                      </div>
                    </div>
                    <button
                      onClick={() => handleSaveThreshold(s.id)}
                      disabled={savingThreshold === s.id}
                      className="w-full py-1.5 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
                      style={{ background: '#4ade80', color: '#020d05' }}>
                      {savingThreshold === s.id ? 'Guardando…' : 'Guardar umbrales'}
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
