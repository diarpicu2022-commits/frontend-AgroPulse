import { useState, useEffect, useRef } from 'react'
import { Bell, Plus, X, AlertTriangle, Info, AlertOctagon, Check, CheckCheck, Building2 } from 'lucide-react'
import anime from 'animejs'
import { alertRepository, greenhouseRepository } from '../repositories'
import { useGsapReveal } from '../hooks/useGsapReveal'
import type { AlertDto, AlertLevel, GreenhouseDto } from '../types'

interface AlertForm {
  message: string
  level: AlertLevel
  greenhouse_id: number | ''
}

type LevelFilter = 'ALL' | AlertLevel

interface LevelMeta {
  label: string
  badge: string
  cardBg: string
  cardBorder: string
  iconBg: string
  iconColor: string
  dot: string
  Icon: typeof AlertOctagon
}

const LEVEL: Record<AlertLevel, LevelMeta> = {
  CRITICAL: {
    label: 'Crítica',   badge: 'badge-red',
    cardBg: 'bg-red-50/60',   cardBorder: 'border-red-200',
    iconBg: 'bg-red-100',     iconColor: 'text-red-600',
    dot: 'bg-red-500',        Icon: AlertOctagon,
  },
  WARNING: {
    label: 'Advertencia', badge: 'badge-yellow',
    cardBg: 'bg-amber-50/60', cardBorder: 'border-amber-200',
    iconBg: 'bg-amber-100',   iconColor: 'text-amber-600',
    dot: 'bg-amber-400',      Icon: AlertTriangle,
  },
  INFO: {
    label: 'Info',      badge: 'badge-blue',
    cardBg: 'bg-blue-50/40',  cardBorder: 'border-blue-200',
    iconBg: 'bg-blue-100',    iconColor: 'text-blue-600',
    dot: 'bg-blue-400',       Icon: Info,
  },
}

const LEVELS: AlertLevel[] = ['CRITICAL', 'WARNING', 'INFO']

const ALERTS_CACHE = 'agropulse_alerts_v1'
const saveCache = (list: AlertDto[]) => {
  try { localStorage.setItem(ALERTS_CACHE, JSON.stringify(list)) } catch {}
}

