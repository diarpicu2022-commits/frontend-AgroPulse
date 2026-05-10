import { useState, useEffect } from 'react'
import { Cpu } from 'lucide-react'
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

export default function RulesPage() {
  const [rules, setRules]         = useState<RuleItem[]>([])
  const [loading, setLoading]     = useState(true)
  const [showForm, setShowForm]   = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [error, setError]         = useState<string | null>(null)
  const [form, setForm]           = useState<RuleForm>({
    condition_type:  'temp_high',
    condition_value: 25,
    action_type:     'activate_extractor',
    enabled:         true,
  })

  useEffect(() => { loadRules() }, [])

  const loadRules = async () => {
    try {
      const data = await ruleRepository.list()
      setRules((data.rules || []) as unknown as RuleItem[])
      setError(null)
    } catch (err) {
      setError((err as Error).message)
    }
    setLoading(false)
  }

  const resetForm = () => {
    setForm({
      condition_type:  'temp_high',
      condition_value: 25,
      action_type:     'activate_extractor',
      enabled:         true,
    })
    setEditingId(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (editingId) {
        await ruleRepository.update(editingId, form as never)
      } else {
        await ruleRepository.create(form as never)
      }
      setShowForm(false)
      resetForm()
      loadRules()
    } catch (err) { alert('Error: ' + (err as Error).message) }
  }

  const handleEdit = (rule: RuleItem) => {
    setEditingId(rule.id)
    setForm({
      condition_type:  rule.condition_type,
      condition_value: rule.condition_value,
      action_type:     rule.action_type,
      enabled:         rule.enabled,
    })
    setShowForm(true)
  }

  const handleDelete = async (id: number) => {
    if (confirm('¿Eliminar esta regla?')) {
      try {
        await ruleRepository.remove(id)
        loadRules()
      } catch (err) { alert('Error: ' + (err as Error).message) }
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

  const conditionLabels: Record<string, string> = {
    temp_high:     '🔥 Temperatura alta',
    temp_low:      '❄️ Temperatura baja',
    humidity_high: '💦 Humedad alta',
    humidity_low:  '🏜️ Humedad baja',
    soil_dry:      '🏜️ Suelo seco',
  }

  const actionLabels: Record<string, string> = {
    activate_extractor: 'Activar extractor',
    activate_pump:      'Activar bomba',
    close_door:         'Cerrar puerta',
    open_door:          'Abrir puerta',
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-800">🤖 Automatización</h2>
          <p className="text-sm text-gray-600 mt-1">Crear reglas IF/THEN para automatizar actuadores</p>
        </div>
        {!showForm && (
          <button
            onClick={() => { setShowForm(true); resetForm() }}
            className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white px-5 py-2.5 rounded-xl text-sm font-medium shadow-md hover:shadow-lg transition-all duration-200 transform hover:scale-105 flex items-center gap-2">
            ➕ Nueva Regla
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl">
          ⚠️ Error: {error}
        </div>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-md border-2 border-purple-200 p-6 space-y-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-800">
              {editingId ? '✏️ Editar Regla' : '➕ Nueva Regla'}
            </h3>
            <button
              type="button"
              onClick={() => { setShowForm(false); resetForm() }}
              className="text-gray-500 hover:text-gray-700 text-2xl">✕</button>
          </div>

          <div className="bg-purple-50 rounded-xl p-4 border-2 border-purple-100 space-y-3">
            <p className="text-sm font-semibold text-purple-900">IF (Condición)</p>
            <select
              value={form.condition_type}
              onChange={e => setForm({...form, condition_type: e.target.value})}
              className="w-full border-2 border-purple-200 rounded-lg px-3 py-2 text-sm focus:border-purple-500 focus:outline-none">
              {Object.entries(conditionLabels).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Valor umbral</label>
              <input
                type="number"
                step="0.1"
                value={form.condition_value}
                onChange={e => setForm({...form, condition_value: parseFloat(e.target.value)})}
                className="w-full border-2 border-purple-200 rounded-lg px-3 py-2 text-sm focus:border-purple-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="bg-blue-50 rounded-xl p-4 border-2 border-blue-100 space-y-3">
            <p className="text-sm font-semibold text-blue-900">THEN (Acción)</p>
            <select
              value={form.action_type}
              onChange={e => setForm({...form, action_type: e.target.value})}
              className="w-full border-2 border-blue-200 rounded-lg px-3 py-2 text-sm focus:border-blue-500 focus:outline-none">
              {Object.entries(actionLabels).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>

          <label className="flex items-center gap-3 cursor-pointer p-3 bg-green-50 rounded-xl border-2 border-green-100">
            <input
              type="checkbox"
              checked={form.enabled}
              onChange={e => setForm({...form, enabled: e.target.checked})}
              className="w-5 h-5 text-green-600 rounded cursor-pointer"
            />
            <span className="text-sm font-semibold text-gray-800">✅ Regla activa</span>
          </label>

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white py-2.5 rounded-xl font-semibold transition-all duration-200 transform hover:scale-105">
              {editingId ? '💾 Actualizar' : '✨ Crear'}
            </button>
            <button
              type="button"
              onClick={() => { setShowForm(false); resetForm() }}
              className="flex-1 border-2 border-gray-300 text-gray-700 hover:bg-gray-50 py-2.5 rounded-xl font-semibold transition-colors">
              Cancelar
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-40"><div className="animate-spin text-4xl">🤖</div></div>
      ) : rules.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Cpu size={48} className="mx-auto mb-3 opacity-40" />
          <p className="text-lg font-medium">No hay reglas de automatización</p>
          <button
            onClick={() => { setShowForm(true); resetForm() }}
            className="text-purple-600 text-sm mt-3 hover:text-purple-700 font-semibold">
            ➕ Crear la primera regla
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {rules.map(rule => (
            <div key={rule.id}
              className={`bg-white rounded-2xl shadow-sm border-2 p-4 transition-all ${
                rule.enabled ? 'border-green-200' : 'border-gray-200'
              }`}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="mt-2 space-y-1 text-sm">
                    <p className="text-gray-600">
                      <span className="font-semibold">IF</span> {conditionLabels[rule.condition_type] || rule.condition_type} &gt; {rule.condition_value}
                    </p>
                    <p className="text-gray-600">
                      <span className="font-semibold">THEN</span> {actionLabels[rule.action_type] || rule.action_type}
                    </p>
                  </div>
                </div>
                <span className={`text-xs px-3 py-1 rounded-full font-semibold ${
                  rule.enabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                }`}>
                  {rule.enabled ? '✅ Activa' : '⏸️ Inactiva'}
                </span>
              </div>

              <div className="flex gap-2 pt-3 border-t border-gray-200">
                <button
                  onClick={() => toggleEnabled(rule.id)}
                  className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${
                    rule.enabled
                      ? 'bg-green-100 text-green-700 hover:bg-green-200'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}>
                  {rule.enabled ? '⏸️ Desactivar' : '▶️ Activar'}
                </button>
                <button
                  onClick={() => handleEdit(rule)}
                  className="flex-1 border-2 border-blue-300 text-blue-600 hover:bg-blue-50 py-2 rounded-lg text-sm font-semibold transition-colors">
                  ✏️ Editar
                </button>
                <button
                  onClick={() => handleDelete(rule.id)}
                  className="flex-1 border-2 border-red-300 text-red-600 hover:bg-red-50 py-2 rounded-lg text-sm font-semibold transition-colors">
                  🗑️ Eliminar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
