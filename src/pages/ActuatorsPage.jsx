import { useState, useEffect } from 'react'
import { Zap } from 'lucide-react'
import api from '../services/api'

export default function ActuatorsPage() {
  const [actuators, setActuators] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState({ name: '', type: 'EXTRACTOR', greenhouseId: 1 })
  const [showScheduling, setShowScheduling] = useState(null)
  const [schedule, setSchedule] = useState({ enabled: false, onTime: '08:00', offTime: '18:00', daysOfWeek: [1, 2, 3, 4, 5] })
  const [error, setError] = useState(null)

  useEffect(() => { loadActuators() }, [])

  const loadActuators = async () => {
    try {
      const data = await api.actuators.list()
      setActuators(data.actuators || [])
      setError(null)
    } catch (err) { setError(err.message) }
    setLoading(false)
  }

  const resetForm = () => { setForm({ name: '', type: 'EXTRACTOR', greenhouseId: 1 }); setEditingId(null) }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      if (editingId) await api.actuators.update(editingId, form)
      else await api.actuators.create(form)
      setShowForm(false); resetForm(); loadActuators()
    } catch (err) { alert('Error: ' + err.message) }
  }

  const handleEdit = (actuator) => {
    setEditingId(actuator.id)
    setForm({ name: actuator.name, type: actuator.type || 'EXTRACTOR', greenhouseId: actuator.greenhouse_id || 1 })
    setShowForm(true)
  }

  const handleDelete = async (id, name) => {
    if (confirm(`¿Eliminar el actuador "${name}"?`)) {
      try { await api.actuators.delete(id); loadActuators() }
      catch (err) { alert('Error: ' + err.message) }
    }
  }

  const toggleField = async (id, field, currentValue) => {
    try { await api.actuators.update(id, { [field]: !currentValue }); loadActuators() }
    catch (err) { alert('Error: ' + err.message) }
  }

  const toggleScheduleDay = (day) => {
    const newDays = schedule.daysOfWeek.includes(day)
      ? schedule.daysOfWeek.filter(d => d !== day)
      : [...schedule.daysOfWeek, day]
    setSchedule({ ...schedule, daysOfWeek: newDays })
  }

  const handleSaveSchedule = async (actuatorId) => {
    try {
      await api.actuators.update(actuatorId, { schedule_config: JSON.stringify(schedule) })
      setShowScheduling(null); loadActuators()
    } catch (err) { alert('Error: ' + err.message) }
  }

  const typeInfo = {
    EXTRACTOR:      { emoji: '🌀', label: 'Extractor de Aire' },
    DOOR:           { emoji: '🚪', label: 'Puerta' },
    HEAT_GENERATOR: { emoji: '🔥', label: 'Generador de Calor' },
    WATER_PUMP:     { emoji: '💧', label: 'Bomba de Agua' },
  }

  const dayNames = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-800">⚡ Control de Actuadores</h2>
          <p className="text-sm text-gray-600 mt-1">Gestiona y programa los actuadores del invernadero</p>
        </div>
        {!showForm && !showScheduling && (
          <button onClick={() => { setShowForm(true); resetForm() }}
            className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white px-5 py-2.5 rounded-xl text-sm font-medium shadow-md hover:shadow-lg transition-all duration-200 transform hover:scale-105 flex items-center gap-2">
            ✨ Nuevo Actuador
          </button>
        )}
      </div>
      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">⚠️ {error}</div>}

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-md border-2 border-blue-200 p-6 space-y-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-800">{editingId ? '✏️ Editar Actuador' : '➕ Nuevo Actuador'}</h3>
            <button type="button" onClick={() => { setShowForm(false); resetForm() }} className="text-gray-500 hover:text-gray-700 text-2xl">✕</button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del actuador *</label>
              <input type="text" placeholder="Extractor principal, Bomba de riego, etc." value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none transition-colors" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de actuador *</label>
              <select value={form.type} onChange={e => setForm({...form, type: e.target.value})} className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none transition-colors">
                <option value="EXTRACTOR">🌀 Extractor de Aire</option>
                <option value="DOOR">🚪 Puerta</option>
                <option value="HEAT_GENERATOR">🔥 Generador de Calor</option>
                <option value="WATER_PUMP">💧 Bomba de Agua</option>
              </select>
            </div>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="submit" className="flex-1 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white py-2.5 rounded-xl font-semibold transition-all duration-200 transform hover:scale-105">
              {editingId ? '💾 Actualizar' : '✨ Crear'}
            </button>
            <button type="button" onClick={() => { setShowForm(false); resetForm() }} className="flex-1 border-2 border-gray-300 text-gray-700 hover:bg-gray-50 py-2.5 rounded-xl font-semibold transition-colors">Cancelar</button>
          </div>
        </form>
      )}

      {showScheduling && (
        <div className="bg-white rounded-2xl shadow-md border-2 border-yellow-200 p-6 space-y-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-800">⏰ Programar {actuators.find(a => a.id === showScheduling)?.name}</h3>
            <button onClick={() => setShowScheduling(null)} className="text-gray-500 hover:text-gray-700 text-2xl">✕</button>
          </div>
          <div className="space-y-4">
            <label className="flex items-center gap-3 cursor-pointer p-3 bg-yellow-50 rounded-xl border-2 border-yellow-100">
              <input type="checkbox" checked={schedule.enabled} onChange={e => setSchedule({...schedule, enabled: e.target.checked})} className="w-5 h-5 text-yellow-600 rounded cursor-pointer" />
              <span className="text-sm font-semibold text-gray-800">✅ Activar Programación Horaria</span>
            </label>
            {schedule.enabled && (
              <>
                <div className="bg-blue-50 rounded-xl p-4 border-2 border-blue-100 space-y-4">
                  <p className="text-sm font-semibold text-blue-900">🕐 Horario</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-2">Hora de Encendido</label>
                      <input type="time" value={schedule.onTime} onChange={e => setSchedule({...schedule, onTime: e.target.value})} className="w-full border-2 border-blue-200 rounded-lg px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-2">Hora de Apagado</label>
                      <input type="time" value={schedule.offTime} onChange={e => setSchedule({...schedule, offTime: e.target.value})} className="w-full border-2 border-blue-200 rounded-lg px-3 py-2 text-sm focus:border-blue-500 focus:outline-none" />
                    </div>
                  </div>
                </div>
                <div className="bg-green-50 rounded-xl p-4 border-2 border-green-100 space-y-3">
                  <p className="text-sm font-semibold text-green-900">📅 Días de la Semana</p>
                  <div className="grid grid-cols-7 gap-2">
                    {dayNames.map((day, idx) => {
                      const dayNum = idx + 1
                      const isSelected = schedule.daysOfWeek.includes(dayNum)
                      return (
                        <button key={dayNum} onClick={() => toggleScheduleDay(dayNum)}
                          className={`py-2 rounded-lg font-semibold text-xs transition-all ${isSelected ? 'bg-green-600 text-white shadow-md' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                          {day}
                        </button>
                      )
                    })}
                  </div>
                </div>
              </>
            )}
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={() => handleSaveSchedule(showScheduling)} className="flex-1 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white py-2.5 rounded-xl font-semibold transition-all duration-200 transform hover:scale-105">💾 Guardar Programación</button>
            <button onClick={() => setShowScheduling(null)} className="flex-1 border-2 border-gray-300 text-gray-700 hover:bg-gray-50 py-2.5 rounded-xl font-semibold transition-colors">Cancelar</button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-40"><div className="animate-spin text-4xl">⚡</div></div>
      ) : actuators.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Zap size={48} className="mx-auto mb-3 opacity-40" />
          <p className="text-lg font-medium">No hay actuadores</p>
          <button onClick={() => { setShowForm(true); resetForm() }} className="text-blue-600 text-sm mt-3 hover:text-blue-700 font-semibold">➕ Crear el primer actuador</button>
        </div>
      ) : (
        <div className="space-y-3">
          {actuators.map(a => {
            const info = typeInfo[a.type] || { emoji: '⚙️', label: a.type }
            const isEnabled = a.enabled === 1 || a.enabled === true
            const isAuto = a.auto_mode === 1 || a.auto_mode === true
            return (
              <div key={a.id} className={`bg-white rounded-2xl shadow-sm border-2 p-5 transition-all duration-200 hover:shadow-md ${isEnabled ? 'border-green-200 bg-green-50/20' : 'border-gray-200'}`}>
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start gap-3 flex-1">
                    <span className="text-3xl">{info.emoji}</span>
                    <div>
                      <p className="text-base font-bold text-gray-800">{a.name || info.label}</p>
                      <p className="text-xs text-gray-500">{info.label}</p>
                      <p className={`text-xs font-semibold mt-1 ${isAuto ? 'text-blue-600' : 'text-orange-600'}`}>{isAuto ? '🤖 Modo Automático' : '👤 Modo Manual'}</p>
                    </div>
                  </div>
                  <span className={`text-xs px-3 py-1 rounded-full font-semibold whitespace-nowrap ${isEnabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                    {isEnabled ? '✅ Encendido' : '⏸️ Apagado'}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <button onClick={() => toggleField(a.id, 'enabled', a.enabled)}
                    className={`flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-semibold transition-all duration-200 transform hover:scale-105 ${isEnabled ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'}`}>
                    {isEnabled ? '✅ Apagar' : '▶️ Encender'}
                  </button>
                  <button onClick={() => toggleField(a.id, 'auto_mode', a.auto_mode)}
                    className={`flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-semibold transition-all duration-200 transform hover:scale-105 ${isAuto ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'}`}>
                    {isAuto ? '🤖 Auto' : '👤 Manual'}
                  </button>
                </div>
                <div className="flex gap-2 pt-3 border-t border-gray-200">
                  <button onClick={() => { setShowScheduling(a.id); if (a.schedule_config) { try { setSchedule(JSON.parse(a.schedule_config)) } catch { setSchedule({ enabled: false, onTime: '08:00', offTime: '18:00', daysOfWeek: [1,2,3,4,5] }) } } }}
                    className="flex-1 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white py-2 rounded-lg text-sm font-semibold transition-all duration-200 transform hover:scale-105 flex items-center justify-center gap-2">
                    ⏰ Programar
                  </button>
                  <button onClick={() => handleEdit(a)} className="flex-1 border-2 border-blue-300 text-blue-600 hover:bg-blue-50 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center justify-center gap-2">✏️ Editar</button>
                  <button onClick={() => handleDelete(a.id, a.name)} className="flex-1 border-2 border-red-300 text-red-600 hover:bg-red-50 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center justify-center gap-2">🗑️ Eliminar</button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
