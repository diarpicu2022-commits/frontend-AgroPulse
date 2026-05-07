import { useState, useEffect } from 'react'
import { Zap } from 'lucide-react'
import api from '../services/api'

const TYPE_INFO = {
  PUMP:   { emoji: '💧', label: 'Bomba de Agua' },
  FAN:    { emoji: '🌀', label: 'Ventilador / Extractor' },
  LED:    { emoji: '💡', label: 'Iluminación LED' },
  SERVO:  { emoji: '🔩', label: 'Servo Motor' },
  RELAY:  { emoji: '⚡', label: 'Relé' },
  MOTOR:  { emoji: '⚙️', label: 'Motor' },
  EXTRACTOR:      { emoji: '🌀', label: 'Extractor de Aire' },
  DOOR:           { emoji: '🚪', label: 'Puerta' },
  HEAT_GENERATOR: { emoji: '🔥', label: 'Generador de Calor' },
  WATER_PUMP:     { emoji: '💧', label: 'Bomba de Agua' },
}

export default function ActuatorsPage() {
  const [actuators, setActuators]     = useState([])
  const [greenhouses, setGreenhouses] = useState([])
  const [filterGhId, setFilterGhId]   = useState('')
  const [loading, setLoading]         = useState(true)
  const [showForm, setShowForm]       = useState(false)
  const [editingId, setEditingId]     = useState(null)
  const [form, setForm]               = useState({ name: '', type: 'PUMP', greenhouseId: '', gpioPin: '', activeLow: false })
  const [error, setError]             = useState(null)

  useEffect(() => { loadGreenhouses() }, [])
  useEffect(() => { loadActuators() }, [filterGhId])

  const loadGreenhouses = async () => {
    try {
      const data = await api.greenhouses.list()
      setGreenhouses(data.greenhouses || [])
    } catch {}
  }

  const loadActuators = async () => {
    setLoading(true)
    try {
      const data = await api.actuators.list(filterGhId || null)
      setActuators(data.actuators || [])
      setError(null)
    } catch (err) { setError(err.message) }
    setLoading(false)
  }

  const resetForm = () => {
    setForm({ name: '', type: 'PUMP', greenhouseId: '', gpioPin: '', activeLow: false })
    setEditingId(null)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      const payload = {
        ...form,
        gpioPin:      form.gpioPin      ? parseInt(form.gpioPin)      : null,
        greenhouseId: form.greenhouseId ? parseInt(form.greenhouseId) : null,
        status: 'OFF',
      }
      if (editingId) await api.actuators.update(editingId, payload)
      else           await api.actuators.create(payload)
      setShowForm(false); resetForm(); loadActuators()
    } catch (err) { alert('Error: ' + err.message) }
  }

  const handleEdit = (a) => {
    setEditingId(a.id)
    setForm({
      name:         a.name || '',
      type:         a.type || 'PUMP',
      greenhouseId: a.greenhouseId || '',
      gpioPin:      a.gpioPin != null ? a.gpioPin : '',
      activeLow:    a.activeLow || false,
    })
    setShowForm(true)
  }

  const handleDelete = async (id, name) => {
    if (confirm(`¿Eliminar "${name}"?`)) {
      try { await api.actuators.delete(id); loadActuators() }
      catch (err) { alert('Error: ' + err.message) }
    }
  }

  const toggleStatus = async (id, currentStatus) => {
    try {
      await api.actuators.update(id, { status: currentStatus === 'ON' ? 'OFF' : 'ON' })
      loadActuators()
    } catch (err) { alert('Error: ' + err.message) }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-3xl font-bold text-gray-800">⚡ Control de Actuadores</h2>
          <p className="text-sm text-gray-600 mt-1">Gestiona los actuadores del invernadero</p>
        </div>
        <div className="flex gap-2 items-center">
          <select value={filterGhId} onChange={e => setFilterGhId(e.target.value)}
            className="border-2 border-gray-200 rounded-xl px-3 py-2 text-sm focus:border-blue-500 focus:outline-none">
            <option value="">Todos los invernaderos</option>
            {greenhouses.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
          {!showForm && (
            <button onClick={() => { setShowForm(true); resetForm() }}
              className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white px-5 py-2.5 rounded-xl text-sm font-medium shadow-md hover:shadow-lg transition-all transform hover:scale-105">
              ✨ Nuevo Actuador
            </button>
          )}
        </div>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">⚠️ {error}</div>}

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-md border-2 border-blue-200 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-gray-800">{editingId ? '✏️ Editar Actuador' : '➕ Nuevo Actuador'}</h3>
            <button type="button" onClick={() => { setShowForm(false); resetForm() }} className="text-gray-500 hover:text-gray-700 text-2xl">✕</button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
              <input type="text" placeholder="Bomba de riego, Extractor 1..." value={form.name}
                onChange={e => setForm({...form, name: e.target.value})}
                className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tipo *</label>
              <select value={form.type} onChange={e => setForm({...form, type: e.target.value})}
                className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none">
                {Object.entries(TYPE_INFO).map(([k, v]) => (
                  <option key={k} value={k}>{v.emoji} {v.label}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Invernadero</label>
              <select value={form.greenhouseId} onChange={e => setForm({...form, greenhouseId: e.target.value})}
                className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none">
                <option value="">Seleccionar...</option>
                {greenhouses.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">GPIO pin</label>
              <input type="number" placeholder="ej: 26" value={form.gpioPin}
                onChange={e => setForm({...form, gpioPin: e.target.value})}
                className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none" />
            </div>
            <div className="flex items-end pb-1">
              <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input type="checkbox" checked={form.activeLow}
                  onChange={e => setForm({...form, activeLow: e.target.checked})}
                  className="rounded w-4 h-4" />
                Active-Low (relés HW-383)
              </label>
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="submit"
              className="flex-1 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white py-2.5 rounded-xl font-semibold transition-all transform hover:scale-105">
              {editingId ? '💾 Actualizar' : '✨ Crear'}
            </button>
            <button type="button" onClick={() => { setShowForm(false); resetForm() }}
              className="flex-1 border-2 border-gray-300 text-gray-700 hover:bg-gray-50 py-2.5 rounded-xl font-semibold transition-colors">
              Cancelar
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-40"><div className="animate-spin text-4xl">⚡</div></div>
      ) : actuators.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Zap size={48} className="mx-auto mb-3 opacity-40" />
          <p className="text-lg font-medium">No hay actuadores{filterGhId ? ' en este invernadero' : ''}</p>
          <button onClick={() => { setShowForm(true); resetForm() }}
            className="text-blue-600 text-sm mt-3 hover:text-blue-700 font-semibold">➕ Crear el primer actuador</button>
        </div>
      ) : (
        <div className="space-y-3">
          {actuators.map(a => {
            const info    = TYPE_INFO[a.type] || { emoji: '⚙️', label: a.type }
            const isOn    = a.status === 'ON'
            return (
              <div key={a.id} className={`bg-white rounded-2xl shadow-sm border-2 p-5 transition-all duration-200 hover:shadow-md ${isOn ? 'border-green-200 bg-green-50/20' : 'border-gray-200'}`}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-start gap-3 flex-1">
                    <span className="text-3xl">{info.emoji}</span>
                    <div>
                      <p className="text-base font-bold text-gray-800">{a.name || info.label}</p>
                      <p className="text-xs text-gray-500">{info.label}</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {a.gpioPin != null && <span className="text-xs bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded">GPIO {a.gpioPin}</span>}
                        {a.activeLow       && <span className="text-xs bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded">ActiveLow</span>}
                        {a.deviceSource    && <span className="text-xs bg-purple-100 text-purple-600 px-1.5 py-0.5 rounded font-mono">{a.deviceSource}</span>}
                      </div>
                    </div>
                  </div>
                  <span className={`text-xs px-3 py-1 rounded-full font-semibold whitespace-nowrap ${isOn ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                    {isOn ? '✅ Encendido' : '⏸️ Apagado'}
                  </span>
                </div>

                <div className="flex gap-2">
                  <button onClick={() => toggleStatus(a.id, a.status)}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-semibold transition-all transform hover:scale-105 ${isOn ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'}`}>
                    {isOn ? '✅ Apagar' : '▶️ Encender'}
                  </button>
                  <button onClick={() => handleEdit(a)}
                    className="flex-1 border-2 border-blue-300 text-blue-600 hover:bg-blue-50 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center justify-center gap-2">
                    ✏️ Editar
                  </button>
                  <button onClick={() => handleDelete(a.id, a.name)}
                    className="flex-1 border-2 border-red-300 text-red-600 hover:bg-red-50 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center justify-center gap-2">
                    🗑️ Eliminar
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
