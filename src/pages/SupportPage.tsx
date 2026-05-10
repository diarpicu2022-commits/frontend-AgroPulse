import { useState, useEffect, useRef } from 'react'
import { Ticket, Send, Plus, X, MessageSquare } from 'lucide-react'
import anime from 'animejs'
import { useAuth } from '../context/AuthContext'
import { ticketRepository } from '../repositories'

type TicketStatus   = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED'
type TicketPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'

interface TicketItem {
  id: number
  subject: string
  description: string
  status: TicketStatus
  priority: TicketPriority
  priorityDisplay?: string
  statusDisplay?: string
  adminResponse?: string
  createdAt?: string
  userId?: number
  userName?: string
}

interface TicketForm { subject: string; description: string; priority: TicketPriority }

const PRIORITY_BADGE: Record<string, string> = {
  LOW:      'badge-gray',
  MEDIUM:   'badge-blue',
  HIGH:     'badge-yellow',
  CRITICAL: 'badge-red',
}

const STATUS_BADGE: Record<string, string> = {
  OPEN:        'badge-yellow',
  IN_PROGRESS: 'badge-blue',
  RESOLVED:    'badge-green',
  CLOSED:      'badge-gray',
}

export default function SupportPage() {
  const { user } = useAuth()
  const isAdmin   = user?.role === 'admin' || user?.role === 'ADMIN'

  const [tickets,     setTickets]    = useState<TicketItem[]>([])
  const [loading,     setLoading]    = useState(true)
  const [showForm,    setShowForm]   = useState(false)
  const [selected,    setSelected]   = useState<TicketItem | null>(null)
  const [adminReply,  setAdminReply] = useState('')
  const [replyStatus, setReplyStatus] = useState<TicketStatus>('IN_PROGRESS')
  const [form,        setForm]       = useState<TicketForm>({ subject: '', description: '', priority: 'MEDIUM' })
  const [error,       setError]      = useState<string | null>(null)
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => { loadTickets() }, [])

  useEffect(() => {
    if (!listRef.current || loading || tickets.length === 0) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced) return
    anime({
      targets:    Array.from(listRef.current.children) as Element[],
      opacity:    [0, 1],
      translateY: [12, 0],
      delay:      anime.stagger(45),
      duration:   340,
      easing:     'easeOutCubic',
    })
  }, [loading, tickets.length])

  const loadTickets = async () => {
    try {
      const data = await ticketRepository.list()
      setTickets((data.tickets || []) as unknown as TicketItem[])
      setError(null)
    } catch (err) { setError((err as Error).message) }
    setLoading(false)
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await ticketRepository.create({ ...form } as never)
      setShowForm(false); setForm({ subject: '', description: '', priority: 'MEDIUM' }); loadTickets()
    } catch (err) { alert('Error: ' + (err as Error).message) }
  }

  const handleReply = async (id: number) => {
    if (!adminReply.trim()) return
    try {
      await ticketRepository.update(id, { status: replyStatus } as never)
      setSelected(null); setAdminReply(''); loadTickets()
    } catch (err) { alert('Error: ' + (err as Error).message) }
  }

  const handleClose = async (id: number) => {
    try {
      await ticketRepository.update(id, { status: 'CLOSED' } as never)
      loadTickets()
      if (selected?.id === id) setSelected(null)
    } catch { alert('Error') }
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="section-title">Soporte Técnico</h2>
          <p className="section-subtitle">
            {isAdmin ? 'Gestiona los tickets de soporte' : 'Crea y consulta tus solicitudes'}
          </p>
        </div>
        {!isAdmin && (
          <button onClick={() => setShowForm(!showForm)}
            className={showForm ? 'btn-secondary px-4 py-2 text-sm' : 'btn-primary px-4 py-2 text-sm'}>
            {showForm ? <><X size={14} /> Cancelar</> : <><Plus size={14} /> Nuevo ticket</>}
          </button>
        )}
      </div>

      {error && <div className="alert-danger text-sm">{error}</div>}

      {/* Create form */}
      {showForm && !isAdmin && (
        <form onSubmit={handleCreate} className="card p-5 space-y-4">
          <h3 className="font-semibold text-gray-800">Nuevo Ticket de Soporte</h3>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Asunto *</label>
            <input type="text" value={form.subject}
              onChange={e => setForm({ ...form, subject: e.target.value })}
              placeholder="Describe el problema brevemente" required className="input-field" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Descripción *</label>
            <textarea value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
              placeholder="Describe el problema en detalle..." required rows={4}
              className="input-field resize-none" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Prioridad</label>
            <select value={form.priority}
              onChange={e => setForm({ ...form, priority: e.target.value as TicketPriority })}
              className="input-field">
              <option value="LOW">Baja — no urgente</option>
              <option value="MEDIUM">Media — necesito ayuda pronto</option>
              <option value="HIGH">Alta — afecta mi trabajo</option>
              <option value="CRITICAL">Crítica — sistema caído</option>
            </select>
          </div>
          <button type="submit" className="w-full btn-primary py-2.5 text-sm">
            <Send size={14} /> Enviar ticket
          </button>
        </form>
      )}

      {/* Admin reply panel */}
      {isAdmin && selected && (
        <div className="card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-800">Responder Ticket #{selected.id}</h3>
            <button onClick={() => setSelected(null)}
              className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
              <X size={16} />
            </button>
          </div>
          <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100 space-y-2">
            <p className="text-sm font-semibold text-gray-800">{selected.subject}</p>
            <p className="text-xs text-gray-600">{selected.description}</p>
            <div className="flex gap-2 flex-wrap">
              <span className={PRIORITY_BADGE[selected.priority]}>{selected.priorityDisplay || selected.priority}</span>
              <span className="text-xs text-gray-400">Por: <strong>{selected.userName || 'Usuario #' + selected.userId}</strong></span>
            </div>
          </div>
          {selected.adminResponse && (
            <div className="alert-info text-sm">
              <MessageSquare size={13} className="shrink-0" />
              <span><strong>Respuesta anterior:</strong> {selected.adminResponse}</span>
            </div>
          )}
          <textarea value={adminReply} onChange={e => setAdminReply(e.target.value)}
            placeholder="Escribe tu respuesta al usuario..." rows={4}
            className="input-field resize-none" />
          <div className="flex gap-3">
            <select value={replyStatus} onChange={e => setReplyStatus(e.target.value as TicketStatus)}
              className="input-field text-sm">
              <option value="IN_PROGRESS">En proceso</option>
              <option value="RESOLVED">Resuelto</option>
              <option value="CLOSED">Cerrar</option>
            </select>
            <button onClick={() => handleReply(selected.id)}
              className="flex-1 btn-primary py-2.5 text-sm">
              <Send size={14} /> Enviar
            </button>
          </div>
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton h-24 rounded-3xl" />)}
        </div>
      ) : tickets.length === 0 ? (
        <div className="empty-state card p-10">
          <Ticket size={40} className="empty-state-icon" />
          <p className="empty-state-title">No hay tickets de soporte</p>
          {!isAdmin && <button onClick={() => setShowForm(true)} className="btn-primary px-4 py-2 text-sm mt-4"><Plus size={14} /> Crear ticket</button>}
        </div>
      ) : (
        <div ref={listRef} className="space-y-3">
          {tickets.map(t => (
            <div key={t.id} className="card p-4">
              <div className="flex items-start gap-3">
                <div className="p-2.5 bg-gray-100 rounded-2xl shrink-0 mt-0.5">
                  <Ticket size={16} className="text-gray-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-800 text-sm">#{t.id} {t.subject}</p>
                      <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{t.description}</p>
                    </div>
                    {isAdmin && t.status !== 'CLOSED' && (
                      <div className="flex gap-1.5 shrink-0">
                        <button
                          onClick={() => { setSelected(t); setAdminReply(t.adminResponse || ''); setReplyStatus(t.status === 'OPEN' ? 'IN_PROGRESS' : t.status) }}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-100 text-xs font-semibold transition-colors">
                          <MessageSquare size={11} /> Responder
                        </button>
                        <button onClick={() => handleClose(t.id)}
                          className="p-1.5 rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
                          <X size={13} />
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2 mt-2">
                    <span className={STATUS_BADGE[t.status] || 'badge-gray'}>{t.statusDisplay || t.status}</span>
                    <span className={PRIORITY_BADGE[t.priority] || 'badge-gray'}>{t.priorityDisplay || t.priority}</span>
                    {isAdmin && <span className="text-[11px] text-gray-400">{t.userName || 'Usuario #' + t.userId}</span>}
                    {t.createdAt && <span className="text-[11px] text-gray-400">{new Date(t.createdAt).toLocaleDateString('es-CO')}</span>}
                  </div>
                  {t.adminResponse && (
                    <div className="mt-2 bg-blue-50 rounded-xl px-3 py-2 text-xs text-blue-800">
                      <strong>Admin:</strong> {t.adminResponse}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
