import { useState, useEffect } from 'react'
import { RefreshCw, Search, X, LogIn, Trash2, PlusCircle, Edit, FileText } from 'lucide-react'
import { logRepository } from '../repositories'
import DebugPanel from './DebugPanel'

interface LogEntry {
  id: number
  action: string
  details: string
  timestamp: string
  performedBy: string
}

const ACTION_ICON: Record<string, typeof Search> = {
  LOGIN:  LogIn,
  DELETE: Trash2,
  CREATE: PlusCircle,
  UPDATE: Edit,
}

const ACTION_BADGE: Record<string, string> = {
  LOGIN:  'badge-blue',
  DELETE: 'badge-red',
  CREATE: 'badge-green',
  UPDATE: 'badge-yellow',
}

function getActionKey(action: string): string {
  for (const key of Object.keys(ACTION_ICON)) {
    if (action.includes(key)) return key
  }
  return 'OTHER'
}

export default function LogsPage() {
  const [logs,          setLogs]          = useState<LogEntry[]>([])
  const [loading,       setLoading]       = useState(true)
  const [filterAction,  setFilterAction]  = useState('')
  const [filterUser,    setFilterUser]    = useState('')
  const [searchText,    setSearchText]    = useState('')
  const [error,         setError]         = useState<string | null>(null)

  useEffect(() => { loadLogs() }, [])

  const loadLogs = async () => {
    try {
      const data = await logRepository.list(200)
      setLogs((data.logs || []) as unknown as LogEntry[])
      setError(null)
    } catch (err) { setError((err as Error).message) }
    setLoading(false)
  }

  const filteredLogs = logs.filter(l => {
    const matchAction = !filterAction || l.action.includes(filterAction)
    const matchUser   = !filterUser   || (l.performedBy || '').includes(filterUser)
    const matchSearch = !searchText   ||
      l.action.toLowerCase().includes(searchText.toLowerCase()) ||
      (l.details || '').toLowerCase().includes(searchText.toLowerCase()) ||
      (l.performedBy || '').toLowerCase().includes(searchText.toLowerCase())
    return matchAction && matchUser && matchSearch
  })

  const actionTypes = [...new Set(logs.map(l => l.action))].sort()
  const userList    = [...new Set(logs.map(l => l.performedBy).filter(Boolean))].sort()
  const hasFilters  = filterAction || filterUser || searchText

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="section-title">Logs del Sistema</h2>
          <p className="section-subtitle"><strong>{filteredLogs.length}</strong> registros{hasFilters ? ' (filtrados)' : ''}</p>
        </div>
        <button onClick={loadLogs} className="btn-primary px-4 py-2 text-sm shrink-0">
          <RefreshCw size={14} /> Refrescar
        </button>
      </div>

      {error && <div className="alert-danger text-sm">{error}</div>}

      {/* Filters */}
      <div className="card p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input type="text" placeholder="Buscar..." value={searchText}
              onChange={e => setSearchText(e.target.value)}
              className="input-field pl-9 text-sm" />
          </div>
          <select value={filterAction} onChange={e => setFilterAction(e.target.value)} className="input-field text-sm">
            <option value="">Todas las acciones</option>
            {actionTypes.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
          <select value={filterUser} onChange={e => setFilterUser(e.target.value)} className="input-field text-sm">
            <option value="">Todos los usuarios</option>
            {userList.map(u => <option key={u} value={u}>{u}</option>)}
          </select>
          {hasFilters && (
            <button onClick={() => { setFilterAction(''); setFilterUser(''); setSearchText('') }}
              className="btn-secondary text-sm py-2">
              <X size={13} /> Limpiar
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="skeleton h-14 rounded-2xl" />)}
        </div>
      ) : filteredLogs.length === 0 ? (
        <div className="empty-state card p-10">
          <FileText size={40} className="empty-state-icon" />
          <p className="empty-state-title">No hay registros que coincidan</p>
          <p className="empty-state-sub">Prueba ajustando los filtros de búsqueda.</p>
        </div>
      ) : (
        <div className="card divide-y divide-gray-100 max-h-[600px] overflow-y-auto">
          {filteredLogs.map(l => {
            const key    = getActionKey(l.action)
            const Icon   = ACTION_ICON[key] || FileText
            const badge  = ACTION_BADGE[key] || 'badge-gray'
            return (
              <div key={l.id} className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50/60 transition-colors">
                <div className="p-2 bg-gray-100 rounded-xl shrink-0 mt-0.5">
                  <Icon size={14} className="text-gray-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`${badge} text-[10px]`}>{l.action}</span>
                    <span className="text-[11px] text-gray-400">
                      {l.timestamp ? new Date(l.timestamp).toLocaleString('es-CO', {
                        day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
                      }) : ''}
                    </span>
                  </div>
                  {l.details && <p className="text-xs text-gray-600 mt-0.5 truncate">{l.details}</p>}
                  <p className="text-[11px] text-gray-400 mt-0.5">Por: <span className="font-medium">{l.performedBy}</span></p>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <DebugPanel />
    </div>
  )
}
