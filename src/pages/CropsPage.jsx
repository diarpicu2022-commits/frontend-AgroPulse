import { useState, useEffect } from 'react'
import { Sprout, Sparkles } from 'lucide-react'
import api from '../services/api'
import { callAI } from '../services/ai-service'

export default function CropsPage() {
  const [crops, setCrops] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiProvider, setAiProvider] = useState('')
  const [error, setError] = useState(null)
  const [form, setForm] = useState({
    name: '', variety: '',
    temp_min: 15, temp_max: 25,
    humidity_min: 50, humidity_max: 70,
    soil_moisture_min: 40, soil_moisture_max: 60,
    active: 0
  })

  const fillRangesWithAI = async () => {
    if (!form.name.trim()) { alert('Ingresa el nombre del cultivo primero'); return }
    setAiLoading(true)
    setAiProvider('')
    const prompt = `Dame los rangos óptimos para cultivo de invernadero de "${form.name}"${form.variety ? ` variedad "${form.variety}"` : ''}.
Responde SOLO con JSON válido sin markdown, con este formato exacto:
{"temp_min":18,"temp_max":26,"humidity_min":60,"humidity_max":80,"soil_moisture_min":50,"soil_moisture_max":70}`
    try {
      const result = await callAI(prompt, '')
      const text = result.text.trim()
      const jsonStr = text.match(/\{[\s\S]*\}/)?.[0]
      if (jsonStr) {
        const ranges = JSON.parse(jsonStr)
        setForm(f => ({
          ...f,
          temp_min:          ranges.temp_min          ?? f.temp_min,
          temp_max:          ranges.temp_max          ?? f.temp_max,
          humidity_min:      ranges.humidity_min      ?? f.humidity_min,
          humidity_max:      ranges.humidity_max      ?? f.humidity_max,
          soil_moisture_min: ranges.soil_moisture_min ?? f.soil_moisture_min,
          soil_moisture_max: ranges.soil_moisture_max ?? f.soil_moisture_max,
        }))
        setAiProvider(result.provider || 'IA')
      } else {
        alert('La IA no pudo generar rangos. Intenta de nuevo.')
      }
    } catch (err) {
      alert('Error consultando IA: ' + err.message)
    } finally { setAiLoading(false) }
  }

  useEffect(() => { loadCrops() }, [])

  const loadCrops = async () => {
    try {
      const data = await api.crops.list()
      setCrops(data.crops || [])
      setError(null)
    } catch (err) { setError(err.message) }
    setLoading(false)
  }

  const resetForm = () => {
    setForm({ name: '', variety: '', temp_min: 15, temp_max: 25, humidity_min: 50, humidity_max: 70, soil_moisture_min: 40, soil_moisture_max: 60, active: 0 })
    setEditingId(null)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      if (editingId) await api.crops.update(editingId, form)
      else await api.crops.create(form)
      setShowForm(false); resetForm(); loadCrops()
    } catch (err) { alert('Error: ' + err.message) }
  }

  const handleEdit = (crop) => {
    setEditingId(crop.id)
    setForm({ name: crop.name, variety: crop.variety || '', temp_min: crop.temp_min || 15, temp_max: crop.temp_max || 25, humidity_min: crop.humidity_min || 50, humidity_max: crop.humidity_max || 70, soil_moisture_min: crop.soil_moisture_min || 40, soil_moisture_max: crop.soil_moisture_max || 60, active: crop.active ? 1 : 0 })
    setShowForm(true)
  }

  const handleDelete = async (id, name) => {
    if (confirm(`¿Estás seguro de eliminar el cultivo "${name}"?`)) {
      try { await api.crops.delete(id); loadCrops() }
      catch (err) { alert('Error: ' + err.message) }
    }
  }

  const RangeBar = ({ label, min, max, unit, color }) => (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-gray-500">{label}</span>
        <span className="font-medium text-gray-700">{min} - {max} {unit}</span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ marginLeft: `${(min / (max * 1.5)) * 100}%`, width: `${((max - min) / (max * 1.5)) * 100}%` }} />
      </div>
    </div>
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-800">🌿 Cultivos</h2>
          <p className="text-sm text-gray-600 mt-1">Crear, editar y gestionar cultivos</p>
        </div>
        {!showForm && (
          <button onClick={() => { setShowForm(true); resetForm() }}
            className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white px-5 py-2.5 rounded-xl text-sm font-medium shadow-md hover:shadow-lg transition-all duration-200 transform hover:scale-105 flex items-center gap-2">
            ✨ Nuevo Cultivo
          </button>
        )}
      </div>
      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">⚠️ {error}</div>}

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-md border-2 border-green-200 p-6 space-y-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-800">{editingId ? '✏️ Editar Cultivo' : '➕ Nuevo Cultivo'}</h3>
            <button type="button" onClick={() => { setShowForm(false); resetForm() }} className="text-gray-500 hover:text-gray-700 text-2xl">✕</button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del cultivo *</label>
              <input type="text" placeholder="Tomate, Lechuga, etc." value={form.name} onChange={e => setForm({...form, name: e.target.value})} className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:border-green-500 focus:outline-none transition-colors" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Variedad</label>
              <input type="text" placeholder="Variedad (opcional)" value={form.variety} onChange={e => setForm({...form, variety: e.target.value})} className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:border-green-500 focus:outline-none transition-colors" />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button type="button" onClick={fillRangesWithAI} disabled={aiLoading}
              className="flex items-center gap-2 bg-gradient-to-r from-purple-500 to-violet-500 hover:from-purple-600 hover:to-violet-600 disabled:from-gray-400 disabled:to-gray-400 text-white px-4 py-2.5 rounded-xl text-sm font-medium shadow-md transition-all transform hover:scale-105 disabled:scale-100">
              {aiLoading ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Consultando IA...</> : <><Sparkles size={15} /> Rellenar rangos con IA</>}
            </button>
            {aiProvider && <span className="text-xs bg-purple-100 text-purple-700 px-2.5 py-1 rounded-full font-medium">✨ {aiProvider}</span>}
          </div>
          <div className="bg-orange-50 rounded-xl p-4 border-2 border-orange-100">
            <p className="text-sm font-semibold text-orange-900 mb-3">🌡️ Rango de Temperatura</p>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="block text-xs font-medium text-gray-700 mb-1">Mínima (°C)</label><input type="number" step="0.1" value={form.temp_min} onChange={e => setForm({...form, temp_min: parseFloat(e.target.value)})} className="w-full border-2 border-orange-200 rounded-lg px-3 py-2 text-sm focus:border-orange-500 focus:outline-none" /></div>
              <div><label className="block text-xs font-medium text-gray-700 mb-1">Máxima (°C)</label><input type="number" step="0.1" value={form.temp_max} onChange={e => setForm({...form, temp_max: parseFloat(e.target.value)})} className="w-full border-2 border-orange-200 rounded-lg px-3 py-2 text-sm focus:border-orange-500 focus:outline-none" /></div>
            </div>
          </div>
          <div className="bg-cyan-50 rounded-xl p-4 border-2 border-cyan-100">
            <p className="text-sm font-semibold text-cyan-900 mb-3">💧 Rango de Humedad</p>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="block text-xs font-medium text-gray-700 mb-1">Mínima (%)</label><input type="number" min="0" max="100" value={form.humidity_min} onChange={e => setForm({...form, humidity_min: parseInt(e.target.value)})} className="w-full border-2 border-cyan-200 rounded-lg px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none" /></div>
              <div><label className="block text-xs font-medium text-gray-700 mb-1">Máxima (%)</label><input type="number" min="0" max="100" value={form.humidity_max} onChange={e => setForm({...form, humidity_max: parseInt(e.target.value)})} className="w-full border-2 border-cyan-200 rounded-lg px-3 py-2 text-sm focus:border-cyan-500 focus:outline-none" /></div>
            </div>
          </div>
          <div className="bg-green-50 rounded-xl p-4 border-2 border-green-100">
            <p className="text-sm font-semibold text-green-900 mb-3">🌱 Rango de Humedad del Suelo</p>
            <div className="grid grid-cols-2 gap-4">
              <div><label className="block text-xs font-medium text-gray-700 mb-1">Mínima (%)</label><input type="number" min="0" max="100" value={form.soil_moisture_min} onChange={e => setForm({...form, soil_moisture_min: parseInt(e.target.value)})} className="w-full border-2 border-green-200 rounded-lg px-3 py-2 text-sm focus:border-green-500 focus:outline-none" /></div>
              <div><label className="block text-xs font-medium text-gray-700 mb-1">Máxima (%)</label><input type="number" min="0" max="100" value={form.soil_moisture_max} onChange={e => setForm({...form, soil_moisture_max: parseInt(e.target.value)})} className="w-full border-2 border-green-200 rounded-lg px-3 py-2 text-sm focus:border-green-500 focus:outline-none" /></div>
            </div>
          </div>
          <div>
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={form.active === 1 || form.active === true} onChange={e => setForm({...form, active: e.target.checked ? 1 : 0})} className="w-4 h-4 text-green-600 rounded cursor-pointer" />
              <span className="text-sm font-medium text-gray-700">✅ Cultivo Activo</span>
            </label>
          </div>
          <div className="flex gap-3 pt-2">
            <button type="submit" className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white py-2.5 rounded-xl font-semibold transition-all duration-200 transform hover:scale-105 flex items-center justify-center gap-2">
              {editingId ? '💾 Actualizar' : '✨ Crear'}
            </button>
            <button type="button" onClick={() => { setShowForm(false); resetForm() }} className="flex-1 border-2 border-gray-300 text-gray-700 hover:bg-gray-50 py-2.5 rounded-xl font-semibold transition-colors">Cancelar</button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-40"><div className="animate-spin text-4xl">🌿</div></div>
      ) : crops.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Sprout size={48} className="mx-auto mb-3 opacity-40" />
          <p className="text-lg font-medium">No hay cultivos</p>
          <button onClick={() => { setShowForm(true); resetForm() }} className="text-green-600 text-sm mt-3 hover:text-green-700 font-semibold">➕ Crear el primer cultivo</button>
        </div>
      ) : (
        <div className="space-y-3">
          {crops.map(c => {
            const isActive = c.active === 1 || c.active === true
            return (
              <div key={c.id} className={`bg-white rounded-2xl shadow-sm border-2 p-5 transition-all duration-200 hover:shadow-md ${isActive ? 'border-green-200 bg-green-50/30' : 'border-gray-200'}`}>
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-2xl">{isActive ? '🌿' : '🍂'}</span>
                      <div>
                        <p className="text-base font-bold text-gray-800">{c.name}</p>
                        {c.variety && <p className="text-xs text-gray-500">{c.variety}</p>}
                      </div>
                    </div>
                  </div>
                  <span className={`text-xs px-3 py-1 rounded-full font-semibold ${isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                    {isActive ? '✅ Activo' : '⏸️ Inactivo'}
                  </span>
                </div>
                <div className="space-y-3 mb-4">
                  {c.temp_min != null && c.temp_max != null && <RangeBar label="🌡️ Temperatura" min={c.temp_min} max={c.temp_max} unit="°C" color="bg-orange-400" />}
                  {c.humidity_min != null && c.humidity_max != null && <RangeBar label="💧 Humedad" min={c.humidity_min} max={c.humidity_max} unit="%" color="bg-cyan-400" />}
                  {c.soil_moisture_min != null && c.soil_moisture_max != null && <RangeBar label="🌱 Humedad Suelo" min={c.soil_moisture_min} max={c.soil_moisture_max} unit="%" color="bg-green-400" />}
                </div>
                <div className="flex gap-2 pt-3 border-t border-gray-200">
                  <button onClick={() => handleEdit(c)} className="flex-1 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white py-2 rounded-lg text-sm font-semibold transition-all duration-200 transform hover:scale-105 flex items-center justify-center gap-2">✏️ Editar</button>
                  <button onClick={() => handleDelete(c.id, c.name)} className="flex-1 bg-gradient-to-r from-red-500 to-rose-500 hover:from-red-600 hover:to-rose-600 text-white py-2 rounded-lg text-sm font-semibold transition-all duration-200 transform hover:scale-105 flex items-center justify-center gap-2">🗑️ Eliminar</button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
