import { useState, useEffect } from 'react'
import { Building2, UserPlus, Cpu } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'

const SENSOR_TYPES   = ['TEMPERATURE','HUMIDITY','SOIL_MOISTURE','LIGHT','CO2','PRESSURE']
const PROTOCOLS      = ['DHT22','DHT11','ADC','ANALOG','I2C','DIGITAL','ONE_WIRE']
const ACTUATOR_TYPES = ['PUMP','FAN','LED','SERVO','RELAY','MOTOR']

export default function GreenhousePage() {
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin' || user?.role === 'ADMIN'

  const [greenhouses, setGreenhouses]           = useState([])
  const [loading, setLoading]                   = useState(true)
  const [showForm, setShowForm]                 = useState(false)
  const [form, setForm]                         = useState({ name: '', location: '', description: '' })
  const [expandedId, setExpandedId]             = useState(null)
  const [ghTab, setGhTab]                       = useState({})
  const [ghUsers, setGhUsers]                   = useState({})
  const [allUsers, setAllUsers]                 = useState([])
  const [assignUserId, setAssignUserId]         = useState('')
  const [deviceConfig, setDeviceConfig]         = useState({})
  const [gpioOpts, setGpioOpts]                 = useState({})
  const [sensorForm, setSensorForm]             = useState({ name: '', type: 'TEMPERATURE', protocol: 'DHT22', gpioPin: '' })
  const [actuatorForm, setActuatorForm]         = useState({ name: '', type: 'PUMP', gpioPin: '', activeLow: true })
  const [showSensorForm, setShowSensorForm]     = useState({})
  const [showActuatorForm, setShowActuatorForm] = useState({})
  const [error, setError]                       = useState(null)

  useEffect(() => {
    loadGreenhouses()
    if (isAdmin) api.users.list().then(d => setAllUsers(d.users || [])).catch(() => {})
  }, [])

  const loadGreenhouses = async () => {
    try {
      const data = await api.greenhouses.list()
      setGreenhouses(data.greenhouses || [])
      setError(null)
    } catch (err) { setError(err.message) }
    setLoading(false)
  }

  const loadGhUsers = async (id) => {
    try {
      const data = await api.greenhouses.listUsers(id)
      setGhUsers(prev => ({ ...prev, [id]: data.users || [] }))
    } catch (err) { setError(err.message) }
  }

  const loadDeviceConfig = async (id) => {
    try {
      const [cfg, gpios] = await Promise.all([api.device.config(id), api.device.gpios(id)])
      setDeviceConfig(prev => ({ ...prev, [id]: cfg }))
      setGpioOpts(prev => ({ ...prev, [id]: gpios }))
    } catch (err) { setError(err.message) }
  }

  const toggleTab = (id, tab) => {
    if (expandedId === id && ghTab[id] === tab) { setExpandedId(null); return }
    setExpandedId(id)
    setGhTab(prev => ({ ...prev, [id]: tab }))
    if (tab === 'users')  loadGhUsers(id)
    if (tab === 'device') loadDeviceConfig(id)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      await api.greenhouses.create(form)
      setShowForm(false)
      setForm({ name: '', location: '', description: '' })
      loadGreenhouses()
    } catch (err) { alert('Error: ' + err.message) }
  }

  const handleDelete = async (id) => {
    if (confirm('¿Eliminar invernadero?')) {
      try { await api.greenhouses.delete(id); loadGreenhouses() }
      catch (err) { alert('Error: ' + err.message) }
    }
  }

  const handleAssign = async (ghId) => {
    if (!assignUserId) return
    try {
      await api.greenhouses.assignUser(ghId, parseInt(assignUserId))
      setAssignUserId('')
      loadGhUsers(ghId)
    } catch (err) { alert('Error asignando usuario') }
  }

  const handleRemoveUser = async (ghId, userId) => {
    try {
      await api.greenhouses.removeUser(ghId, userId)
      loadGhUsers(ghId)
    } catch (err) { alert('Error removiendo usuario') }
  }

  const handleAddSensor = async (ghId) => {
    try {
      await api.sensors.create({
        ...sensorForm,
        gpioPin: sensorForm.gpioPin ? parseInt(sensorForm.gpioPin) : null,
        greenhouseId: ghId,
        active: true,
      })
      setSensorForm({ name: '', type: 'TEMPERATURE', protocol: 'DHT22', gpioPin: '' })
      setShowSensorForm(prev => ({ ...prev, [ghId]: false }))
      loadDeviceConfig(ghId)
    } catch (err) { alert('Error: ' + err.message) }
  }

  const handleDeleteSensor = async (sensorId, ghId) => {
    try {
      await api.sensors.delete(sensorId)
      loadDeviceConfig(ghId)
    } catch (err) { alert('Error: ' + err.message) }
  }

  const handleAddActuator = async (ghId) => {
    try {
      await api.actuators.create({
        ...actuatorForm,
        gpioPin: actuatorForm.gpioPin ? parseInt(actuatorForm.gpioPin) : null,
        greenhouseId: ghId,
        active: true,
      })
      setActuatorForm({ name: '', type: 'PUMP', gpioPin: '', activeLow: true })
      setShowActuatorForm(prev => ({ ...prev, [ghId]: false }))
      loadDeviceConfig(ghId)
    } catch (err) { alert('Error: ' + err.message) }
  }

  const handleDeleteActuator = async (actuatorId, ghId) => {
    try {
      await api.actuators.delete(actuatorId)
      loadDeviceConfig(ghId)
    } catch (err) { alert('Error: ' + err.message) }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">🏡 Invernaderos</h2>
          <p className="text-sm text-gray-500 mt-0.5">{isAdmin ? 'Gestiona invernaderos y asigna usuarios' : 'Tus invernaderos asignados'}</p>
        </div>
        {isAdmin && (
          <button onClick={() => setShowForm(!showForm)}
            className="bg-gradient-to-r from-green-500 to-emerald-500 text-white px-4 py-2.5 rounded-xl text-sm font-medium shadow-md hover:shadow-lg transition-all transform hover:scale-105">
            {showForm ? 'Cancelar' : '+ Nuevo Invernadero'}
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl">
          ⚠️ Error: {error}
        </div>
      )}

      {showForm && isAdmin && (
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-md border-2 border-green-200 p-5 space-y-3">
          <input type="text" placeholder="Nombre del invernadero *" value={form.name}
            onChange={e => setForm({...form, name: e.target.value})}
            className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:border-green-500 focus:outline-none" required />
          <input type="text" placeholder="Ubicación / Región" value={form.location}
            onChange={e => setForm({...form, location: e.target.value})}
            className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:border-green-500 focus:outline-none" />
          <textarea placeholder="Descripción" value={form.description}
            onChange={e => setForm({...form, description: e.target.value})}
            className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:border-green-500 focus:outline-none" rows={2} />
          <button type="submit" className="w-full bg-gradient-to-r from-green-500 to-emerald-500 text-white py-2.5 rounded-xl font-bold">Guardar Invernadero</button>
        </form>
      )}

      {loading ? (
        <div className="text-center py-12"><div className="text-4xl animate-bounce">🏡</div><p className="text-gray-500 mt-2">Cargando...</p></div>
      ) : greenhouses.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center shadow-sm">
          <Building2 size={48} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500 font-medium">No hay invernaderos</p>
          {isAdmin && <button onClick={() => setShowForm(true)} className="mt-3 text-green-600 text-sm font-medium">Crear el primero</button>}
        </div>
      ) : (
        <div className="space-y-3">
          {greenhouses.map(g => (
            <div key={g.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">

              {/* Card header */}
              <div className="p-4 flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">🌿</span>
                    <h3 className="font-bold text-gray-800">{g.name}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${g.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {g.active ? 'Activo' : 'Inactivo'}
                    </span>
                  </div>
                  {g.location && <p className="text-sm text-gray-500 mt-0.5">📍 {g.location}</p>}
                  <p className="text-xs text-gray-400 font-mono">ID invernadero: <span className="font-bold text-gray-600">{g.id}</span></p>
                  {g.description && <p className="text-xs text-gray-400 mt-1">{g.description}</p>}
                </div>
                <div className="flex gap-2 shrink-0 ml-3">
                  {isAdmin && (
                    <button onClick={() => toggleTab(g.id, 'users')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1 ${expandedId === g.id && ghTab[g.id] === 'users' ? 'bg-blue-600 text-white' : 'bg-blue-50 hover:bg-blue-100 text-blue-600'}`}>
                      <UserPlus size={13} /> Usuarios
                    </button>
                  )}
                  {isAdmin && (
                    <button onClick={() => toggleTab(g.id, 'device')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1 ${expandedId === g.id && ghTab[g.id] === 'device' ? 'bg-purple-600 text-white' : 'bg-purple-50 hover:bg-purple-100 text-purple-600'}`}>
                      <Cpu size={13} /> Dispositivo
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
                <div className="border-t border-gray-100 bg-gray-50 p-4">

                  {/* ── Users tab ─────────────────────────────────────── */}
                  {ghTab[g.id] === 'users' && (
                    <div className="space-y-3">
                      <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">👥 Usuarios asignados</p>
                      <div className="flex gap-2">
                        <select value={assignUserId} onChange={e => setAssignUserId(e.target.value)}
                          className="flex-1 border-2 border-gray-200 rounded-lg px-3 py-2 text-sm focus:border-blue-500 focus:outline-none">
                          <option value="">Seleccionar usuario...</option>
                          {allUsers.filter(u => !(ghUsers[g.id] || []).find(gu => gu.id === u.id)).map(u => (
                            <option key={u.id} value={u.id}>{u.fullName || u.username} ({u.role})</option>
                          ))}
                        </select>
                        <button onClick={() => handleAssign(g.id)}
                          className="bg-blue-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors flex items-center gap-1">
                          <UserPlus size={14} /> Asignar
                        </button>
                      </div>
                      {(ghUsers[g.id] || []).length === 0 ? (
                        <p className="text-xs text-gray-400 py-2">Sin usuarios asignados aún</p>
                      ) : (
                        <div className="space-y-2">
                          {(ghUsers[g.id] || []).map(u => (
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
                      )}
                    </div>
                  )}

                  {/* ── Device tab ────────────────────────────────────── */}
                  {ghTab[g.id] === 'device' && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">⚙️ Configuración de dispositivo</p>
                        {deviceConfig[g.id]?.deviceId && (
                          <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-mono">
                            ESP32: {deviceConfig[g.id].deviceId}
                          </span>
                        )}
                      </div>

                      {/* Sensors sub-section */}
                      <div className="bg-white rounded-xl border border-gray-200 p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-semibold text-gray-700">🌡 Sensores ({(deviceConfig[g.id]?.sensors || []).length})</p>
                          <button onClick={() => setShowSensorForm(prev => ({ ...prev, [g.id]: !prev[g.id] }))}
                            className="text-xs bg-green-100 hover:bg-green-200 text-green-700 px-2 py-1 rounded-lg font-medium transition-colors">
                            {showSensorForm[g.id] ? 'Cancelar' : '+ Añadir sensor'}
                          </button>
                        </div>

                        {(deviceConfig[g.id]?.sensors || []).map(s => (
                          <div key={s.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2 text-xs">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-medium text-gray-800">{s.name}</span>
                              <span className="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">{s.type}</span>
                              {s.protocol && <span className="bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded">{s.protocol}</span>}
                              {s.gpioPin != null && <span className="bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded">GPIO {s.gpioPin}</span>}
                              {s.deviceSource && <span className="bg-purple-100 text-purple-600 px-1.5 py-0.5 rounded font-mono">{s.deviceSource}</span>}
                            </div>
                            <button onClick={() => handleDeleteSensor(s.id, g.id)}
                              className="text-red-400 hover:text-red-600 transition-colors ml-2 shrink-0">✕</button>
                          </div>
                        ))}

                        {(deviceConfig[g.id]?.sensors || []).length === 0 && !showSensorForm[g.id] && (
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
                                <option value="">GPIO (opcional)</option>
                                {(gpioOpts[g.id]?.availableForSensors || []).map(p => (
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

                      {/* Actuators sub-section */}
                      <div className="bg-white rounded-xl border border-gray-200 p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-semibold text-gray-700">⚡ Actuadores ({(deviceConfig[g.id]?.actuators || []).length})</p>
                          <button onClick={() => setShowActuatorForm(prev => ({ ...prev, [g.id]: !prev[g.id] }))}
                            className="text-xs bg-purple-100 hover:bg-purple-200 text-purple-700 px-2 py-1 rounded-lg font-medium transition-colors">
                            {showActuatorForm[g.id] ? 'Cancelar' : '+ Añadir actuador'}
                          </button>
                        </div>

                        {(deviceConfig[g.id]?.actuators || []).map(a => (
                          <div key={a.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2 text-xs">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-medium text-gray-800">{a.name}</span>
                              {a.type && <span className="bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded">{a.type}</span>}
                              {a.gpioPin != null && <span className="bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded">GPIO {a.gpioPin}</span>}
                              {a.activeLow && <span className="bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded">ActiveLow</span>}
                              {a.deviceSource && <span className="bg-purple-100 text-purple-600 px-1.5 py-0.5 rounded font-mono">{a.deviceSource}</span>}
                            </div>
                            <button onClick={() => handleDeleteActuator(a.id, g.id)}
                              className="text-red-400 hover:text-red-600 transition-colors ml-2 shrink-0">✕</button>
                          </div>
                        ))}

                        {(deviceConfig[g.id]?.actuators || []).length === 0 && !showActuatorForm[g.id] && (
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
                                <option value="">GPIO (opcional)</option>
                                {(gpioOpts[g.id]?.availableForActuators || []).map(p => (
                                  <option key={p} value={p}>GPIO {p}</option>
                                ))}
                              </select>
                            </div>
                            <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer">
                              <input type="checkbox" checked={actuatorForm.activeLow}
                                onChange={e => setActuatorForm(f => ({ ...f, activeLow: e.target.checked }))}
                                className="rounded" />
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
          ))}
        </div>
      )}
    </div>
  )
}
