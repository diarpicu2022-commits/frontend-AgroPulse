import { useState, useEffect } from 'react'
import api from '../services/api'
import { supabase } from '../context/AuthContext'

export default function UsersPage() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ username: '', password: '', fullName: '', role: 'USER' })
  const [error, setError] = useState(null)

  useEffect(() => { loadUsers() }, [])

  const loadUsers = async () => {
    setLoading(true)
    try {
      // Fetch local REST users
      const restData = await api.users.list()
      const restUsers = (restData.users || []).map(u => ({ ...u, source: 'local' }))

      // Fetch Supabase users (Google OAuth + registered via Supabase)
      let supabaseUsers = []
      if (supabase) {
        const { data } = await supabase.from('users').select('*').eq('active', 1)
        supabaseUsers = (data || []).map(u => ({ ...u, source: 'supabase' }))
      }

      // Merge: prefer REST record when same email exists in both
      const emailsSeen = new Set(restUsers.map(u => u.email?.toLowerCase()).filter(Boolean))
      const onlyInSupabase = supabaseUsers.filter(u => !emailsSeen.has(u.email?.toLowerCase()))
      setUsers([...restUsers, ...onlyInSupabase])
      setError(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      await api.users.create(form)
      setShowForm(false); setForm({ username: '', password: '', fullName: '', role: 'USER' }); loadUsers()
    } catch (err) { alert('Error: ' + err.message) }
  }

  const handleDelete = async (id) => {
    if (confirm('¿Eliminar usuario?')) {
      try { await api.users.delete(id); loadUsers() }
      catch (err) { alert('Error: ' + err.message) }
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-800">👥 Usuarios</h2>
        <button onClick={() => setShowForm(!showForm)} className="bg-primary text-white px-4 py-2 rounded-xl text-sm font-medium">
          {showForm ? 'Cancelar' : '+ Nuevo'}
        </button>
      </div>
      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">⚠️ {error}</div>}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 space-y-3">
          <input type="text" placeholder="Usuario" value={form.username} onChange={e => setForm({...form, username: e.target.value})} className="w-full border rounded-xl px-4 py-2 text-sm" required />
          <input type="password" placeholder="Contraseña" value={form.password} onChange={e => setForm({...form, password: e.target.value})} className="w-full border rounded-xl px-4 py-2 text-sm" required />
          <input type="text" placeholder="Nombre completo" value={form.fullName} onChange={e => setForm({...form, fullName: e.target.value})} className="w-full border rounded-xl px-4 py-2 text-sm" />
          <select value={form.role} onChange={e => setForm({...form, role: e.target.value})} className="w-full border rounded-xl px-4 py-2 text-sm">
            <option value="USER">Usuario</option>
            <option value="ADMIN">Administrador</option>
            <option value="OPERATOR">Operador</option>
          </select>
          <button type="submit" className="w-full bg-primary text-white py-2 rounded-xl font-medium">Crear Usuario</button>
        </form>
      )}
      {loading ? <div className="text-center py-8">Cargando...</div> : (
        <div className="grid gap-3">
          {users.map(u => (
            <div key={u.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
              <div className="flex items-center gap-3">
                {u.avatar ? (
                  <img src={u.avatar} alt="avatar" className="w-12 h-12 rounded-full object-cover ring-2 ring-green-200" />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-bold text-lg">
                    {(u.username || u.fullName || '?')[0].toUpperCase()}
                  </div>
                )}
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-800">{u.username || u.full_name}</h3>
                  <p className="text-sm text-gray-500">{u.email || u.fullName || u.full_name || 'Sin nombre'}</p>
                  <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">{u.role}</span>
                    {u.source === 'supabase' && (
                      <span className="text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded">Google OAuth</span>
                    )}
                  </div>
                </div>
                {u.source !== 'supabase' && (
                  <button onClick={() => handleDelete(u.id)} className="text-red-500 text-sm">Eliminar</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
