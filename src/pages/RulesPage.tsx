import { useState, useEffect, useRef } from 'react'
import { Cpu, Plus, X, Edit2, Trash2, ArrowRight, Building2, Sprout } from 'lucide-react'
import anime from 'animejs'
import { ruleRepository, greenhouseRepository } from '../repositories'
import type { GreenhouseDto } from '../types'

interface RuleItem {
  id: number
  condition_type: string
  condition_value: number
  action_type: string
  enabled: boolean
  greenhouseId?: number
}

interface RuleForm {
  condition_type: string
  condition_value: number
  action_type: string
  enabled: boolean
  greenhouse_id: number | ''
}

const RULES_CACHE = 'agropulse_rules_v1'

const CONDITION_LABELS: Record<string, string> = {
  temp_high:     'Temperatura alta',
  temp_low:      'Temperatura baja',
  humidity_high: 'Humedad alta',
  humidity_low:  'Humedad baja',
  soil_dry:      'Suelo seco',
}

const ACTION_LABELS: Record<string, string> = {
  activate_extractor: 'Activar extractor',
  activate_pump:      'Activar bomba',
  close_door:         'Cerrar puerta',
  open_door:          'Abrir puerta',
}

const EMPTY_FORM: RuleForm = {
  condition_type: 'temp_high',
  condition_value: 25,
  action_type: 'activate_extractor',
  enabled: true,
  greenhouse_id: '',
}

function saveCache(items: RuleItem[]) {
  try { localStorage.setItem(RULES_CACHE, JSON.stringify(items)) } catch {}
}

