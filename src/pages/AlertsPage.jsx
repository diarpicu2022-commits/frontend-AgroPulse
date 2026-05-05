import { useState, useEffect } from 'react'
import { Bell } from 'lucide-react'
import api from '../services/api'

export default function AlertsPage() {
  const [alerts, setAlerts] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ message: '', level: 'INFO' })
  const [error, setError] = useState(null)

  useEffect(() => { loadAlerts() }, [])

  const loadAlerts = async () => {
    try {
      const data = await api.alerts.list()
      setAlerts(data.alerts || [])
      setError(null)
    } catch (err) { setError(err.message) }
    setLoading(false)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      await api.alerts.create(form)
      setShowForm(false); setForm({ message: '', level: 'INFO' }); loadAlerts()
    } catch (err) { alert('Error: ' + err.message) }
  }

  const handleMarkRead = async (id) => {
    try { await api.alerts.markRead(id); loadAlerts() }
    catch (err) { alert('Error: ' + err.message) }
  }

  const handleDelete = async (id) => {
    if (confirm('¿Eliminar?')) {
      try { await api.alerts.delete(id); loadAlerts() }
      catch (err) { alert('Error: ' + err.message) }
    }
  }

  const levelStyle = {
    CRITICAL: 'bg-red-50 border-red-200 text-red-700',
    WARNING:  'bg-yellow-50 border-yellow-200 text-yellow-700',
    INFO:     'bg-blue-50 border-blue-200 text-blue-700'
  }
  const levelIcon = { CRITICAL: '🔴', WARNING: '🟡', INFO: '🔵' }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-800">🔔 Alertas</h2>
        <button onClick={() => setShowForm(!showForm)} className="bg-primary text-white px-4 py-2 rounded-xl text-sm font-medium">
          {showForm ? 'Cancelar' : '+ Nueva'}
        </button>
      </div>
      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">⚠️ {error}</div>}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 space-y-3">
          <input type="text" placeholder="Mensaje de alerta" value={form.message} onChange={e => setForm({...form, message: e.target.value})} className="w-full border rounded-xl px-4 py-2 text-sm" required />
          <select value={form.level} onChange={e => setForm({...form, level: e.target.value})} className="w-full border rounded-xl px-4 py-2 text-sm">
            <option value="INFO">Info</option>
            <option value="WARNING">Warning</option>
            <option value="CRITICAL">Critical</option>
          </select>
          <button type="submit" className="w-full bg-primary text-white py-2 rounded-xl font-medium">Crear Alerta</button>
        </form>
      )}
      {loading ? (
        <div className="flex items-center justify-center h-40"><div className="animate-spin text-4xl">🌿</div></div>
      ) : alerts.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Bell size={48} className="mx-auto mb-3 opacity-40" />
          <p>No hay alertas recientes</p>
          <p className="text-xs mt-1">El sistema monitoreará automáticamente</p>
        </div>
      ) : (
        <div className="space-y-3">
          {alerts.map(a => (
            <div key={a.id} className={`rounded-2xl border p-4 ${levelStyle[a.level] || 'bg-gray-50 border-gray-200 text-gray-700'}`}>
              <div className="flex items-start gap-2">
                <span className="text-lg">{levelIcon[a.level] || '⚪'}</span>
                <div className="flex-1">
                  <p className="text-sm font-medium">{a.message}</p>
                  <p className="text-xs opacity-70 mt-1">{a.level} · {new Date(a.created_at).toLocaleString('es-CO')}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
