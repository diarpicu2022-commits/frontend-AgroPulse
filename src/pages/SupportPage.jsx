import { useState, useEffect } from 'react'
import { Ticket, Send } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'

export default function SupportPage() {
  const { user } = useAuth()
  const isAdmin  = user?.role === 'admin' || user?.role === 'ADMIN'

  const [tickets, setTickets]       = useState([])
  const [loading, setLoading]       = useState(true)
  const [showForm, setShowForm]     = useState(false)
  const [selected, setSelected]     = useState(null)
  const [adminReply, setAdminReply] = useState('')
  const [replyStatus, setReplyStatus] = useState('IN_PROGRESS')
  const [form, setForm] = useState({ subject: '', description: '', priority: 'MEDIUM' })
  const [error, setError] = useState(null)

  useEffect(() => { loadTickets() }, [])

  const loadTickets = async () => {
    try {
      const data = await api.tickets.list()
      setTickets(data.tickets || [])
      setError(null)
    } catch (err) { setError(err.message) }
    setLoading(false)
  }

  const handleCreate = async (e) => {
    e.preventDefault()
    try {
      await api.tickets.create({ ...form, greenhouseId: 0 })
      setShowForm(false); setForm({ subject: '', description: '', priority: 'MEDIUM' }); loadTickets()
    } catch (err) { alert('Error: ' + err.message) }
  }

  const handleReply = async (id) => {
    if (!adminReply.trim()) return
    try {
      await api.tickets.update(id, { adminResponse: adminReply, status: replyStatus })
      setSelected(null); setAdminReply(''); loadTickets()
    } catch (err) { alert('Error: ' + err.message) }
  }

  const handleClose = async (id) => {
    try { await api.tickets.update(id, { status: 'CLOSED' }); loadTickets(); if (selected?.id === id) setSelected(null) }
    catch (err) { alert('Error') }
  }

  const priorityColors = {
    LOW: 'bg-gray-100 text-gray-600', MEDIUM: 'bg-blue-100 text-blue-700',
    HIGH: 'bg-orange-100 text-orange-700', CRITICAL: 'bg-red-100 text-red-700'
  }
  const statusColors = {
    OPEN: 'bg-yellow-100 text-yellow-700', IN_PROGRESS: 'bg-blue-100 text-blue-700',
    RESOLVED: 'bg-green-100 text-green-700', CLOSED: 'bg-gray-100 text-gray-500'
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">🎧 Soporte Técnico</h2>
          <p className="text-sm text-gray-500 mt-0.5">{isAdmin ? 'Gestiona los tickets de soporte' : 'Crea y consulta tus solicitudes de soporte'}</p>
        </div>
        {!isAdmin && (
          <button onClick={() => setShowForm(!showForm)} className="bg-gradient-to-r from-green-500 to-emerald-500 text-white px-4 py-2.5 rounded-xl text-sm font-medium shadow-md hover:shadow-lg transition-all transform hover:scale-105 flex items-center gap-2">
            <Ticket size={16} /> {showForm ? 'Cancelar' : 'Nuevo Ticket'}
          </button>
        )}
      </div>
      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">⚠️ {error}</div>}

      {showForm && !isAdmin && (
        <form onSubmit={handleCreate} className="bg-white rounded-2xl shadow-md border-2 border-green-200 p-5 space-y-4">
          <h3 className="font-bold text-gray-800">📝 Nuevo Ticket de Soporte</h3>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Asunto *</label>
            <input type="text" value={form.subject} onChange={e => setForm({...form, subject: e.target.value})} placeholder="Describe el problema brevemente" required className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:border-green-500 focus:outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Descripción *</label>
            <textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} placeholder="Describe el problema en detalle..." required rows={4} className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:border-green-500 focus:outline-none resize-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Prioridad</label>
            <select value={form.priority} onChange={e => setForm({...form, priority: e.target.value})} className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:border-green-500 focus:outline-none">
              <option value="LOW">🔽 Baja — no urgente</option>
              <option value="MEDIUM">▶️ Media — necesito ayuda pronto</option>
              <option value="HIGH">🔼 Alta — afecta mi trabajo</option>
              <option value="CRITICAL">🚨 Crítica — sistema caído</option>
            </select>
          </div>
          <button type="submit" className="w-full bg-gradient-to-r from-green-500 to-emerald-500 text-white py-3 rounded-xl font-bold shadow-md hover:shadow-lg transition-all">📤 Enviar Ticket</button>
        </form>
      )}

      {isAdmin && selected && (
        <div className="bg-white rounded-2xl shadow-md border-2 border-blue-200 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-blue-800">💬 Responder Ticket #{selected.id}</h3>
            <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
          </div>
          <div className="bg-gray-50 rounded-xl p-4 space-y-2">
            <p className="text-sm font-semibold text-gray-800">{selected.subject}</p>
            <p className="text-xs text-gray-600">{selected.description}</p>
            <div className="flex gap-2 flex-wrap text-xs">
              <span className={`px-2 py-1 rounded-full font-medium ${priorityColors[selected.priority]}`}>{selected.priorityDisplay}</span>
              <span className="text-gray-400">Por: <strong>{selected.userName || 'Usuario #' + selected.userId}</strong></span>
            </div>
          </div>
          {selected.adminResponse && (
            <div className="bg-green-50 rounded-xl p-3 text-sm text-green-800">
              <p className="font-semibold mb-1">Respuesta anterior:</p>
              <p>{selected.adminResponse}</p>
            </div>
          )}
          <textarea value={adminReply} onChange={e => setAdminReply(e.target.value)} placeholder="Escribe tu respuesta al usuario..." rows={4} className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none resize-none" />
          <div className="flex gap-3">
            <select value={replyStatus} onChange={e => setReplyStatus(e.target.value)} className="border-2 border-gray-200 rounded-xl px-3 py-2 text-sm focus:border-blue-500 focus:outline-none">
              <option value="IN_PROGRESS">🔵 En proceso</option>
              <option value="RESOLVED">🟢 Resuelto</option>
              <option value="CLOSED">⚫ Cerrar</option>
            </select>
            <button onClick={() => handleReply(selected.id)} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-xl font-bold transition-colors flex items-center justify-center gap-2">
              <Send size={16} /> Enviar Respuesta
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12"><div className="text-4xl animate-bounce">🎫</div><p className="text-gray-500 mt-2">Cargando tickets...</p></div>
      ) : tickets.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center shadow-sm">
          <Ticket size={48} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500 font-medium">No hay tickets de soporte</p>
          {!isAdmin && <button onClick={() => setShowForm(true)} className="mt-3 text-green-600 text-sm font-medium hover:text-green-700">Crear el primero</button>}
        </div>
      ) : (
        <div className="space-y-3">
          {tickets.map(t => (
            <div key={t.id} className={`bg-white rounded-2xl shadow-sm border-2 p-4 transition-all hover:shadow-md ${t.status === 'OPEN' ? 'border-yellow-200' : t.status === 'RESOLVED' ? 'border-green-200' : t.status === 'IN_PROGRESS' ? 'border-blue-200' : 'border-gray-200'}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-2">
                    <span className="font-bold text-gray-800 text-sm">#{t.id} {t.subject}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[t.status]}`}>{t.statusDisplay}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${priorityColors[t.priority]}`}>{t.priorityDisplay}</span>
                  </div>
                  <p className="text-xs text-gray-500 line-clamp-2 mb-2">{t.description}</p>
                  {t.adminResponse && <div className="bg-blue-50 rounded-lg p-2 text-xs text-blue-800 mb-2"><span className="font-semibold">Respuesta Admin: </span>{t.adminResponse}</div>}
                  <div className="flex items-center gap-3 text-xs text-gray-400">
                    {isAdmin && <span>👤 {t.userName || 'Usuario #' + t.userId}</span>}
                    <span>📅 {t.createdAt ? new Date(t.createdAt).toLocaleDateString('es-CO') : '-'}</span>
                  </div>
                </div>
                {isAdmin && t.status !== 'CLOSED' && (
                  <div className="flex flex-col gap-2 shrink-0">
                    <button onClick={() => { setSelected(t); setAdminReply(t.adminResponse || ''); setReplyStatus(t.status === 'OPEN' ? 'IN_PROGRESS' : t.status) }} className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-blue-700 transition-colors">💬 Responder</button>
                    <button onClick={() => handleClose(t.id)} className="border-2 border-gray-300 text-gray-600 px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-gray-50 transition-colors">✕ Cerrar</button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