export default function RulesPage() {
  const [rules,       setRules]       = useState<RuleItem[]>([])
  const [greenhouses, setGreenhouses] = useState<GreenhouseDto[]>([])
  const [loading,     setLoading]     = useState(true)
  const [showForm,    setShowForm]    = useState(false)
  const [editingId,   setEditingId]   = useState<number | null>(null)
  const [ghFilter,    setGhFilter]    = useState<number | ''>('')
  const [error,       setError]       = useState<string | null>(null)
  const [form, setForm] = useState<RuleForm>(EMPTY_FORM)
  const listRef   = useRef<HTMLDivElement>(null)
  const formRef   = useRef<HTMLFormElement>(null)
  const headerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(RULES_CACHE)
      if (raw) {
        const cached = JSON.parse(raw) as RuleItem[]
        if (cached.length > 0) { setRules(cached); setLoading(false) }
      }
    } catch {}
    loadRules()
    greenhouseRepository.list().then(d => setGreenhouses(d.greenhouses || [])).catch(() => {})
  }, [])

  useEffect(() => {
    if (!headerRef.current) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced) return
    anime({ targets: headerRef.current, opacity: [0, 1], translateY: [-10, 0], duration: 400, easing: 'easeOutCubic' })
  }, [])

  useEffect(() => {
    if (!listRef.current || loading || rules.length === 0) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced) return
    anime({
      targets:    Array.from(listRef.current.children) as Element[],
      opacity:    [0, 1],
      translateY: [12, 0],
      delay:      anime.stagger(50),
      duration:   340,
      easing:     'easeOutCubic',
    })
  }, [loading, rules.length])

  useEffect(() => {
    if (!formRef.current || !showForm) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced) return
    anime({ targets: formRef.current, opacity: [0, 1], scaleY: [0.94, 1], duration: 260, easing: 'easeOutBack' })
  }, [showForm])

  const loadRules = async () => {
    try {
      const data = await ruleRepository.list()
      const list = (data.rules || []) as unknown as RuleItem[]
      if (list.length > 0) { setRules(list); saveCache(list) }
      setError(null)
    } catch (err) { setError((err as Error).message) }
    setLoading(false)
  }

  const resetForm = (ghId?: number | '') => {
    setForm({ ...EMPTY_FORM, greenhouse_id: ghId !== undefined ? ghId : ghFilter })
    setEditingId(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (ghFilter === '' && !editingId) return
    try {
      const payload = { ...form, greenhouseId: form.greenhouse_id || undefined }
      if (editingId) {
        await ruleRepository.update(editingId, payload as never)
        const updated = rules.map(r =>
          r.id === editingId
            ? { ...r, ...form, greenhouseId: Number(form.greenhouse_id) || r.greenhouseId }
            : r
        )
        setRules(updated)
        saveCache(updated)
      } else {
        const result = await ruleRepository.create(payload as never)
        const newRule: RuleItem = {
          id:              (result as { id?: number }).id ?? Date.now(),
          condition_type:  form.condition_type,
          condition_value: form.condition_value,
          action_type:     form.action_type,
          enabled:         form.enabled,
          greenhouseId:    ghFilter as number,
        }
        const updated = [...rules, newRule]
        setRules(updated)
        saveCache(updated)
        setTimeout(() => {
          if (!listRef.current) return
          const last = listRef.current.lastElementChild as HTMLElement | null
          if (!last) return
          anime({ targets: last, backgroundColor: ['#dcfce7', '#ffffff'], duration: 800, easing: 'easeOutCubic' })
        }, 60)
      }
      setShowForm(false)
      resetForm()
    } catch (err) { alert('Error: ' + (err as Error).message) }
  }

  const handleEdit = (rule: RuleItem) => {
    setEditingId(rule.id)
    setForm({
      condition_type:  rule.condition_type,
      condition_value: rule.condition_value,
      action_type:     rule.action_type,
      enabled:         rule.enabled,
      greenhouse_id:   rule.greenhouseId ?? '',
    })
    setShowForm(true)
  }

  const handleDelete = async (id: number) => {
    if (!confirm('¿Eliminar esta regla?')) return
    const card = document.getElementById(`rule-card-${id}`)
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
    try { await ruleRepository.remove(id) } catch {}
    const updated = rules.filter(r => r.id !== id)
    setRules(updated)
    saveCache(updated)
  }

  const toggleEnabled = async (id: number) => {
    const rule = rules.find(r => r.id === id)
    if (!rule) return
    try {
      await ruleRepository.update(id, { ...rule, enabled: !rule.enabled } as never)
      const updated = rules.map(r => r.id === id ? { ...r, enabled: !r.enabled } : r)
      setRules(updated)
      saveCache(updated)
    } catch (err) { alert('Error: ' + (err as Error).message) }
  }

  const ghName = (id?: number) => {
    if (!id) return null
    return greenhouses.find(g => g.id === id)?.name ?? `#${id}`
  }

  const displayed = ghFilter !== ''
    ? rules.filter(r => r.greenhouseId === ghFilter)
    : rules

  return (
    <div className="space-y-5">
      {/* Header */}
      <div ref={headerRef} className="flex items-start justify-between gap-3">
        <div>
          <h2 className="section-title">Automatización</h2>
          <p className="section-subtitle">Reglas IF/THEN para automatizar actuadores</p>
        </div>
        {!showForm && ghFilter !== '' && (
          <button onClick={() => { resetForm(ghFilter); setShowForm(true) }} className="btn-primary px-4 py-2 text-sm">
            <Plus size={14} /> Nueva regla
          </button>
        )}
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
        <div className="flex items-center gap-2.5 px-4 py-3 rounded-2xl text-xs font-medium" style={{ background: 'rgba(99,179,237,0.08)', border: '1px solid rgba(99,179,237,0.2)', color: 'rgba(147,210,255,0.8)' }}>
          <Building2 size={14} className="shrink-0" />
          Selecciona un invernadero para crear reglas de automatización
        </div>
      )}

      {error && <div className="alert-danger text-sm">{error}</div>}

      {/* Form */}
      {showForm && (
        <form ref={formRef} onSubmit={handleSubmit} className="card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold" style={{ color: '#e2ffe9' }}>{editingId ? 'Editar Regla' : 'Nueva Regla IF / THEN'}</h3>
            <button type="button" onClick={() => { setShowForm(false); resetForm() }}
              className="p-1.5 rounded-lg hover:bg-[rgba(74,222,128,0.08)] transition-colors" style={{ color: 'rgba(255,255,255,0.35)' }}>
              <X size={16} />
            </button>
          </div>

          {/* Greenhouse indicator */}
          {(form.greenhouse_id !== '' || ghFilter !== '') && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs" style={{ background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.2)', color: '#4ade80' }}>
              <Building2 size={13} />
              <span className="font-semibold">Invernadero:</span>
              {ghName(Number(form.greenhouse_id !== '' ? form.greenhouse_id : ghFilter))}
            </div>
          )}

          <div className="rounded-2xl p-4 space-y-3" style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)' }}>
            <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'rgba(253,211,77,0.9)' }}>IF — Condición</p>
            <select value={form.condition_type}
              onChange={e => setForm({ ...form, condition_type: e.target.value })} className="input-field">
              {Object.entries(CONDITION_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: 'rgba(255,255,255,0.35)' }}>Valor umbral</label>
              <input type="number" step="0.1" value={form.condition_value}
                onChange={e => setForm({ ...form, condition_value: parseFloat(e.target.value) })}
                className="input-field" />
            </div>
          </div>

          <div className="rounded-2xl p-4 space-y-3" style={{ background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.2)' }}>
            <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'rgba(134,239,172,0.9)' }}>THEN — Acción</p>
            <select value={form.action_type}
              onChange={e => setForm({ ...form, action_type: e.target.value })} className="input-field">
              {Object.entries(ACTION_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>

          <label className="flex items-center gap-3 cursor-pointer select-none p-3 rounded-2xl border border-[rgba(74,222,128,0.12)]" style={{ background: 'rgba(74,222,128,0.06)' }}>
            <input type="checkbox" checked={form.enabled}
              onChange={e => setForm({ ...form, enabled: e.target.checked })}
              className="w-4 h-4 text-green-600 rounded cursor-pointer" />
            <span className="text-sm font-medium" style={{ color: 'rgba(255,255,255,0.7)' }}>Regla activa</span>
          </label>

          <div className="flex gap-3">
            <button type="submit" className="flex-1 btn-primary py-2.5 text-sm">
              {editingId ? 'Actualizar' : 'Crear regla'}
            </button>
            <button type="button" onClick={() => { setShowForm(false); resetForm() }}
              className="flex-1 btn-secondary py-2.5 text-sm">Cancelar</button>
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
          <Cpu size={40} className="empty-state-icon" />
          <p className="empty-state-title">
            {ghFilter !== '' ? `Sin reglas en ${ghName(ghFilter as number)}` : 'No hay reglas de automatización'}
          </p>
          <p className="empty-state-sub">
            {ghFilter !== ''
              ? 'Crea una regla para automatizar este invernadero.'
              : 'Selecciona un invernadero para crear reglas.'}
          </p>
          {ghFilter !== '' && (
            <button onClick={() => { resetForm(ghFilter); setShowForm(true) }} className="btn-primary px-4 py-2 text-sm mt-4">
              <Plus size={14} /> Primera regla
            </button>
          )}
        </div>
      ) : (
        <div ref={listRef} className="space-y-3">
          {displayed.map(rule => {
            const gName = ghName(rule.greenhouseId)
            return (
              <div key={rule.id} id={`rule-card-${rule.id}`}
                className={`card p-4 transition-all duration-200 ${rule.enabled ? 'ring-1 ring-green-500/30' : 'opacity-70'}`}>
                <div className="flex items-center gap-3">
                  {/* IF block */}
                  <div className="flex-1 min-w-0 rounded-xl px-3 py-2" style={{ background: 'rgba(251,191,36,0.07)', border: '1px solid rgba(251,191,36,0.18)' }}>
                    <p className="text-[10px] font-semibold uppercase tracking-wide mb-0.5" style={{ color: 'rgba(253,211,77,0.8)' }}>IF</p>
                    <p className="text-sm font-semibold" style={{ color: '#e2ffe9' }}>
                      {CONDITION_LABELS[rule.condition_type] || rule.condition_type}
                    </p>
                    <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>umbral: {rule.condition_value}</p>
                    {gName && (
                      <span className="inline-flex items-center gap-1 mt-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-lg" style={{ color: '#4ade80', background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.18)' }}>
                        <Building2 size={9} /> {gName}
                      </span>
                    )}
                  </div>

                  <ArrowRight size={16} className="text-gray-300 shrink-0" />

                  {/* THEN block */}
                  <div className="flex-1 min-w-0 rounded-xl px-3 py-2" style={{ background: 'rgba(74,222,128,0.07)', border: '1px solid rgba(74,222,128,0.18)' }}>
                    <p className="text-[10px] font-semibold uppercase tracking-wide mb-0.5" style={{ color: 'rgba(134,239,172,0.8)' }}>THEN</p>
                    <p className="text-sm font-semibold" style={{ color: '#e2ffe9' }}>
                      {ACTION_LABELS[rule.action_type] || rule.action_type}
                    </p>
                  </div>

                  {/* Status + actions */}
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <span className={rule.enabled ? 'badge-green' : 'badge-gray'}>
                      {rule.enabled ? 'Activa' : 'Inactiva'}
                    </span>
                    <div className="flex gap-1">
                      <button onClick={() => toggleEnabled(rule.id)}
                        className="p-1.5 rounded-lg hover:bg-[rgba(74,222,128,0.08)] transition-colors text-xs font-medium" style={{ color: 'rgba(255,255,255,0.35)' }}>
                        {rule.enabled ? 'Pausar' : 'Activar'}
                      </button>
                      <button onClick={() => handleEdit(rule)}
                        className="p-1.5 rounded-lg hover:bg-blue-500/10 text-blue-400 hover:text-blue-300 transition-colors">
                        <Edit2 size={13} />
                      </button>
                      <button onClick={() => handleDelete(rule.id)}
                        className="p-1.5 rounded-lg hover:bg-red-50 text-red-400 hover:text-red-600 transition-colors">
                        <Trash2 size={13} />
                      </button>
                    </div>
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
