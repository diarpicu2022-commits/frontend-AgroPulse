import { useState, useEffect } from 'react'
import { Building2, UserPlus } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'

export default function GreenhousePage() {
  const { user } = useAuth()
  const isAdmin  = user?.role === 'admin' || user?.role === 'ADMIN'

  const [greenhouses, setGreenhouses]       = useState([])
  const [loading, setLoading]               = useState(true)
  const [showForm, setShowForm]             = useState(false)
  const [form, setForm]                     = useState({ name: '', location: '', description: '' })
  const [expandedId, setExpandedId]         = useState(null)
  const [ghUsers, setGhUsers]               = useState({})
  const [allUsers, setAllUsers]             = useState([])
  const [assignUserId, setAssignUserId]     = useState('')
  const [error, setError]                   = useState(null)

  useEffect(() => {
    loadGreenhouses()
    if (isAdmin) api.users.list().then(d => setAllUsers(d.users || [])).catch(() => {})
  }, [])

  const loadGreenhouses = async () => {
    try {
      const data = await api.greenhouses.list()
      setGreenhouses(data.greenhouses || [])
      setError(null)
    } catch (err) {
      setError(err.message)
    }
    setLoading(false)
  }

  const loadGhUsers = async (id) => {
    try {
      const data = await api.greenhouses.listUsers(id)
      setGhUsers(prev => ({ ...prev, [id]: data.users || [] }))
    } catch (err) {
      setError(err.message)
    }
  }

  const toggleExpand = (id) => {
    if (expandedId === id) { setExpandedId(null); return }
    setExpandedId(id)
    loadGhUsers(id)
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
                  {g.description && <p className="text-xs text-gray-400 mt-1">{g.description}</p>}
                </div>
                <div className="flex gap-2 shrink-0 ml-3">
                  {isAdmin && (
                    <button onClick={() => toggleExpand(g.id)}
                      className="bg-blue-50 hover:bg-blue-100 text-blue-600 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1">
                      <UserPlus size={13} /> Usuarios
                    </button>
                  )}
                  {isAdmin && (
                    <button onClick={() => handleDelete(g.id)} className="text-red-400 hover:text-red-600 text-xs px-2 py-1.5 rounded-lg hover:bg-red-50 transition-colors">
                      Eliminar
                    </button>
                  )}
                </div>
              </div>

              {isAdmin && expandedId === g.id && (
                <div className="border-t border-gray-100 bg-gray-50 p-4 space-y-3">
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
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