export default function AlertsPage() {
  const revealRef = useGsapReveal<HTMLDivElement>({ stagger: 0.06, duration: 0.45 })
  const [alerts,      setAlerts]      = useState<AlertDto[]>([])
  const [greenhouses, setGreenhouses] = useState<GreenhouseDto[]>([])
  const [loading,     setLoading]     = useState(true)
  const [showForm,    setShowForm]    = useState(false)
  const [levelFilter, setLevelFilter] = useState<LevelFilter>('ALL')
  const [ghFilter,    setGhFilter]    = useState<number | ''>('')
  const [error,       setError]       = useState<string | null>(null)
  const [form,        setForm]        = useState<AlertForm>({ message: '', level: 'INFO', greenhouse_id: '' })
  const [visibleCount, setVisibleCount] = useState(50)

  const listRef    = useRef<HTMLDivElement>(null)
  const formRef    = useRef<HTMLFormElement>(null)
  const statsRef   = useRef<HTMLDivElement>(null)
  const headerRef  = useRef<HTMLDivElement>(null)

  useEffect(() => {
    loadAlerts()
    greenhouseRepository.list().then(d => setGreenhouses(d.greenhouses ?? [])).catch(() => {})
  }, [])

  // Header + stats entrance
  useEffect(() => {
    if (!headerRef.current) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced) return
    anime({ targets: headerRef.current, opacity: [0, 1], translateY: [-10, 0], duration: 400, easing: 'easeOutCubic' })
  }, [])

  // Stats bar entrance
  useEffect(() => {
    if (!statsRef.current || loading) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced) return
    anime({
      targets:  Array.from(statsRef.current.children) as Element[],
      opacity:  [0, 1],
      scale:    [0.88, 1],
      delay:    anime.stagger(60),
      duration: 340,
      easing:   'easeOutBack',
    })
  }, [loading])

  // List stagger on data load
  useEffect(() => {
    if (!listRef.current || loading || alerts.length === 0) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced) return
    anime({
      targets:    Array.from(listRef.current.children) as Element[],
      opacity:    [0, 1],
      translateX: [-14, 0],
      delay:      anime.stagger(35),
      duration:   300,
      easing:     'easeOutCubic',
    })
  }, [loading, alerts.length])

  // Form entrance
  useEffect(() => {
    if (!formRef.current || !showForm) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced) return
    anime({ targets: formRef.current, opacity: [0, 1], scaleY: [0.93, 1], translateY: [-8, 0], duration: 280, easing: 'easeOutBack' })
  }, [showForm])

  const loadAlerts = async () => {
    try {
      const raw = localStorage.getItem(ALERTS_CACHE)
      if (raw) { setAlerts(JSON.parse(raw) as AlertDto[]); setLoading(false) }
    } catch {}
    try {
      const data = await alertRepository.list()
      const list = Array.isArray(data) ? (data as AlertDto[]) : (data.alerts ?? [])
      if (list.length > 0) { setAlerts(list); saveCache(list) }
      setError(null)
    } catch (err) { setError((err as Error).message) }
    setLoading(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const payload: Partial<AlertDto> = {
      message: form.message,
      level:   form.level,
      type:    'MANUAL',
      ...(form.greenhouse_id !== '' ? { greenhouseId: form.greenhouse_id as number } : {}),
    }
    try {
      const created = await alertRepository.create(payload) as AlertDto | null
      const newAlert: AlertDto = {
        id:           (created as AlertDto)?.id ?? Date.now(),
        message:      form.message,
        level:        form.level,
        type:         'MANUAL',
        read:         false,
        timestamp:    new Date().toISOString(),
        ...(form.greenhouse_id !== '' ? { greenhouseId: form.greenhouse_id as number } : {}),
      }
      setAlerts(prev => {
        const next = [newAlert, ...prev]
        saveCache(next)
        return next
      })
      setShowForm(false)
      setForm({ message: '', level: 'INFO', greenhouse_id: '' })
      // Flash the new alert
      requestAnimationFrame(() => {
        const el = document.querySelector('[data-alert-id]') as HTMLElement | null
        if (el) anime({ targets: el, backgroundColor: ['rgba(34,197,94,0.15)', 'transparent'], duration: 600, easing: 'easeOutCubic' })
      })
    } catch (err) { alert('Error: ' + (err as Error).message) }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('¿Eliminar esta alerta?')) return
    const el = document.querySelector(`[data-alert-id="${id}"]`) as HTMLElement | null
    if (el) {
      await new Promise<void>(resolve =>
        anime({
          targets:      el,
          opacity:      [1, 0],
          translateX:   [0, 24],
          height:       [el.offsetHeight, 0],
          marginBottom: [8, 0],
          paddingTop:   [el.style.paddingTop || '', 0],
          paddingBottom:[el.style.paddingBottom || '', 0],
          duration:     240,
          easing:       'easeInCubic',
          complete:     () => resolve(),
        })
      )
    }
    setAlerts(prev => { const next = prev.filter(a => a.id !== id); saveCache(next); return next })
    try { await alertRepository.remove(id) }
    catch (err) { loadAlerts(); alert('Error: ' + (err as Error).message) }
  }

  const handleMarkRead = async (id: number) => {
    const el = document.querySelector(`[data-alert-id="${id}"]`) as HTMLElement | null
    if (el) anime({ targets: el, opacity: [1, 0.55], duration: 200, easing: 'easeOutCubic' })
    setAlerts(prev => { const next = prev.map(a => a.id === id ? { ...a, read: true } : a); saveCache(next); return next })
    try { await alertRepository.markRead(id) } catch {}
  }

  const handleMarkAllRead = () => {
    if (listRef.current) {
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      if (!reduced) {
        anime({
          targets:  Array.from(listRef.current.children) as Element[],
          opacity:  [1, 0.55],
          delay:    anime.stagger(20),
          duration: 160,
          easing:   'easeOutCubic',
        })
      }
    }
    setAlerts(prev => { const next = prev.map(a => ({ ...a, read: true })); saveCache(next); return next })
  }

  const ghName = (id?: number) =>
    id ? (greenhouses.find(g => g.id === id)?.name ?? `Inv. ${id}`) : null

  const allFiltered = alerts
    .filter(a => levelFilter === 'ALL' || a.level === levelFilter)
    .filter(a => ghFilter === '' || a.greenhouseId === ghFilter)
  const displayed = allFiltered.slice(0, visibleCount)

  const counts = {
    CRITICAL: alerts.filter(a => a.level === 'CRITICAL').length,
    WARNING:  alerts.filter(a => a.level === 'WARNING').length,
    INFO:     alerts.filter(a => a.level === 'INFO').length,
    unread:   alerts.filter(a => !a.read).length,
  }

  return (
    <div ref={revealRef} className="space-y-5">

      {/* Header */}
      <div ref={headerRef} className="flex items-start justify-between gap-3 flex-wrap" style={{ opacity: 0 }}>
        <div>
          <h2 className="section-title">Alertas</h2>
          <p className="section-subtitle">Historial de alertas por invernadero</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {counts.unread > 0 && !loading && (
            <button onClick={handleMarkAllRead}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl hover:bg-[rgba(74,222,128,0.08)] text-xs font-semibold transition-colors"
            style={{ background: 'rgba(74,222,128,0.06)', color: 'rgba(255,255,255,0.5)' }}>
              <CheckCheck size={13} /> Marcar todas leídas
            </button>
          )}
          <button
            onClick={() => setShowForm(v => !v)}
            className={showForm ? 'btn-secondary px-4 py-2 text-sm' : 'btn-primary px-4 py-2 text-sm'}>
            {showForm ? <><X size={14} /> Cancelar</> : <><Plus size={14} /> Nueva</>}
          </button>
        </div>
      </div>

      {error && (
        <div className="alert-danger text-sm">
          <AlertTriangle size={14} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Stats bar */}
      {!loading && alerts.length > 0 && (
        <div ref={statsRef} className="grid grid-cols-3 gap-3">
          {LEVELS.map(lvl => {
            const meta = LEVEL[lvl]
            const Icon = meta.Icon
            const count = counts[lvl]
            return (
              <button
                key={lvl}
                aria-pressed={levelFilter === lvl}
                aria-label={`Filtrar por nivel ${meta.label}`}
                onClick={() => setLevelFilter(prev => prev === lvl ? 'ALL' : lvl)}
                className={`card p-3 flex items-center gap-3 transition-all duration-200 cursor-pointer text-left
                  ${levelFilter === lvl ? `${meta.cardBg} ${meta.cardBorder} ring-1 ring-inset ring-current` : 'hover:shadow-sm'}`}
                style={{ opacity: 0 }}
              >
                <div className={`p-2 rounded-xl ${meta.iconBg} shrink-0`}>
                  <Icon size={14} className={meta.iconColor} />
                </div>
                <div>
                  <p className="text-lg font-bold leading-none" style={{ color: '#e2ffe9' }}>{count}</p>
                  <p className="text-[10px] mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>{meta.label}</p>
                </div>
              </button>
            )
          })}
        </div>
      )}

      {/* Filters + Form */}
      {showForm && (
        <form ref={formRef} onSubmit={handleSubmit} className="card p-5 space-y-4" style={{ opacity: 0 }}>
          <div className="flex items-center justify-between">
            <h3 className="font-semibold" style={{ color: '#e2ffe9' }}>Nueva Alerta</h3>
            <button type="button" onClick={() => setShowForm(false)}
              className="p-1.5 rounded-lg hover:bg-[rgba(74,222,128,0.08)] transition-colors" style={{ color: 'rgba(255,255,255,0.35)' }}>
              <X size={16} />
            </button>
          </div>

          {/* Greenhouse selector */}
          <div>
            <label htmlFor="alert-greenhouse" className="block text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: 'rgba(255,255,255,0.35)' }}>
              Invernadero
            </label>
            <select
              id="alert-greenhouse"
              aria-label="Seleccionar invernadero para la alerta"
              value={form.greenhouse_id}
              onChange={e => setForm({ ...form, greenhouse_id: e.target.value === '' ? '' : parseInt(e.target.value) })}
              className="input-field"
            >
              <option value="">Global (todos los invernaderos)</option>
              {greenhouses.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: 'rgba(255,255,255,0.35)' }}>Mensaje *</label>
            <input type="text" placeholder="Describe la alerta..." value={form.message}
              onChange={e => setForm({ ...form, message: e.target.value })}
              className="input-field" required />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: 'rgba(255,255,255,0.35)' }}>Nivel</label>
            <div className="flex gap-2">
              {LEVELS.map(lvl => {
                const meta = LEVEL[lvl]
                return (
                  <button key={lvl} type="button"
                    onClick={() => setForm(f => ({ ...f, level: lvl }))}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border text-xs font-semibold transition-all duration-150
                      ${form.level === lvl
                        ? `${meta.cardBg} ${meta.cardBorder} ${meta.iconColor}`
                        : 'border-[rgba(74,222,128,0.12)] hover:border-green-400/20'}`}
                    style={form.level !== lvl ? { color: 'rgba(255,255,255,0.35)' } : {}}>
                    <meta.Icon size={12} />
                    {meta.label}
                  </button>
                )
              })}
            </div>
          </div>

          <button type="submit" className="w-full btn-primary py-2.5 text-sm">
            Crear alerta
          </button>
        </form>
      )}

      {/* Greenhouse filter */}
      {greenhouses.length > 0 && !loading && (
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setGhFilter('')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all duration-150
              ${ghFilter === '' ? 'bg-gray-800 text-white border-gray-800' : 'border-[rgba(74,222,128,0.12)] hover:border-green-400/20'}`}
            style={ghFilter !== '' ? { background: '#051a0a', color: 'rgba(255,255,255,0.5)' } : {}}>
            Todos
          </button>
          {greenhouses.map(g => (
            <button key={g.id}
              onClick={() => setGhFilter(prev => prev === g.id ? '' : g.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all duration-150
                ${ghFilter === g.id ? 'bg-green-600 text-white border-green-600' : 'border-[rgba(74,222,128,0.12)] hover:border-green-400/20'}`}
              style={ghFilter !== g.id ? { background: '#051a0a', color: 'rgba(255,255,255,0.5)' } : {}}>
              <Building2 size={10} className="inline mr-1" />{g.name}
            </button>
          ))}
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="skeleton h-16 rounded-2xl" />)}
        </div>
      ) : displayed.length === 0 ? (
        <div className="empty-state card p-10">
          <Bell size={40} className="empty-state-icon" />
          <p className="empty-state-title">
            {levelFilter !== 'ALL' || ghFilter !== '' ? 'Sin alertas con ese filtro' : 'No hay alertas recientes'}
          </p>
          <p className="empty-state-sub">El sistema monitoreará automáticamente los sensores.</p>
        </div>
      ) : (
        <div ref={listRef} className="space-y-2">
          {displayed.map(a => {
            const meta    = LEVEL[a.level] ?? LEVEL.INFO
            const Icon    = meta.Icon
            const ghLabel = ghName(a.greenhouseId)
            return (
              <div
                key={a.id}
                data-alert-id={a.id}
                role="article"
                aria-label={`Alerta ${meta.label}: ${a.message}`}
                className={`card p-4 border-l-4 ${meta.cardBorder} flex items-start gap-3
                  transition-all duration-200 ${a.read ? 'opacity-55' : ''}`}
              >
                {/* Level icon */}
                <div className={`p-2 rounded-xl ${meta.iconBg} shrink-0 mt-0.5`}>
                  <Icon size={14} className={meta.iconColor} />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-0.5">
                    <span className={meta.badge}>{meta.label}</span>
                    {ghLabel && (
                      <span className="badge-gray flex items-center gap-1">
                        <Building2 size={9} /> {ghLabel}
                      </span>
                    )}
                    {!a.read && (
                      <span className={`w-2 h-2 rounded-full ${meta.dot} animate-pulse`} />
                    )}
                  </div>
                  <p className="text-sm font-medium leading-snug" style={{ color: '#e2ffe9' }}>{a.message}</p>
                  {a.timestamp && (
                    <p className="text-[11px] mt-1" style={{ color: 'rgba(255,255,255,0.35)' }}>
                      {new Date(a.timestamp).toLocaleString('es-CO', {
                        day: '2-digit', month: 'short', year: 'numeric',
                        hour: '2-digit', minute: '2-digit',
                      })}
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 shrink-0">
                  {!a.read && (
                    <button
                      onClick={() => handleMarkRead(a.id)}
                      title="Marcar como leída"
                      className="p-1.5 rounded-lg hover:bg-[rgba(74,222,128,0.08)] hover:text-green-400 transition-colors" style={{ color: 'rgba(255,255,255,0.35)' }}>
                      <Check size={13} />
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(a.id)}
                    title="Eliminar"
                    className="p-1.5 rounded-lg hover:bg-[rgba(248,113,113,0.1)] hover:text-red-400 transition-colors" style={{ color: 'rgba(255,255,255,0.35)' }}>
                    <X size={13} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Load more */}
      {allFiltered.length > visibleCount && (
        <button
          onClick={() => setVisibleCount(c => c + 50)}
          className="w-full py-2.5 rounded-xl text-xs font-semibold border transition-all"
          style={{ background: 'rgba(74,222,128,0.06)', borderColor: 'rgba(74,222,128,0.2)', color: 'rgba(255,255,255,0.5)' }}
        >
          Ver más ({allFiltered.length - visibleCount} restantes)
        </button>
      )}

    </div>
  )
}
