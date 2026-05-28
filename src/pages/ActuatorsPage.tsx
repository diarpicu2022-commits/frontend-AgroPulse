import { useState, useEffect, useRef } from 'react'
import { Zap, Plus, X, Edit2, Trash2, Power, PowerOff, RefreshCw } from 'lucide-react'
import anime from 'animejs'
import { useAuth } from '../context/AuthContext'
import { useGsapReveal } from '../hooks/useGsapReveal'
import { actuatorRepository, greenhouseRepository } from '../repositories'
import { Wifi } from 'lucide-react'
import type { ActuatorDto, GreenhouseDto } from '../types'

const TYPE_LABEL: Record<string, string> = {
  PUMP:           'Bomba de Agua',
  FAN:            'Ventilador',
  LED:            'Iluminación LED',
  SERVO:          'Servo Motor',
  RELAY:          'Relé',
  MOTOR:          'Motor',
  EXTRACTOR:      'Extractor de Aire',
  DOOR:           'Puerta',
  HEAT_GENERATOR: 'Generador de Calor',
  WATER_PUMP:     'Bomba de Agua',
}

// Tipos que usan relé HW-383 (active-low): activeLow debe ser true
const RELAY_TYPES = new Set(['PUMP', 'FAN', 'RELAY', 'MOTOR', 'EXTRACTOR', 'WATER_PUMP', 'HEAT_GENERATOR', 'DOOR'])

interface ActuatorForm {
  name: string
  type: string
  greenhouseId: string | number
  gpioPin: string | number
  activeLow: boolean
}

