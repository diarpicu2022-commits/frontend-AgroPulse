import { useState, useEffect, useRef } from 'react'
import { Mail, Plus, X, Download, Send, Trash2, CalendarDays, Building2, Sprout } from 'lucide-react'
import anime from 'animejs'
import { useAuth } from '../context/AuthContext'
import { reportRepository, greenhouseRepository } from '../repositories'
import type { GreenhouseDto } from '../types'

type Frequency = 'daily' | 'weekly' | 'monthly'

interface ScheduleItem {
  id: number
  email: string
  frequency: Frequency
  greenhouseId?: number
}

interface ReportForm {
  email: string
  frequency: Frequency
  greenhouse_id: number | ''
}

interface DailyCsvResponse { success?: boolean; csv_content?: string }
interface HistoryResponse  { history?: ScheduleItem[] }

const REPORTS_CACHE = 'agropulse_reports_v1'

const FREQUENCY_LABELS: Record<Frequency, string> = {
  daily:   'Diariamente (8 AM)',
  weekly:  'Semanalmente (Lunes 8 AM)',
  monthly: 'Mensualmente (1º 8 AM)',
}

const FREQ_CONFIG: Record<Frequency, { label: string; color: string; bg: string; border: string }> = {
  daily:   { label: 'Diario',  color: 'text-blue-700',   bg: 'bg-blue-50',   border: 'border-blue-100' },
  weekly:  { label: 'Semanal', color: 'text-purple-700', bg: 'bg-purple-50', border: 'border-purple-100' },
  monthly: { label: 'Mensual', color: 'text-amber-700',  bg: 'bg-amber-50',  border: 'border-amber-100' },
}

function saveCache(items: ScheduleItem[]) {
  try { localStorage.setItem(REPORTS_CACHE, JSON.stringify(items)) } catch {}
}

