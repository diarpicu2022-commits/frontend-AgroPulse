import { useState, useEffect, useRef } from 'react'
import { Cpu, Plus, X, Edit2, Trash2, ArrowRight } from 'lucide-react'
import anime from 'animejs'
import { ruleRepository } from '../repositories'

interface RuleItem {
  id: number
  condition_type: string
  condition_value: number
  action_type: string
  enabled: boolean
}

interface RuleForm {
  condition_type: string
  condition_value: number
  action_type: string
  enabled: boolean
}

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

export default function RulesPage() {
  const [rules,      setRules]      = useState<RuleItem[]>([])
  const [loading,    setLoading]    = useState(true)
  const [showForm,   setShowForm]   = useState(false)
  const [editingId,  setEditingId]  = useState<number | null>(null)
  const [error,      setError]      = useState<string | null>(null)
  const [form, setForm] = useState<RuleForm>({
    condition_type: 'temp_high', condition_value: 25,
    action_type: 'activate_extractor', enabled: true,
  })
  const listRef = useRef<HTMLDivElement>(null)
  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => { loadRules() }, [])

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
      setRules((data.rules || []) as unknown as RuleItem[])
      setError(null)
    } catch (err) { setError((err as Error).message) }
    setLoading(false)
  }

  const resetForm = () => {
    setForm({ condition_type: 'temp_high', condition_value: 25, action_type: 'activate_extractor', enabled: true })
    setEditingId(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (editingId) await ruleRepository.update(editingId, form as never)
      else           await ruleRepository.create(form as never)
      setShowForm(false); resetForm(); loadRules()
    } catch (err) { alert('Error: ' + (err as Error).message) }
  }

  const handleEdit = (rule: RuleItem) => {
    setEditingId(rule.id)
    setForm({ condition_type: rule.condition_type, condition_value: rule.condition_value, action_type: rule.action_type, enabled: rule.enabled })
    setShowForm(true)
  }

  const handleDelete = async (id: number) => {
    if (confirm('¿Eliminar esta regla?')) {
      try { await ruleRepository.remove(id); loadRules() }
      catch (err) { alert('Error: ' + (err as Error).message) }
    }
  }

  const toggleEnabled = async (id: number) => {
    const rule = rules.find(r => r.id === id)
    if (!rule) return
    try {
      await ruleRepository.update(id, { ...rule, enabled: !rule.enabled } as never)
      loadRules()
    } catch (err) { alert('Error: ' + (err as Error).message) }
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="section-title">Automatización</h2>
          <p className="section-subtitle">Reglas IF/THEN para automatizar actuadores</p>
        </div>
        {!showForm && (
          <button onClick={() => { setShowForm(true); resetForm() }} className="btn-primary px-4 py-2 text-sm">
            <Plus size={14} /> Nueva regla
          </button>
        )}
      </div>

      {error && <div className="alert-danger text-sm">{error}</div>}

      {/* Form */}
      {showForm && (
        <form ref={formRef} onSubmit={handleSubmit} className="card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-800">{editingId ? 'Editar Regla' : 'Nueva Regla IF / THEN'}</h3>
            <button type="button" onClick={() => { setShowForm(false); resetForm() }}
              className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
              <X size={16} />
            </button>
          </div>

          <div className="bg-amber-50 rounded-2xl p-4 border border-amber-100 space-y-3">
            <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide">IF — Condición</p>
            <select value={form.condition_type}
              onChange={e => setForm({ ...form, condition_type: e.target.value })} className="input-field">
              {Object.entries(CONDITION_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">Valor umbral</label>
              <input type="number" step="0.1" value={form.condition_value}
                onChange={e => setForm({ ...form, condition_value: parseFloat(e.target.value) })}
                className="input-field" />
            </div>
          </div>

          <div className="bg-green-50 rounded-2xl p-4 border border-green-100 space-y-3">
            <p className="text-xs font-semibold text-green-700 uppercase tracking-wide">THEN — Acción</p>
            <select value={form.action_type}
              onChange={e => setForm({ ...form, action_type: e.target.value })} className="input-field">
              {Object.entries(ACTION_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>

          <label className="flex items-center gap-3 cursor-pointer select-none p-3 bg-gray-50 rounded-2xl border border-gray-100">
            <input type="checkbox" checked={form.enabled}
              onChange={e => setForm({ ...form, enabled: e.target.checked })}
              className="w-4 h-4 text-green-600 rounded cursor-pointer" />
            <span className="text-sm font-medium text-gray-700">Regla activa</span>
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
      ) : rules.length === 0 ? (
        <div className="empty-state card p-10">
          <Cpu size={40} className="empty-state-icon" />
          <p className="empty-state-title">No hay reglas de automatización</p>
          <p className="empty-state-sub">Crea reglas para automatizar tus actuadores según lecturas de sensores.</p>
          <button onClick={() => { setShowForm(true); resetForm() }} className="btn-primary px-4 py-2 text-sm mt-4">
            <Plus size={14} /> Primera regla
          </button>
        </div>
      ) : (
        <div ref={listRef} className="space-y-3">
          {rules.map(rule => (
            <div key={rule.id}
              className={`card p-4 transition-all duration-200 ${rule.enabled ? 'ring-1 ring-green-200' : 'opacity-70'}`}>
              <div className="flex items-center gap-3">
                {/* IF block */}
                <div className="flex-1 min-w-0 bg-amber-50 rounded-xl px-3 py-2 border border-amber-100">
                  <p className="text-[10px] font-semibold text-amber-600 uppercase tracking-wide mb-0.5">IF</p>
                  <p className="text-sm font-semibold text-gray-800">
                    {CONDITION_LABELS[rule.condition_type] || rule.condition_type}
                  </p>
                  <p className="text-xs text-gray-500">umbral: {rule.condition_value}</p>
                </div>

                <ArrowRight size={16} className="text-gray-300 shrink-0" />

                {/* THEN block */}
                <div className="flex-1 min-w-0 bg-green-50 rounded-xl px-3 py-2 border border-green-100">
                  <p className="text-[10px] font-semibold text-green-600 uppercase tracking-wide mb-0.5">THEN</p>
                  <p className="text-sm font-semibold text-gray-800">
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
                      className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors text-xs font-medium">
                      {rule.enabled ? 'Pausar' : 'Activar'}
                    </button>
                    <button onClick={() => handleEdit(rule)}
                      className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-400 hover:text-blue-600 transition-colors">
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
          ))}
        </div>
      )}
    </div>
  )
}