export default function ActuatorsPage() {
  const { allowedGreenhouseIds } = useAuth()
  const revealRef = useGsapReveal<HTMLDivElement>({ stagger: 0.06, duration: 0.45 })
  const [actuators,   setActuators]   = useState<ActuatorDto[]>([])
  const [greenhouses, setGreenhouses] = useState<GreenhouseDto[]>([])
  const [filterGhId,  setFilterGhId]  = useState('')
  const [loading,     setLoading]     = useState(true)
  const [showForm,    setShowForm]    = useState(false)
  const [editingId,   setEditingId]   = useState<number | null>(null)
  const [form,        setForm]        = useState<ActuatorForm>({ name: '', type: 'PUMP', greenhouseId: '', gpioPin: '', activeLow: true })
  const [error,       setError]       = useState<string | null>(null)
  const [deduplicating, setDeduplicating] = useState(false)
  const listRef = useRef<HTMLDivElement>(null)
  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => { loadGreenhouses() }, [])
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { loadActuators() },  [filterGhId, allowedGreenhouseIds, greenhouses])

  const loadGreenhouses = async () => {
    try { const d = await greenhouseRepository.list(); setGreenhouses(d.greenhouses || []) } catch {}
  }

  const loadActuators = async () => {
    setLoading(true)
    try {
      const data = await actuatorRepository.list(filterGhId ? parseInt(filterGhId) : null)
      const all  = data.actuators || []
      const filtered = allowedGreenhouseIds === null
        ? all
        : all.filter(a => {
            if (a.greenhouseId != null && allowedGreenhouseIds.includes(a.greenhouseId)) return true
            if (a.deviceSource) {
              const gh = greenhouses.find(g => g.deviceId === a.deviceSource && allowedGreenhouseIds.includes(g.id))
              if (gh) return true
            }
            return false
          })
      setActuators(filtered)
      setError(null)
    } catch (err) { setError((err as Error).message) }
    setLoading(false)
  }

  useEffect(() => {
    if (!listRef.current || loading || actuators.length === 0) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced) return
    anime({
      targets:    Array.from(listRef.current.children) as Element[],
      opacity:    [0, 1],
      translateY: [12, 0],
      delay:      anime.stagger(45),
      duration:   340,
      easing:     'easeOutCubic',
    })
  }, [loading, actuators.length])

  useEffect(() => {
    if (!formRef.current || !showForm) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced) return
    anime({ targets: formRef.current, opacity: [0, 1], scaleY: [0.94, 1], duration: 260, easing: 'easeOutBack' })
  }, [showForm])

  const handleDeduplicate = async () => {
    if (!confirm('¿Eliminar actuadores duplicados? Se conservará el de mayor ID por cada tipo+GPIO+invernadero.')) return
    setDeduplicating(true)
    try {
      const data = await actuatorRepository.list(null)
      const all  = data.actuators || []
      const groups = new Map<string, ActuatorDto[]>()
      for (const a of all) {
        const key = `${a.type ?? ''}|${a.gpioPin ?? ''}|${a.greenhouseId ?? ''}`
        if (!groups.has(key)) groups.set(key, [])
        groups.get(key)!.push(a)
      }
      let deleted = 0
      for (const [, group] of groups) {
        if (group.length <= 1) continue
        group.sort((a, b) => b.id - a.id)  // keep highest id
        for (let i = 1; i < group.length; i++) {
          await actuatorRepository.remove(group[i].id)
          deleted++
        }
      }
      alert(`Listo: se eliminaron ${deleted} duplicados.`)
      loadActuators()
    } catch (err) { alert('Error: ' + (err as Error).message) }
    setDeduplicating(false)
  }

  const resetForm = () => {
    setForm({ name: '', type: 'PUMP', greenhouseId: '', gpioPin: '', activeLow: true })
    setEditingId(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const payload: Partial<ActuatorDto> = {
        ...form,
        gpioPin:      form.gpioPin !== '' ? parseInt(String(form.gpioPin)) : null,
        greenhouseId: form.greenhouseId !== '' ? parseInt(String(form.greenhouseId)) : undefined,
        status: 'OFF',
      } as Partial<ActuatorDto>
      if (editingId) await actuatorRepository.update(editingId, payload)
      else           await actuatorRepository.create(payload)
      setShowForm(false); resetForm(); loadActuators()
    } catch (err) { alert('Error: ' + (err as Error).message) }
  }

  const handleEdit = (a: ActuatorDto) => {
    setEditingId(a.id)
    const t = a.type || 'PUMP'
    setForm({ name: a.name || '', type: t, greenhouseId: a.greenhouseId || '', gpioPin: a.gpioPin != null ? a.gpioPin : '', activeLow: a.activeLow || RELAY_TYPES.has(t) })
    setShowForm(true)
  }

  const handleDelete = async (id: number, name: string) => {
    if (confirm(`¿Eliminar "${name}"?`)) {
      try { await actuatorRepository.remove(id); loadActuators() }
      catch (err) { alert('Error: ' + (err as Error).message) }
    }
  }

  const toggleStatus = async (id: number, currentStatus: boolean | string | undefined) => {
    try {
      const newStatus = currentStatus === true || currentStatus === 'ON' ? 'OFF' : 'ON'
      await actuatorRepository.update(id, { status: newStatus })
      loadActuators()
    } catch (err) { alert('Error: ' + (err as Error).message) }
  }

  return (
    <div ref={revealRef} className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className="section-title">Actuadores</h2>
          <p className="section-subtitle">Control y automatización de dispositivos</p>
        </div>
        <div className="flex gap-2 items-center flex-wrap">
          <select value={filterGhId} onChange={e => setFilterGhId(e.target.value)} className="input-field py-2 text-sm">
            <option value="">Todos los invernaderos</option>
            {greenhouses.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
          {allowedGreenhouseIds === null && (
            <button
              onClick={handleDeduplicate}
              disabled={deduplicating}
              className="btn-secondary px-4 py-2 text-sm disabled:opacity-60">
              <RefreshCw size={14} className={deduplicating ? 'animate-spin' : ''} />
              {deduplicating ? 'Limpiando…' : 'Deduplicar'}
            </button>
          )}
          {!showForm && (
            <button onClick={() => { setShowForm(true); resetForm() }} className="btn-primary px-4 py-2 text-sm">
              <Plus size={14} /> Nuevo actuador
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="alert-danger">
          <Zap size={14} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Form */}
      {showForm && (
        <form ref={formRef} onSubmit={handleSubmit} className="card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold" style={{ color: '#e2ffe9' }}>{editingId ? 'Editar Actuador' : 'Nuevo Actuador'}</h3>
            <button type="button" onClick={() => { setShowForm(false); resetForm() }}
              className="p-1.5 rounded-lg hover:bg-[rgba(74,222,128,0.08)] transition-colors" style={{ color: 'rgba(255,255,255,0.35)' }}>
              <X size={16} />
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: 'rgba(255,255,255,0.35)' }}>Nombre *</label>
              <input type="text" placeholder="Bomba de riego, Extractor 1..." value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                className="input-field" required />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: 'rgba(255,255,255,0.35)' }}>Tipo *</label>
              <select value={form.type} onChange={e => {
                const t = e.target.value
                setForm({ ...form, type: t, activeLow: RELAY_TYPES.has(t) ? true : form.activeLow })
              }} className="input-field">
                {Object.entries(TYPE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: 'rgba(255,255,255,0.35)' }}>Invernadero</label>
              <select value={form.greenhouseId} onChange={e => setForm({ ...form, greenhouseId: e.target.value })} className="input-field">
                <option value="">Seleccionar...</option>
                {greenhouses.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: 'rgba(255,255,255,0.35)' }}>GPIO pin</label>
              <input type="number" placeholder="ej: 26" value={form.gpioPin}
                onChange={e => setForm({ ...form, gpioPin: e.target.value })} className="input-field" />
            </div>
            <div className="flex items-end pb-2">
              <label className="flex items-center gap-2.5 text-sm cursor-pointer select-none" style={{ color: 'rgba(255,255,255,0.7)' }}>
                <input type="checkbox" checked={form.activeLow}
                  onChange={e => setForm({ ...form, activeLow: e.target.checked })}
                  className="w-4 h-4 rounded text-green-600 cursor-pointer" />
                Active-Low (HW-383)
              </label>
            </div>
          </div>
          <div className="flex gap-3 pt-1">
            <button type="submit" className="flex-1 btn-primary py-2.5 text-sm">
              {editingId ? 'Actualizar' : 'Crear actuador'}
            </button>
            <button type="button" onClick={() => { setShowForm(false); resetForm() }} className="flex-1 btn-secondary py-2.5 text-sm">
              Cancelar
            </button>
          </div>
        </form>
      )}

      {/* List */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => <div key={i} className="skeleton h-24 rounded-3xl" />)}
        </div>
      ) : actuators.length === 0 ? (
        <div className="empty-state card p-10">
          <Zap size={40} className="empty-state-icon" />
          <p className="empty-state-title">No hay actuadores{filterGhId ? ' en este invernadero' : ''}</p>
          <p className="empty-state-sub">Crea un actuador para controlarlo desde el dashboard.</p>
          <button onClick={() => { setShowForm(true); resetForm() }} className="btn-primary px-4 py-2 text-sm mt-4">
            <Plus size={14} /> Nuevo actuador
          </button>
        </div>
      ) : (
        <div ref={listRef} className="space-y-3">
          {actuators.map(a => {
            const label   = TYPE_LABEL[a.type || ''] || (a.type || 'Actuador')
            const isOn    = a.status === true || (a.status as unknown as string) === 'ON'
            const gh      = greenhouses.find(g => g.id === a.greenhouseId)
            const esp32gh = a.deviceSource ? greenhouses.find(g => g.deviceId && g.deviceId === a.deviceSource) : null
            return (
              <div key={a.id}
                className={`card p-4 transition-all duration-200 ${isOn ? 'ring-1 ring-green-500/30 bg-green-500/5' : ''}`}>
                <div className="flex items-center gap-4">
                  {/* Icon */}
                  <div className="p-3 rounded-2xl shrink-0" style={{ background: isOn ? 'rgba(74,222,128,0.1)' : 'rgba(255,255,255,0.06)' }}>
                    <Zap size={18} className={isOn ? 'text-green-600' : 'text-gray-400'} />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-sm" style={{ color: '#e2ffe9' }}>{a.name || label}</h3>
                      <span className={isOn ? 'badge-green' : 'badge-gray'}>{isOn ? 'Encendido' : 'Apagado'}</span>
                    </div>
                    <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>{label}</p>
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {gh && (
                        <span className="badge-teal text-[10px]">
                          <Zap size={8} className="inline mr-0.5" />{gh.name}
                        </span>
                      )}
                      {a.gpioPin != null && <span className="badge-yellow">GPIO {a.gpioPin}</span>}
                      {a.activeLow       && <span className="badge-yellow">ActiveLow</span>}
                      {a.deviceSource && (
                        <span className={esp32gh ? 'badge-green text-[10px]' : 'badge-purple font-mono text-[10px]'}>
                          <Wifi size={8} className="inline mr-0.5" />
                          {esp32gh ? `ESP32 · ${esp32gh.name}` : a.deviceSource}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => toggleStatus(a.id, a.status)}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                        isOn
                          ? 'hover:bg-[rgba(74,222,128,0.15)]'
                          : 'hover:bg-[rgba(74,222,128,0.08)]'
                      }`}
                      style={isOn
                        ? { background: 'rgba(74,222,128,0.1)', color: '#4ade80' }
                        : { background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)' }}
                    >
                      {isOn ? <PowerOff size={13} /> : <Power size={13} />}
                      {isOn ? 'Apagar' : 'Encender'}
                    </button>
                    <button onClick={() => handleEdit(a)}
                      className="p-2 rounded-xl hover:bg-[rgba(34,211,238,0.1)] text-blue-400 hover:text-blue-300 transition-colors">
                      <Edit2 size={14} />
                    </button>
                    <button onClick={() => handleDelete(a.id, a.name)}
                      className="p-2 rounded-xl hover:bg-red-50 text-red-400 hover:text-red-600 transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