export default function ReportsPage() {
  const { user } = useAuth()
  const [schedules,   setSchedules]   = useState<ScheduleItem[]>([])
  const [greenhouses, setGreenhouses] = useState<GreenhouseDto[]>([])
  const [loading,     setLoading]     = useState(true)
  const [showForm,    setShowForm]    = useState(false)
  const [ghFilter,    setGhFilter]    = useState<number | ''>('')
  const [error,       setError]       = useState<string | null>(null)
  const [form, setForm] = useState<ReportForm>({ email: user?.email || '', frequency: 'daily', greenhouse_id: '' })
  const listRef   = useRef<HTMLDivElement>(null)
  const formRef   = useRef<HTMLFormElement>(null)
  const headerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(REPORTS_CACHE)
      if (raw) {
        const cached = JSON.parse(raw) as ScheduleItem[]
        if (cached.length > 0) { setSchedules(cached); setLoading(false) }
      }
    } catch {}
    loadSchedules()
    greenhouseRepository.list().then(d => setGreenhouses(d.greenhouses || [])).catch(() => {})
  }, [])

  useEffect(() => {
    if (!headerRef.current) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced) return
    anime({ targets: headerRef.current, opacity: [0, 1], translateY: [-10, 0], duration: 400, easing: 'easeOutCubic' })
  }, [])

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
      const data = await reportRepository.history()
      const list = Array.isArray(data)
        ? (data as ScheduleItem[])
        : ((data as HistoryResponse).history ?? [])
      if (list.length > 0) { setSchedules(list); saveCache(list) }
      setError(null)
    } catch (err) { setError((err as Error).message) }
    setLoading(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (ghFilter === '') return
    try {
      const payload = { email: form.email, frequency: form.frequency, greenhouseId: ghFilter }
      const result = await reportRepository.schedule(payload as unknown as Record<string, unknown>) as Record<string, unknown> | null
      const newItem: ScheduleItem = {
        id:           (result?.id as number) ?? Date.now(),
        email:        form.email,
        frequency:    form.frequency,
        greenhouseId: ghFilter as number,
      }
      const updated = [...schedules, newItem]
      setSchedules(updated)
      saveCache(updated)
      setShowForm(false)
      setForm({ email: user?.email || '', frequency: 'daily', greenhouse_id: ghFilter })
      setTimeout(() => {
        if (!listRef.current) return
        const last = listRef.current.lastElementChild as HTMLElement | null
        if (!last) return
        anime({ targets: last, backgroundColor: ['#dcfce7', '#ffffff'], duration: 800, easing: 'easeOutCubic' })
      }, 60)
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

  const handleDelete = async (id: number) => {
    const card = document.getElementById(`report-card-${id}`)
    if (card) {
      await new Promise<void>(resolve => {
        anime({
          targets:      card,
          opacity:      [1, 0],
          translateX:   [0, 24],
          height:       [card.offsetHeight, 0],
          marginBottom: [12, 0],
          paddingTop:   [16, 0],
          paddingBottom:[16, 0],
          duration: 300,
          easing: 'easeInCubic',
          complete: () => resolve(),
        })
      })
    }
    const updated = schedules.filter(s => s.id !== id)
    setSchedules(updated)
    saveCache(updated)
  }

  const ghName = (id?: number) => {
    if (!id) return null
    return greenhouses.find(g => g.id === id)?.name ?? `#${id}`
  }

  const displayed = ghFilter !== ''
    ? schedules.filter(s => s.greenhouseId === ghFilter)
    : schedules

  return (
    <div className="space-y-5">
      {/* Header */}
      <div ref={headerRef} className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className="section-title">Reportes Automáticos</h2>
          <p className="section-subtitle">Genera y recibe reportes por correo electrónico</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={generateDailyReport} className="btn-secondary px-4 py-2 text-sm">
            <Download size={14} /> Descargar ahora
          </button>
          {!showForm && ghFilter !== '' && (
            <button onClick={() => setShowForm(true)} className="btn-primary px-4 py-2 text-sm">
              <Plus size={14} /> Agendar
            </button>
          )}
        </div>
      </div>

      {/* Greenhouse filter chips */}
      {greenhouses.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => { setGhFilter(''); setShowForm(false) }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-2xl text-xs font-semibold transition-all border
              ${ghFilter === ''
                ? 'bg-green-600 text-white border-green-600 shadow-sm'
                : 'border-[rgba(74,222,128,0.12)] hover:border-green-400/20'}`}
            style={ghFilter !== '' ? { background: '#051a0a', color: 'rgba(255,255,255,0.5)' } : {}}
          >
            <Sprout size={11} /> Todos
          </button>
          {greenhouses.map(gh => (
            <button key={gh.id}
              onClick={() => setGhFilter(gh.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-2xl text-xs font-semibold transition-all border
                ${ghFilter === gh.id
                  ? 'bg-green-600 text-white border-green-600 shadow-sm'
                  : 'border-[rgba(74,222,128,0.12)] hover:border-green-400/20'}`}
              style={ghFilter !== gh.id ? { background: '#051a0a', color: 'rgba(255,255,255,0.5)' } : {}}
            >
              <Building2 size={11} /> {gh.name}
            </button>
          ))}
        </div>
      )}

      {/* Create gate banner */}
      {ghFilter === '' && !showForm && (
        <div className="flex items-center gap-2.5 px-4 py-3 bg-blue-50 border border-blue-100 rounded-2xl text-xs text-blue-700 font-medium">
          <Building2 size={14} className="shrink-0" />
          Selecciona un invernadero para agendar reportes
        </div>
      )}

      {error && <div className="alert-danger text-sm">{error}</div>}

      {/* Form */}
      {showForm && ghFilter !== '' && (
        <form ref={formRef} onSubmit={handleSubmit} className="card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold" style={{ color: '#e2ffe9' }}>Agendar Reporte</h3>
            <button type="button" onClick={() => setShowForm(false)}
              className="p-1.5 rounded-lg hover:bg-[rgba(74,222,128,0.08)] transition-colors" style={{ color: 'rgba(255,255,255,0.35)' }}>
              <X size={16} />
            </button>
          </div>

          <div className="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-100 rounded-xl text-xs text-green-700">
            <Building2 size={13} />
            <span className="font-semibold">Invernadero:</span> {ghName(ghFilter as number)}
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: 'rgba(255,255,255,0.35)' }}>Correo electrónico</label>
            <input type="email" value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })}
              className="input-field" required />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: 'rgba(255,255,255,0.35)' }}>Frecuencia</label>
            <div className="grid grid-cols-3 gap-2">
              {(['daily', 'weekly', 'monthly'] as Frequency[]).map(f => {
                const cfg    = FREQ_CONFIG[f]
                const active = form.frequency === f
                return (
                  <button key={f} type="button"
                    onClick={() => setForm({ ...form, frequency: f })}
                    className={`py-2.5 rounded-xl text-xs font-semibold border transition-all
                      ${active
                        ? `${cfg.bg} ${cfg.border} ${cfg.color} ring-1 ring-offset-1`
                        : 'border-[rgba(74,222,128,0.12)] hover:border-green-400/20'}`}
                    style={!active ? { background: '#051a0a', color: 'rgba(255,255,255,0.5)' } : {}}
                  >
                    {cfg.label}
                  </button>
                )
              })}
            </div>
            <p className="text-xs mt-1.5" style={{ color: 'rgba(255,255,255,0.35)' }}>{FREQUENCY_LABELS[form.frequency]}</p>
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
      ) : displayed.length === 0 ? (
        <div className="empty-state card p-10">
          <Mail size={40} className="empty-state-icon" />
          <p className="empty-state-title">
            {ghFilter !== '' ? `Sin reportes en ${ghName(ghFilter as number)}` : 'No hay reportes agendados'}
          </p>
          <p className="empty-state-sub">
            {ghFilter !== ''
              ? 'Agenda un reporte para este invernadero.'
              : 'Selecciona un invernadero para comenzar.'}
          </p>
          {ghFilter !== '' && (
            <button onClick={() => setShowForm(true)} className="btn-primary px-4 py-2 text-sm mt-4">
              <Plus size={14} /> Agendar reporte
            </button>
          )}
        </div>
      ) : (
        <div ref={listRef} className="space-y-3">
          {displayed.map(s => {
            const cfg   = FREQ_CONFIG[s.frequency] || FREQ_CONFIG.daily
            const gName = ghName(s.greenhouseId)
            return (
              <div key={s.id} id={`report-card-${s.id}`} className="card p-4">
                <div className="flex items-center gap-4">
                  <div className={`p-2.5 ${cfg.bg} rounded-2xl shrink-0 border ${cfg.border}`}>
                    <CalendarDays size={18} className={cfg.color} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate" style={{ color: '#e2ffe9' }}>{s.email}</p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>{FREQUENCY_LABELS[s.frequency] || s.frequency}</p>
                      {gName && (
                        <span className="flex items-center gap-1 text-[10px] font-semibold text-green-700 bg-green-50 border border-green-100 px-1.5 py-0.5 rounded-lg">
                          <Building2 size={9} /> {gName}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`px-2 py-1 rounded-lg text-[10px] font-semibold ${cfg.bg} ${cfg.color} border ${cfg.border}`}>
                      {cfg.label}
                    </span>
                    <button onClick={() => sendReport(s.email, s.frequency)}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-green-50 text-green-700 hover:bg-green-100 text-xs font-semibold transition-colors">
                      <Send size={12} /> Enviar
                    </button>
                    <button onClick={() => handleDelete(s.id)}
                      className="p-2 rounded-xl hover:bg-red-50 text-red-400 hover:text-red-600 transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
