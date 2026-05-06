import { useState, useEffect } from 'react'
import { Settings } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'

export default function AdminPanel() {
  const { user } = useAuth()
  const [users, setUsers]       = useState([])
  const [loading, setLoading]   = useState(true)
  const [changing, setChanging] = useState(null)
  const [error, setError]       = useState('')

  useEffect(() => { loadUsers() }, [])

  const loadUsers = async () => {
    try {
      setLoading(true)
      const data = await api.auth.listUsers(user.email)
      setUsers(data.users || [])
      setError('')
    } catch (err) {
      setError(err.message)
      setUsers([])
    } finally { setLoading(false) }
  }

  const changeRole = async (userId, newRole) => {
    try {
      setChanging(userId)
      await api.auth.changeRole(userId, newRole, user.email)
      await loadUsers()
    } catch (err) {
      setError('Error cambiando rol: ' + err.message)
    } finally { setChanging(null) }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Settings className="text-blue-600" size={24} />
        <h2 className="text-2xl font-bold text-gray-800">Gestión de Roles</h2>
      </div>
      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">⚠️ {error}</div>}
      {loading ? (
        <div className="text-center py-12"><div className="inline-block animate-spin">⏳</div><p className="text-gray-500 mt-2">Cargando usuarios...</p></div>
      ) : users.length === 0 ? (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center"><p className="text-gray-600">No hay usuarios registrados</p></div>
      ) : (
        <div className="grid gap-3">
          {users.map(u => {
            const isCurrentUser = u.username === user.username
            return (
              <div key={u.id} className="bg-white rounded-lg shadow border border-gray-200 p-4 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1">
                    {u.avatar ? (
                      <img src={u.avatar} alt="avatar" className="w-10 h-10 rounded-full object-cover ring-2 ring-green-200" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-bold">
                        {(u.username || u.full_name || '?')[0].toUpperCase()}
                      </div>
                    )}
                    <div>
                      <h3 className="font-semibold text-gray-800">{u.username}</h3>
                      <p className="text-sm text-gray-500">{u.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${u.role === 'ADMIN' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                      {u.role === 'ADMIN' ? '🔴 Administrador' : '🔵 Usuario'}
                    </span>
                    {!isCurrentUser && (
                      <select value={u.role} onChange={(e) => changeRole(u.id, e.target.value)} disabled={changing === u.id}
                        className="px-3 py-1 border border-gray-300 rounded text-sm font-medium cursor-pointer hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed">
                        <option value="USER">Usuario</option>
                        <option value="ADMIN">Administrador</option>
                      </select>
                    )}
                    {isCurrentUser && <span className="text-xs text-gray-500 px-2">Tú</span>}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-gray-700">
        <p><strong>💡 Info:</strong> Cambios de rol toman efecto inmediatamente. Los usuarios con rol ADMIN pueden acceder al panel de administración.</p>
      </div>
    </div>
  )
}
