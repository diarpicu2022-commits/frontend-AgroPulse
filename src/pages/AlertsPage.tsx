import { useState, useEffect, useRef } from 'react'
import { Bell, Plus, X, AlertTriangle, Info, AlertOctagon } from 'lucide-react'
import anime from 'animejs'
import { alertRepository } from '../repositories'
import type { AlertDto, AlertLevel } from '../types'

interface AlertForm {
  message: string
  level: AlertLevel
}

export default function AlertsPage() {
  const [alerts,    setAlerts]   = useState<AlertDto[]>([])
  const [loading,   setLoading]  = useState(true)
  const [showForm,  setShowForm] = useState(false)
  const [form,      setForm]     = useState<AlertForm>({ message: '', level: 'INFO' })
  const [error,     setError]    = useState<string | null>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => { loadAlerts() }, [])

  const loadAlerts = async () => {
    try {
      const data = await alertRepository.list()
      setAlerts(data.alerts || [])
      setError(null)
    } catch (err) { setError((err as Error).message) }
    setLoading(false)
  }

  useEffect(() => {
    if (!listRef.current || loading || alerts.length === 0) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced) return
    anime({
      targets:    Array.from(listRef.current.children) as Element[],
      opacity:    [0, 1],
      translateY: [10, 0],
      delay:      anime.stagger(40),
      duration:   320,
      easing:     'easeOutCubic',
    })
  }, [loading, alerts.length])

  useEffect(() => {
    if (!formRef.current || !showForm) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced) return
    anime({ targets: formRef.current, opacity: [0, 1], scaleY: [0.94, 1], duration: 260, easing: 'easeOutBack' })
  }, [showForm])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await alertRepository.create(form)
      setShowForm(false); setForm({ message: '', level: 'INFO' }); loadAlerts()
    } catch (err) { alert('Error: ' + (err as Error).message) }
  }

  const handleDelete = async (id: number) => {
    if (confirm('¿Eliminar esta alerta?')) {
      try { await alertRepository.remove(id); loadAlerts() }
      catch (err) { alert('Error: ' + (err as Error).message) }
    }
  }

  const levelCls: Record<string, string> = {
    CRITICAL: 'alert-danger',
    WARNING:  'alert-warning',
    INFO:     'alert-info',
  }

  const levelIcon: Record<string, typeof AlertTriangle> = {
    CRITICAL: AlertOctagon,
    WARNING:  AlertTriangle,
    INFO:     Info,
  }

  const levelBadge: Record<string, string> = {
    CRITICAL: 'badge-red',
    WARNING:  'badge-yellow',
    INFO:     'badge-blue',
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="section-title">Alertas</h2>
          <p className="section-subtitle">Historial de alertas del sistema</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className={showForm ? 'btn-secondary px-4 py-2 text-sm' : 'btn-primary px-4 py-2 text-sm'}>
          {showForm ? <><X size={14} /> Cancelar</> : <><Plus size={14} /> Nueva</>}
        </button>
      </div>

      {error && (
        <div className="alert-danger">
          <AlertTriangle size={14} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {showForm && (
        <form ref={formRef} onSubmit={handleSubmit} className="card p-5 space-y-4">
          <h3 className="font-semibold text-gray-800">Nueva Alerta</h3>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Mensaje *</label>
            <input type="text" placeholder="Mensaje de alerta" value={form.message}
              onChange={e => setForm({ ...form, message: e.target.value })}
              className="input-field" required />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Nivel</label>
            <select value={form.level} onChange={e => setForm({ ...form, level: e.target.value as AlertLevel })}
              className="input-field">
              <option value="INFO">Info</option>
              <option value="WARNING">Advertencia</option>
              <option value="CRITICAL">Crítica</option>
            </select>
          </div>
          <button type="submit" className="w-full btn-primary py-2.5 text-sm">Crear alerta</button>
        </form>
      )}

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton h-16 rounded-2xl" />)}
        </div>
      ) : alerts.length === 0 ? (
        <div className="empty-state card p-10">
          <Bell size={40} className="empty-state-icon" />
          <p className="empty-state-title">No hay alertas recientes</p>
          <p className="empty-state-sub">El sistema monitoreará automáticamente los sensores.</p>
        </div>
      ) : (
        <div ref={listRef} className="space-y-2">
          {alerts.map(a => {
            const cls  = levelCls[a.level] || 'alert-info'
            const Icon = levelIcon[a.level] || Info
            return (
              <div key={a.id} className={`${cls} justify-between`}>
                <div className="flex items-start gap-3 flex-1">
                  <Icon size={15} className="shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">{a.message}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={levelBadge[a.level] || 'badge-gray'}>{a.level}</span>
                      {a.timestamp && (
                        <span className="text-[11px] opacity-60">
                          {new Date(a.timestamp).toLocaleString('es-CO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <button onClick={() => handleDelete(a.id)}
                  className="shrink-0 p-1.5 rounded-lg hover:bg-black/10 transition-colors ml-2">
                  <X size={13} />
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
