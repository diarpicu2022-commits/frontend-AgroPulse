import { useState, useEffect, useRef } from 'react'
import { Mail, Plus, X, Download, Send, Trash2, CalendarDays } from 'lucide-react'
import anime from 'animejs'
import { useAuth } from '../context/AuthContext'
import { reportRepository } from '../repositories'

type Frequency = 'daily' | 'weekly' | 'monthly'

interface ScheduleItem { id: number; email: string; frequency: Frequency }
interface ReportForm   { email: string; frequency: Frequency }
interface DailyCsvResponse  { success?: boolean; csv_content?: string }
interface HistoryResponse   { history?: ScheduleItem[] }

const FREQUENCY_LABELS: Record<Frequency, string> = {
  daily:   'Diariamente (8 AM)',
  weekly:  'Semanalmente (Lunes 8 AM)',
  monthly: 'Mensualmente (1º 8 AM)',
}

export default function ReportsPage() {
  const { user } = useAuth()
  const [schedules, setSchedules] = useState<ScheduleItem[]>([])
  const [loading,   setLoading]   = useState(true)
  const [showForm,  setShowForm]  = useState(false)
  const [error,     setError]     = useState<string | null>(null)
  const [form, setForm] = useState<ReportForm>({ email: user?.email || '', frequency: 'daily' })
  const listRef = useRef<HTMLDivElement>(null)
  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => { loadSchedules() }, [])

  useEffect(() => {
    if (!listRef.current || loading || schedules.length === 0) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced) return
    anime({
      targets:    Array.from(listRef.current.children) as Element[],
      opacity:    [0, 1],
      translateY: [10, 0],
      delay:      anime.stagger(50),
      duration:   320,
      easing:     'easeOutCubic',
    })
  }, [loading, schedules.length])

  useEffect(() => {
    if (!formRef.current || !showForm) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced) return
    anime({ targets: formRef.current, opacity: [0, 1], scaleY: [0.94, 1], duration: 260, easing: 'easeOutBack' })
  }, [showForm])

  const loadSchedules = async () => {
    try {
      const data = await reportRepository.history() as HistoryResponse
      setSchedules(data.history || [])
      setError(null)
    } catch (err) { setError((err as Error).message) }
    setLoading(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await reportRepository.schedule(form as unknown as Record<string, unknown>)
      setShowForm(false); setForm({ email: user?.email || '', frequency: 'daily' }); loadSchedules()
    } catch (err) { alert('Error: ' + (err as Error).message) }
  }

  const generateDailyReport = async () => {
    try {
      const data = await reportRepository.dailyCsv() as DailyCsvResponse
      if (data.success) {
        const link = document.createElement('a')
        link.href     = URL.createObjectURL(new Blob([data.csv_content || ''], { type: 'text/csv' }))
        link.download = `agropulse-report-${new Date().toISOString().split('T')[0]}.csv`
        link.click()
      }
    } catch (err) { alert('Error: ' + (err as Error).message) }
  }

  const sendReport = async (email: string, frequency: Frequency) => {
    try {
      await reportRepository.sendEmail({ email, type: frequency })
      alert('Reporte enviado correctamente')
      loadSchedules()
    } catch (err) { alert('Error: ' + (err as Error).message) }
  }

  const deleteSchedule = (id: number) => {
    setSchedules(schedules.filter(s => s.id !== id))
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className="section-title">Reportes Automáticos</h2>
          <p className="section-subtitle">Genera y recibe reportes por correo</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={generateDailyReport} className="btn-secondary px-4 py-2 text-sm">
            <Download size={14} /> Descargar ahora
          </button>
          {!showForm && (
            <button onClick={() => setShowForm(true)} className="btn-primary px-4 py-2 text-sm">
              <Plus size={14} /> Agendar
            </button>
          )}
        </div>
      </div>

      {error && <div className="alert-danger text-sm">{error}</div>}

      {/* Form */}
      {showForm && (
        <form ref={formRef} onSubmit={handleSubmit} className="card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-800">Agendar Reporte</h3>
            <button type="button" onClick={() => setShowForm(false)}
              className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
              <X size={16} />
            </button>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Correo electrónico</label>
            <input type="email" value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })}
              className="input-field" required />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Frecuencia</label>
            <select value={form.frequency}
              onChange={e => setForm({ ...form, frequency: e.target.value as Frequency })}
              className="input-field">
              <option value="daily">Diariamente (8 AM)</option>
              <option value="weekly">Semanalmente (Lunes 8 AM)</option>
              <option value="monthly">Mensualmente (1º 8 AM)</option>
            </select>
          </div>
          <div className="flex gap-3">
            <button type="submit" className="flex-1 btn-primary py-2.5 text-sm">Agendar</button>
            <button type="button" onClick={() => setShowForm(false)} className="flex-1 btn-secondary py-2.5 text-sm">Cancelar</button>
          </div>
        </form>
      )}

      {/* List */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => <div key={i} className="skeleton h-24 rounded-3xl" />)}
        </div>
      ) : schedules.length === 0 ? (
        <div className="empty-state card p-10">
          <Mail size={40} className="empty-state-icon" />
          <p className="empty-state-title">No hay reportes agendados</p>
          <p className="empty-state-sub">Agenda un reporte para recibir datos periódicos por email.</p>
          <button onClick={() => setShowForm(true)} className="btn-primary px-4 py-2 text-sm mt-4">
            <Plus size={14} /> Agendar reporte
          </button>
        </div>
      ) : (
        <div ref={listRef} className="space-y-3">
          {schedules.map(s => (
            <div key={s.id} className="card p-4">
              <div className="flex items-center gap-4">
                <div className="p-2.5 bg-green-100 rounded-2xl shrink-0">
                  <CalendarDays size={18} className="text-green-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-800 truncate">{s.email}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{FREQUENCY_LABELS[s.frequency] || s.frequency}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button onClick={() => sendReport(s.email, s.frequency)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-green-50 text-green-700 hover:bg-green-100 text-xs font-semibold transition-colors">
                    <Send size={12} /> Enviar
                  </button>
                  <button onClick={() => deleteSchedule(s.id)}
                    className="p-2 rounded-xl hover:bg-red-50 text-red-400 hover:text-red-600 transition-colors">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
