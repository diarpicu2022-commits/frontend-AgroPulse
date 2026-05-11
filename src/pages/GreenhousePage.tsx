import { useState, useEffect, useRef } from 'react'
import { Building2, UserPlus, Cpu, Zap, ChevronDown, ChevronUp, Wifi, Loader2 } from 'lucide-react'
import anime from 'animejs'
import { useAuth, saveAccess, readAccess, saveAccessByEmail, readAccessByEmail } from '../context/AuthContext'
import { greenhouseRepository, sensorRepository, actuatorRepository, deviceRepository } from '../repositories'
import { userRepository } from '../repositories'
import type {
  GreenhouseDto, UserDto, DeviceConfigDto, GpioOptionsDto,
  SensorType, Protocol, ActuatorType,
} from '../types'

const SENSOR_TYPES: SensorType[]    = ['TEMPERATURE', 'TEMPERATURE_INTERNAL', 'TEMPERATURE_EXTERNAL', 'HUMIDITY', 'SOIL_MOISTURE', 'LIGHT', 'CO2', 'PRESSURE']
const PROTOCOLS: Protocol[]         = ['DHT22', 'DHT11', 'ADC', 'ANALOG', 'I2C', 'DIGITAL', 'ONE_WIRE']
const ACTUATOR_TYPES: ActuatorType[] = ['PUMP', 'FAN', 'LED', 'SERVO', 'RELAY', 'MOTOR']

interface SensorForm  { name: string; type: string; protocol: string; gpioPin: string }
interface ActuatorForm { name: string; type: string; gpioPin: string; activeLow: boolean }

type GhTab = 'users' | 'device'

// ── GPIO map constants (matches DeviceController) ─────────────────────────────
const GPIO_RESERVED  = [0, 1, 2, 3, 6, 7, 8, 9, 10, 11, 21, 22]
const GPIO_INPUT     = [4, 5, 12, 13, 14, 15, 16, 17, 18, 19, 23, 25, 26, 27, 32, 33, 34, 35, 36, 39]
const GPIO_OUTPUT    = [4, 5, 12, 13, 14, 15, 16, 17, 18, 19, 23, 25, 26, 27, 32, 33]
const ALL_GPIOS      = Array.from({ length: 40 }, (_, i) => i)

