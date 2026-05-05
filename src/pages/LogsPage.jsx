import { useState, useEffect } from 'react'
import { RefreshCw } from 'lucide-react'
import api from '../services/api'
import DebugPanel from './DebugPanel'

export default function LogsPage() {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterAction, setFilterAction] = useState('')
  const [filterUser, setFilterUser] = useState('')
  const [searchText, setSearchText] = useState('')
  const [error, setError] = useState(null)

  useEffect(() => { loadLogs() }, [])

  const loadLogs = async () => {
    try {
      const data = await api.logs.list(200)
      setLogs(data.logs || [])
      setError(null)
    } catch (err) { setError(err.message) }
    setLoading(false)
  }

  const filteredLogs = logs.filter(l => {
    const matchAction = !filterAction || l.action.includes(filterAction)
    const matchUser   = !filterUser   || l.performedBy.includes(filterUser)
    const matchSearch = !searchText   ||
      l.action.toLowerCase().includes(searchText.toLowerCase()) ||
      l.details.toLowerCase().includes(searchText.toLowerCase()) ||
      l.performedBy.toLowerCase().includes(searchText.toLowerCase())
    return matchAction && matchUser && matchSearch
  })

  const actionTypes = [...new Set(logs.map(l => l.action))].sort()
  const userList    = [...new Set(logs.map(l => l.performedBy))].sort()

  const getActionColor = (action) => {
    if (action.includes('LOGIN'))  return 'bg-blue-50 text-blue-700 border-blue-200'
    if (action.includes('DELETE')) return 'bg-red-50 text-red-700 border-red-200'
    if (action.includes('CREATE')) return 'bg-green-50 text-green-700 border-green-200'
    if (action.includes('UPDATE')) return 'bg-yellow-50 text-yellow-700 border-yellow-200'
    return 'bg-gray-50 text-gray-700 border-gray-200'
  }

  const getActionIcon = (action) => {
    if (action.includes('LOGIN'))  return '🔐'
    if (action.includes('DELETE')) return '🗑️'
    if (action.includes('CREATE')) return '✨'
    if (action.includes('UPDATE')) return '✏️'
    return '📝'
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-800">📋 Logs del Sistema</h2>
          <p className="text-sm text-gray-600 mt-1">Total: <strong>{filteredLogs.length}</strong> registros</p>
        </div>
        <button onClick={loadLogs} className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white px-4 py-2.5 rounded-xl text-sm font-medium shadow-md hover:shadow-lg transition-all duration-200 transform hover:scale-105 flex items-center gap-2">
          <RefreshCw size={16} /> Refrescar
        </button>
      </div>
      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">⚠️ {error}</div>}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <input type="text" placeholder="🔍 Buscar en acciones, detalles..." value={searchText} onChange={e => setSearchText(e.target.value)} className="border-2 border-gray-200 rounded-xl px-3 py-2 text-sm focus:border-green-500 focus:outline-none transition-colors" />
          <select value={filterAction} onChange={e => setFilterAction(e.target.value)} className="border-2 border-gray-200 rounded-xl px-3 py-2 text-sm focus:border-green-500 focus:outline-none transition-colors">
            <option value="">Todas las acciones</option>
            {actionTypes.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
          <select value={filterUser} onChange={e => setFilterUser(e.target.value)} className="border-2 border-gray-200 rounded-xl px-3 py-2 text-sm focus:border-green-500 focus:outline-none transition-colors">
            <option value="">Todos los usuarios</option>
            {userList.map(u => <option key={u} value={u}>{u}</option>)}
          </select>
          {(filterAction || filterUser || searchText) && (
            <button onClick={() => { setFilterAction(''); setFilterUser(''); setSearchText('') }} className="border-2 border-gray-300 text-gray-700 hover:bg-gray-50 rounded-xl px-3 py-2 text-sm font-medium transition-colors">🔄 Limpiar</button>
          )}
        </div>
      </div>
      {loading ? (
        <div className="flex items-center justify-center py-12"><div className="text-center"><div className="text-4xl mb-3 animate-bounce">📋</div><p className="text-gray-600">Cargando logs...</p></div></div>
      ) : filteredLogs.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center"><p className="text-gray-500 text-lg">No hay registros que coincidan con los filtros</p></div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 divide-y max-h-[600px] overflow-y-auto">
          {filteredLogs.map(l => (
            <div key={l.id} className={`p-4 border-l-4 ${getActionColor(l.action)}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl">{getActionIcon(l.action)}</span>
                    <span className="font-bold text-sm">{l.action}</span>
                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">{new Date(l.timestamp).toLocaleString('es-CO')}</span>
                  </div>
                  <p className="text-sm text-gray-700 mb-1">{l.details}</p>
                  <p className="text-xs text-gray-500">Por: <strong>{l.performedBy}</strong></p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      <DebugPanel />
    </div>
  )
}