export default function GreenhousePage() {
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin' || user?.role === 'ADMIN'

  const [greenhouses,       setGreenhouses]       = useState<GreenhouseDto[]>([])
  const [loading,           setLoading]           = useState(true)
  const [showForm,          setShowForm]          = useState(false)
  const [form,              setForm]              = useState({ name: '', location: '', description: '' })
  const [expandedId,        setExpandedId]        = useState<number | null>(null)
  const [ghTab,             setGhTab]             = useState<Record<number, GhTab>>({})
  const [ghUsers,           setGhUsers]           = useState<Record<number, UserDto[]>>({})
  const [allUsers,          setAllUsers]          = useState<UserDto[]>([])
  const [assignUserId,      setAssignUserId]      = useState('')
  const [assigning,         setAssigning]         = useState(false)
  const [deviceConfig,      setDeviceConfig]      = useState<Record<number, DeviceConfigDto>>({})
  const [gpioOpts,          setGpioOpts]          = useState<Record<number, GpioOptionsDto>>({})
  const [sensorForm,        setSensorForm]        = useState<SensorForm>({ name: '', type: 'TEMPERATURE', protocol: 'DHT22', gpioPin: '' })
  const [actuatorForm,      setActuatorForm]      = useState<ActuatorForm>({ name: '', type: 'PUMP', gpioPin: '', activeLow: true })
  const [showSensorForm,    setShowSensorForm]    = useState<Record<number, boolean>>({})
  const [showActuatorForm,  setShowActuatorForm]  = useState<Record<number, boolean>>({})
  const [showGpioMap,       setShowGpioMap]       = useState<Record<number, boolean>>({})
  const [error,             setError]             = useState<string | null>(null)

  const cardsRef = useRef<HTMLDivElement>(null)
  const formRef  = useRef<HTMLFormElement>(null)

  useEffect(() => {
    loadGreenhouses()
    if (isAdmin) userRepository.listAll(user?.email || '').then(d => {
      const list = Array.isArray(d) ? (d as UserDto[]) : (d.users ?? [])
      setAllUsers(list)
    }).catch(() => {})
  }, [])

  // Animate cards when greenhouses load
  useEffect(() => {
    if (!loading && greenhouses.length > 0 && cardsRef.current) {
      anime({
        targets: Array.from(cardsRef.current.children) as Element[],
        opacity: [0, 1],
        translateY: [24, 0],
        delay: anime.stagger(80),
        duration: 450,
        easing: 'easeOutCubic',
      })
    }
  }, [loading, greenhouses.length])

  // Animate form in when shown
  useEffect(() => {
    if (showForm && formRef.current) {
      anime({
        targets: formRef.current,
        opacity: [0, 1],
        scaleY: [0.92, 1],
        duration: 320,
        easing: 'easeOutBack',
      })
    }
  }, [showForm])

  const loadGreenhouses = async () => {
    try {
      const data = await greenhouseRepository.list()
      setGreenhouses(data.greenhouses ?? [])
      setError(null)
    } catch (err) { setError((err as Error).message) }
    setLoading(false)
  }

  const loadGhUsers = async (id: number) => {
    try {
      const data = await greenhouseRepository.listUsers(id)
      // Handle both { users: [...] } and plain array responses from different backends
      const list = Array.isArray(data) ? (data as UserDto[]) : (data.users ?? [])
      setGhUsers(prev => ({ ...prev, [id]: list }))
    } catch (err) { setError((err as Error).message) }
  }

  const loadDeviceConfig = async (id: number) => {
    const empty: DeviceConfigDto         = { sensors: [], actuators: [] }
    const emptyGpios: GpioOptionsDto     = { usedGpios: [], availableForSensors: [], availableForActuators: [] }
    try {
      const [cfg, gpios] = await Promise.all([
        deviceRepository.getConfig(id).catch((): DeviceConfigDto => empty),
        deviceRepository.getGpios(id).catch((): GpioOptionsDto => emptyGpios),
      ])
      setDeviceConfig(prev => ({ ...prev, [id]: cfg }))
      setGpioOpts(prev => ({ ...prev, [id]: gpios }))
    } catch {
      setDeviceConfig(prev => ({ ...prev, [id]: empty }))
      setGpioOpts(prev => ({ ...prev, [id]: emptyGpios }))
    }
  }

  const toggleTab = (id: number, tab: GhTab) => {
    if (expandedId === id && ghTab[id] === tab) { setExpandedId(null); return }
    setExpandedId(id)
    setGhTab(prev => ({ ...prev, [id]: tab }))
    if (tab === 'users')  loadGhUsers(id)
    if (tab === 'device') loadDeviceConfig(id)

    // Animate expanded panel
    setTimeout(() => {
      const el = document.getElementById(`gh-panel-${id}`)
      if (el) anime({ targets: el, opacity: [0, 1], translateY: [-10, 0], duration: 280, easing: 'easeOutCubic' })
    }, 10)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await greenhouseRepository.create(form)
      setShowForm(false); setForm({ name: '', location: '', description: '' })
      loadGreenhouses()
    } catch (err) { alert('Error: ' + (err as Error).message) }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('¿Eliminar invernadero?')) return
    try { await greenhouseRepository.remove(id); loadGreenhouses() }
    catch (err) { alert('Error: ' + (err as Error).message) }
  }

  const handleAssign = async (ghId: number) => {
    if (!assignUserId || assigning) return
    const uid = parseInt(assignUserId)
    const targetUser = allUsers.find(u => u.id === uid)
    if (!targetUser) return
    setAssigning(true)
    try {
      await greenhouseRepository.assignUser(ghId, uid)
      // Optimistic update — add user to local list immediately (backend GET may lag)
      setGhUsers(prev => {
        const current = prev[ghId] ?? []
        if (current.find(u => u.id === uid)) return prev
        return { ...prev, [ghId]: [...current, targetUser] }
      })
      // Sync to localStorage by both ID and email for robust access control
      const currentAccess = readAccess(uid)
      if (!currentAccess.includes(ghId)) saveAccess(uid, [...currentAccess, ghId])
      if (targetUser.email) {
        const currentByEmail = readAccessByEmail(targetUser.email)
        if (!currentByEmail.includes(ghId)) saveAccessByEmail(targetUser.email, [...currentByEmail, ghId])
      }
      setAssignUserId('')
    } catch (err) { alert('Error asignando usuario: ' + (err as Error).message) }
    finally { setAssigning(false) }
  }

  const handleRemoveUser = async (ghId: number, userId: number) => {
    const removedUser = (ghUsers[ghId] ?? []).find(u => u.id === userId)
    // Optimistic removal
    setGhUsers(prev => ({ ...prev, [ghId]: (prev[ghId] ?? []).filter(u => u.id !== userId) }))
    saveAccess(userId, readAccess(userId).filter(id => id !== ghId))
    if (removedUser?.email) saveAccessByEmail(removedUser.email, readAccessByEmail(removedUser.email).filter(id => id !== ghId))
    try {
      await greenhouseRepository.removeUser(ghId, userId)
    } catch (err) {
      await loadGhUsers(ghId)
      alert('Error removiendo usuario: ' + (err as Error).message)
    }
  }

  const handleAddSensor = async (ghId: number) => {
    try {
      await sensorRepository.create({
        name:         sensorForm.name,
        type:         sensorForm.type as SensorType,
        protocol:     sensorForm.protocol as Protocol,
        gpioPin:      sensorForm.gpioPin ? parseInt(sensorForm.gpioPin) : null,
        greenhouseId: ghId,
        active:       true,
      })
      setSensorForm({ name: '', type: 'TEMPERATURE', protocol: 'DHT22', gpioPin: '' })
      setShowSensorForm(prev => ({ ...prev, [ghId]: false }))
      loadDeviceConfig(ghId)
    } catch (err) { alert('Error: ' + (err as Error).message) }
  }

  const handleAddActuator = async (ghId: number) => {
    try {
      await actuatorRepository.create({
        name:         actuatorForm.name,
        type:         actuatorForm.type as ActuatorType,
        gpioPin:      actuatorForm.gpioPin ? parseInt(actuatorForm.gpioPin) : null,
        activeLow:    actuatorForm.activeLow,
        greenhouseId: ghId,
        active:       true,
      })
      setActuatorForm({ name: '', type: 'PUMP', gpioPin: '', activeLow: true })
      setShowActuatorForm(prev => ({ ...prev, [ghId]: false }))
      loadDeviceConfig(ghId)
    } catch (err) { alert('Error: ' + (err as Error).message) }
  }

  // ── GPIO Map pin color helper ──────────────────────────────────────────────
  const getPinStyle = (pin: number, usedGpios: number[]) => {
    if (GPIO_RESERVED.includes(pin)) return 'bg-red-200 text-red-800 border-red-300'
    if (usedGpios.includes(pin))     return 'bg-amber-300 text-amber-900 border-amber-400'
    if (!GPIO_INPUT.includes(pin) && !GPIO_OUTPUT.includes(pin))
                                     return 'bg-gray-200 text-gray-500 border-gray-300'
    return 'bg-green-200 text-green-800 border-green-300'
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 font-heading">🏡 Invernaderos</h2>
          <p className="text-sm text-gray-500 mt-0.5">
            {isAdmin ? 'Gestiona invernaderos, dispositivos y asigna usuarios' : 'Tus invernaderos asignados'}
          </p>
        </div>
        {isAdmin && (
          <button onClick={() => setShowForm(!showForm)}
            className="btn-primary px-4 py-2.5 text-sm">
            {showForm ? 'Cancelar' : '+ Nuevo Invernadero'}
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">⚠️ {error}</div>
      )}

      {/* Create form */}
      {showForm && isAdmin && (
        <form ref={formRef} onSubmit={handleSubmit}
          className="card border-2 border-green-200 p-5 space-y-3">
          <input type="text" placeholder="Nombre del invernadero *" value={form.name}
            onChange={e => setForm({ ...form, name: e.target.value })}
            className="input-field" required />
          <input type="text" placeholder="Ubicación / Región" value={form.location}
            onChange={e => setForm({ ...form, location: e.target.value })}
            className="input-field" />
          <textarea placeholder="Descripción" value={form.description}
            onChange={e => setForm({ ...form, description: e.target.value })}
            className="input-field resize-none" rows={2} />
          <button type="submit" className="w-full btn-primary py-2.5 text-sm font-bold">
            Guardar Invernadero
          </button>
        </form>
      )}

      {/* List */}
      {loading ? (
        <div className="text-center py-12">
          <div className="text-4xl animate-bounce">🏡</div>
          <p className="text-gray-500 mt-2">Cargando...</p>
        </div>
      ) : greenhouses.length === 0 ? (
        <div className="card p-12 text-center">
          <Building2 size={48} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500 font-medium">No hay invernaderos</p>
          {isAdmin && (
            <button onClick={() => setShowForm(true)} className="mt-3 text-green-600 text-sm font-medium hover:underline">
              Crear el primero
            </button>
          )}
        </div>
      ) : (
        <div ref={cardsRef} className="space-y-3">
          {greenhouses.map(g => {
            const usedGpios = gpioOpts[g.id]?.usedGpios ?? []
            return (
              <div key={g.id} className="card overflow-hidden">

                {/* Card header */}
                <div className="p-4 flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-lg">🌿</span>
                      <h3 className="font-bold text-gray-800">{g.name}</h3>
                      <span className={g.active ? 'badge-green' : 'badge-gray'}>
                        {g.active ? 'Activo' : 'Inactivo'}
                      </span>
                    </div>
                    {g.location && <p className="text-sm text-gray-500 mt-0.5">📍 {g.location}</p>}
                    <p className="text-xs text-gray-400 font-mono">
                      ID: <span className="font-bold text-gray-600">{g.id}</span>
                    </p>
                    {g.description && <p className="text-xs text-gray-400 mt-1">{g.description}</p>}
                    {g.deviceId && (
                      <p className="text-xs mt-1 flex items-center gap-1 text-purple-600">
                        <Wifi size={11} /> ESP32: <span className="font-mono">{g.deviceId}</span>
                      </p>
                    )}
                  </div>

                  <div className="flex gap-1.5 shrink-0 flex-wrap justify-end">
                    {isAdmin && (
                      <button onClick={() => toggleTab(g.id, 'users')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1 ${
                          expandedId === g.id && ghTab[g.id] === 'users'
                            ? 'bg-blue-600 text-white' : 'bg-blue-50 hover:bg-blue-100 text-blue-600'
                        }`}>
                        <UserPlus size={12} /> Usuarios
                      </button>
                    )}
                    {isAdmin && (
                      <button onClick={() => toggleTab(g.id, 'device')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1 ${
                          expandedId === g.id && ghTab[g.id] === 'device'
                            ? 'bg-purple-600 text-white' : 'bg-purple-50 hover:bg-purple-100 text-purple-600'
                        }`}>
                        <Cpu size={12} /> Dispositivo
                      </button>
                    )}
                    {isAdmin && (
                      <button onClick={() => handleDelete(g.id)}
                        className="text-red-400 hover:text-red-600 text-xs px-2 py-1.5 rounded-lg hover:bg-red-50 transition-colors">
                        Eliminar
                      </button>
                    )}
                  </div>
                </div>

                {/* Expanded panel */}
                {isAdmin && expandedId === g.id && (
                  <div id={`gh-panel-${g.id}`} className="border-t border-gray-100 bg-gray-50/80 p-4">

                    {/* ── Users tab ── */}
                    {ghTab[g.id] === 'users' && (
                      <div className="space-y-3">
                        <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">👥 Usuarios asignados</p>
                        <div className="flex gap-2">
                          <select value={assignUserId} onChange={e => setAssignUserId(e.target.value)}
                            className="flex-1 border-2 border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-blue-500 focus:outline-none">
                            <option value="">Seleccionar usuario...</option>
                            {allUsers.filter(u => !(ghUsers[g.id] ?? []).find(gu => gu.id === u.id)).map(u => (
                              <option key={u.id} value={u.id}>{u.fullName || u.username} ({u.role})</option>
                            ))}
                          </select>
                          <button onClick={() => handleAssign(g.id)}
                            disabled={!assignUserId || assigning}
                            className="bg-blue-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed">
                            {assigning
                              ? <><Loader2 size={14} className="animate-spin" /> Asignando…</>
                              : <><UserPlus size={14} /> Asignar</>
                            }
                          </button>
                        </div>
                        {(ghUsers[g.id] === undefined)
                          ? <p className="text-xs text-gray-400 py-2">Cargando usuarios…</p>
                          : (ghUsers[g.id] ?? []).length === 0
                          ? <p className="text-xs text-gray-400 py-2">Sin usuarios asignados aún</p>
                          : (
                            <div className="space-y-2">
                              {(ghUsers[g.id] ?? []).map(u => (
                                <div key={u.id} className="flex items-center justify-between bg-white rounded-lg px-3 py-2 shadow-sm">
                                  <div className="flex items-center gap-2">
                                    <div className="w-7 h-7 bg-green-100 rounded-full flex items-center justify-center text-xs font-bold text-green-700">
                                      {(u.fullName || u.username || '?')[0].toUpperCase()}
                                    </div>
                                    <div>
                                      <p className="text-xs font-medium text-gray-800">{u.fullName || u.username}</p>
                                      <p className="text-[10px] text-gray-400">{u.role}</p>
                                    </div>
                                  </div>
                                  <button onClick={() => handleRemoveUser(g.id, u.id)}
                                    className="text-red-400 hover:text-red-600 text-xs px-2 py-1 rounded hover:bg-red-50 transition-colors">
                                    Quitar
                                  </button>
                                </div>
                              ))}
                            </div>
                          )
                        }
                      </div>
                    )}

                    {/* ── Device tab ── */}
                    {ghTab[g.id] === 'device' && (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">⚙️ Configuración ESP32</p>
                          {deviceConfig[g.id]?.deviceId && (
                            <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-mono">
                              {deviceConfig[g.id].deviceId}
                            </span>
                          )}
                        </div>

                        {/* GPIO visual map */}
                        <div className="bg-white rounded-xl border border-gray-200 p-3">
                          <button
                            onClick={() => setShowGpioMap(prev => ({ ...prev, [g.id]: !prev[g.id] }))}
                            className="w-full flex items-center justify-between text-xs font-semibold text-gray-700 mb-1"
                          >
                            <span>🗺️ Mapa de pines GPIO ESP32</span>
                            {showGpioMap[g.id] ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                          </button>
                          {showGpioMap[g.id] && (
                            <div className="mt-2">
                              <div className="flex gap-3 text-[10px] mb-2 flex-wrap">
                                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-200 border border-green-300 inline-block" /> Libre</span>
                                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-amber-300 border border-amber-400 inline-block" /> En uso</span>
                                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-200 border border-red-300 inline-block" /> Reservado</span>
                                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-gray-200 border border-gray-300 inline-block" /> No disponible</span>
                              </div>
                              <div className="grid grid-cols-8 sm:grid-cols-10 gap-1">
                                {ALL_GPIOS.map(pin => (
                                  <div key={pin}
                                    className={`text-[10px] font-mono px-1 py-1 rounded border text-center leading-tight ${getPinStyle(pin, usedGpios)}`}
                                    title={
                                      GPIO_RESERVED.includes(pin) ? `GPIO ${pin}: Sistema/Reservado` :
                                      usedGpios.includes(pin)     ? `GPIO ${pin}: En uso` :
                                      GPIO_INPUT.includes(pin)    ? `GPIO ${pin}: Disponible` :
                                      `GPIO ${pin}: No recomendado`
                                    }
                                  >
                                    {pin}
                                  </div>
                                ))}
                              </div>
                              <div className="mt-2 text-[10px] text-gray-500 space-y-0.5">
                                <p>📥 Sensores: GPIOs {GPIO_INPUT.join(', ')}</p>
                                <p>📤 Actuadores: GPIOs {GPIO_OUTPUT.join(', ')}</p>
                                <p>🔒 Reservados (sistema): {GPIO_RESERVED.join(', ')}</p>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Sensors section */}
                        <div className="bg-white rounded-xl border border-gray-200 p-3 space-y-2">
                          <div className="flex items-center justify-between">
                            <p className="text-xs font-semibold text-gray-700">
                              🌡 Sensores ({(deviceConfig[g.id]?.sensors ?? []).length})
                            </p>
                            <button
                              onClick={() => setShowSensorForm(prev => ({ ...prev, [g.id]: !prev[g.id] }))}
                              className="text-xs bg-green-100 hover:bg-green-200 text-green-700 px-2 py-1 rounded-lg font-medium transition-colors">
                              {showSensorForm[g.id] ? 'Cancelar' : '+ Sensor'}
                            </button>
                          </div>

                          {(deviceConfig[g.id]?.sensors ?? []).map(s => (
                            <div key={s.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2 text-xs">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-medium text-gray-800">{s.name}</span>
                                <span className="badge-blue">{s.type}</span>
                                {s.protocol && <span className="badge-gray">{s.protocol}</span>}
                                {s.gpioPin != null && <span className="badge-yellow">GPIO {s.gpioPin}</span>}
                                {s.deviceSource && <span className="badge-purple font-mono">{s.deviceSource}</span>}
                              </div>
                              <button
                                onClick={() => sensorRepository.remove(s.id).then(() => loadDeviceConfig(g.id)).catch(e => alert(e.message))}
                                className="text-red-400 hover:text-red-600 transition-colors ml-2 shrink-0">✕</button>
                            </div>
                          ))}

                          {(deviceConfig[g.id]?.sensors ?? []).length === 0 && !showSensorForm[g.id] && (
                            <p className="text-xs text-gray-400 py-1">Sin sensores configurados</p>
                          )}

                          {showSensorForm[g.id] && (
                            <div className="space-y-2 pt-2 border-t border-gray-100">
                              <input placeholder="Nombre del sensor *" value={sensorForm.name}
                                onChange={e => setSensorForm(f => ({ ...f, name: e.target.value }))}
                                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs focus:border-green-500 focus:outline-none" />
                              <div className="grid grid-cols-3 gap-2">
                                <select value={sensorForm.type} onChange={e => setSensorForm(f => ({ ...f, type: e.target.value }))}
                                  className="border border-gray-200 rounded-lg px-2 py-2 text-xs focus:border-green-500 focus:outline-none">
                                  {SENSOR_TYPES.map(t => <option key={t}>{t}</option>)}
                                </select>
                                <select value={sensorForm.protocol} onChange={e => setSensorForm(f => ({ ...f, protocol: e.target.value }))}
                                  className="border border-gray-200 rounded-lg px-2 py-2 text-xs focus:border-green-500 focus:outline-none">
                                  {PROTOCOLS.map(p => <option key={p}>{p}</option>)}
                                </select>
                                <select value={sensorForm.gpioPin} onChange={e => setSensorForm(f => ({ ...f, gpioPin: e.target.value }))}
                                  className="border border-gray-200 rounded-lg px-2 py-2 text-xs focus:border-green-500 focus:outline-none">
                                  <option value="">GPIO</option>
                                  {(gpioOpts[g.id]?.availableForSensors ?? []).map(p => (
                                    <option key={p} value={p}>GPIO {p}</option>
                                  ))}
                                </select>
                              </div>
                              <button onClick={() => handleAddSensor(g.id)} disabled={!sensorForm.name}
                                className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white py-2 rounded-lg text-xs font-medium transition-colors">
                                Guardar sensor
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Actuators section */}
                        <div className="bg-white rounded-xl border border-gray-200 p-3 space-y-2">
                          <div className="flex items-center justify-between">
                            <p className="text-xs font-semibold text-gray-700">
                              <Zap size={12} className="inline mr-1" />Actuadores ({(deviceConfig[g.id]?.actuators ?? []).length})
                            </p>
                            <button
                              onClick={() => setShowActuatorForm(prev => ({ ...prev, [g.id]: !prev[g.id] }))}
                              className="text-xs bg-purple-100 hover:bg-purple-200 text-purple-700 px-2 py-1 rounded-lg font-medium transition-colors">
                              {showActuatorForm[g.id] ? 'Cancelar' : '+ Actuador'}
                            </button>
                          </div>

                          {(deviceConfig[g.id]?.actuators ?? []).map(a => (
                            <div key={a.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2 text-xs">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-medium text-gray-800">{a.name}</span>
                                {a.type && <span className="badge-purple">{a.type}</span>}
                                {a.gpioPin != null && <span className="badge-yellow">GPIO {a.gpioPin}</span>}
                                {a.activeLow && <span className="badge-yellow">ActiveLow</span>}
                                {a.deviceSource && <span className="badge-purple font-mono">{a.deviceSource}</span>}
                              </div>
                              <button
                                onClick={() => actuatorRepository.remove(a.id).then(() => loadDeviceConfig(g.id)).catch(e => alert((e as Error).message))}
                                className="text-red-400 hover:text-red-600 transition-colors ml-2 shrink-0">✕</button>
                            </div>
                          ))}

                          {(deviceConfig[g.id]?.actuators ?? []).length === 0 && !showActuatorForm[g.id] && (
                            <p className="text-xs text-gray-400 py-1">Sin actuadores configurados</p>
                          )}

                          {showActuatorForm[g.id] && (
                            <div className="space-y-2 pt-2 border-t border-gray-100">
                              <input placeholder="Nombre del actuador *" value={actuatorForm.name}
                                onChange={e => setActuatorForm(f => ({ ...f, name: e.target.value }))}
                                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs focus:border-purple-500 focus:outline-none" />
                              <div className="grid grid-cols-2 gap-2">
                                <select value={actuatorForm.type} onChange={e => setActuatorForm(f => ({ ...f, type: e.target.value }))}
                                  className="border border-gray-200 rounded-lg px-2 py-2 text-xs focus:border-purple-500 focus:outline-none">
                                  {ACTUATOR_TYPES.map(t => <option key={t}>{t}</option>)}
                                </select>
                                <select value={actuatorForm.gpioPin} onChange={e => setActuatorForm(f => ({ ...f, gpioPin: e.target.value }))}
                                  className="border border-gray-200 rounded-lg px-2 py-2 text-xs focus:border-purple-500 focus:outline-none">
                                  <option value="">GPIO</option>
                                  {(gpioOpts[g.id]?.availableForActuators ?? []).map(p => (
                                    <option key={p} value={p}>GPIO {p}</option>
                                  ))}
                                </select>
                              </div>
                              <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer">
                                <input type="checkbox" checked={actuatorForm.activeLow}
                                  onChange={e => setActuatorForm(f => ({ ...f, activeLow: e.target.checked }))} className="rounded" />
                                Active-Low (relés HW-383)
                              </label>
                              <button onClick={() => handleAddActuator(g.id)} disabled={!actuatorForm.name}
                                className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white py-2 rounded-lg text-xs font-medium transition-colors">
                                Guardar actuador
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
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
