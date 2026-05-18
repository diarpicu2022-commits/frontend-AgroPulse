import { useState, useEffect, useRef } from 'react'
import { Sprout, Sparkles, Plus, X, Edit2, Trash2, Building2 } from 'lucide-react'
import anime from 'animejs'
import { cropRepository, greenhouseRepository } from '../repositories'
import { callAI } from '../services/ai-service'
import type { CropDto, GreenhouseDto } from '../types'

interface CropForm {
  name: string
  variety: string
  greenhouse_id: number | ''
  temp_min: number
  temp_max: number
  humidity_min: number
  humidity_max: number
  soil_moisture_min: number
  soil_moisture_max: number
  active: number | boolean
}

interface RangeBarProps { label: string; min: number; max: number; unit: string; color: string; scaleMax: number }

// Fixed scale so the bar position makes intuitive sense (15–25 °C shows in the cool-moderate zone)
const RangeBar = ({ label, min, max, unit, color, scaleMax }: RangeBarProps) => {
  const leftPct  = Math.max(0, (min / scaleMax) * 100)
  const widthPct = Math.max(2, ((max - min) / scaleMax) * 100)
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span style={{ color: 'rgba(255,255,255,0.35)' }}>{label}</span>
        <span className="font-medium" style={{ color: 'rgba(255,255,255,0.7)' }}>{min}–{max} {unit}</span>
      </div>
      <div className="relative h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(74,222,128,0.1)' }}>
        <div className={`absolute top-0 h-full rounded-full ${color}`}
          style={{ left: `${leftPct}%`, width: `${widthPct}%` }} />
      </div>
      <div className="flex justify-between text-[10px] text-gray-400">
        <span style={{ color: 'rgba(255,255,255,0.35)' }}>0</span>
        <span style={{ color: 'rgba(255,255,255,0.35)' }}>{scaleMax} {unit}</span>
      </div>
    </div>
  )
}

const CROPS_CACHE = 'agropulse_crops_v1'
const saveCropsCache = (list: CropDto[]) => {
  try { localStorage.setItem(CROPS_CACHE, JSON.stringify(list)) } catch {}
}

const EMPTY_FORM: CropForm = {
  name: '', variety: '', greenhouse_id: '',
  temp_min: 15, temp_max: 25,
  humidity_min: 50, humidity_max: 70,
  soil_moisture_min: 40, soil_moisture_max: 60,
  active: 0,
}

export default function CropsPage() {
  const [crops,       setCrops]       = useState<CropDto[]>([])
  const [greenhouses, setGreenhouses] = useState<GreenhouseDto[]>([])
  const [filterGhId,  setFilterGhId]  = useState<number | ''>('')
  const [loading,     setLoading]     = useState(true)
  const [showForm,    setShowForm]    = useState(false)
  const [editingId,   setEditingId]   = useState<number | null>(null)
  const [aiLoading,   setAiLoading]   = useState(false)
  const [aiProvider,  setAiProvider]  = useState('')
  const [error,       setError]       = useState<string | null>(null)
  const [form, setForm] = useState<CropForm>(EMPTY_FORM)
  const listRef   = useRef<HTMLDivElement>(null)
  const formRef   = useRef<HTMLFormElement>(null)
  const headerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    loadCrops()
    greenhouseRepository.list()
      .then(d => setGreenhouses(d.greenhouses ?? []))
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!headerRef.current) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced) return
    anime({ targets: headerRef.current, opacity: [0, 1], translateY: [-10, 0], duration: 400, easing: 'easeOutCubic' })
  }, [])

  useEffect(() => {
    if (!listRef.current || loading || crops.length === 0) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced) return
    anime({
      targets:    Array.from(listRef.current.children) as Element[],
      opacity:    [0, 1],
      translateY: [14, 0],
      delay:      anime.stagger(55),
      duration:   360,
      easing:     'easeOutCubic',
    })
  }, [loading, crops.length])

  useEffect(() => {
    if (!formRef.current || !showForm) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced) return
    anime({ targets: formRef.current, opacity: [0, 1], scaleY: [0.94, 1], duration: 280, easing: 'easeOutBack' })
  }, [showForm])

  const loadCrops = async () => {
    try {
      const raw = localStorage.getItem(CROPS_CACHE)
      if (raw) { setCrops(JSON.parse(raw) as CropDto[]); setLoading(false) }
    } catch {}
    try {
      const data = await cropRepository.list()
      const list = Array.isArray(data) ? (data as CropDto[]) : (data.crops ?? [])
      if (list.length > 0) { setCrops(list); saveCropsCache(list) }
      setError(null)
    } catch (err) { setError((err as Error).message) }
    setLoading(false)
  }

  const resetForm = () => { setForm(EMPTY_FORM); setEditingId(null) }

  const fillRangesWithAI = async () => {
    if (!form.name.trim()) { alert('Ingresa el nombre del cultivo primero'); return }
    setAiLoading(true); setAiProvider('')
    const prompt = `Dame los rangos óptimos para cultivo de invernadero de "${form.name}"${form.variety ? ` variedad "${form.variety}"` : ''}.
Responde SOLO con JSON válido sin markdown:
{"temp_min":18,"temp_max":26,"humidity_min":60,"humidity_max":80,"soil_moisture_min":50,"soil_moisture_max":70}`
    try {
      const result = await callAI(prompt, '')
      const jsonStr = result.text.trim().match(/\{[\s\S]*\}/)?.[0]
      if (jsonStr) {
        const ranges = JSON.parse(jsonStr) as Partial<CropForm>
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
      } else { alert('La IA no pudo generar rangos. Intenta de nuevo.') }
    } catch (err) { alert('Error consultando IA: ' + (err as Error).message) }
    finally { setAiLoading(false) }
  }

  const toApiPayload = (f: CropForm): Partial<CropDto> => ({
    name: f.name,
    ...(f.greenhouse_id !== '' ? { greenhouseId: f.greenhouse_id as number } : {}),
    temp_min: f.temp_min, temp_max: f.temp_max,
    humidity_min: f.humidity_min, humidity_max: f.humidity_max,
    soil_moisture_min: f.soil_moisture_min, soil_moisture_max: f.soil_moisture_max,
    active: f.active as boolean | number,
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (editingId) {
        const updated = await cropRepository.update(editingId, toApiPayload(form))
        setCrops(prev => {
          const next = prev.map(c => c.id === editingId
            ? (updated ?? { ...c, ...toApiPayload(form) } as CropDto) : c)
          saveCropsCache(next); return next
        })
      } else {
        const created = await cropRepository.create(toApiPayload(form)) as CropDto | null
        const newCrop: CropDto = {
          id:                (created as CropDto)?.id ?? Date.now(),
          name:              form.name,
          active:            form.active,
          ...(form.greenhouse_id !== '' ? { greenhouseId: form.greenhouse_id as number } : {}),
          temp_min:          form.temp_min,
          temp_max:          form.temp_max,
          humidity_min:      form.humidity_min,
          humidity_max:      form.humidity_max,
          soil_moisture_min: form.soil_moisture_min,
          soil_moisture_max: form.soil_moisture_max,
        }
        setCrops(prev => { const next = [...prev, newCrop]; saveCropsCache(next); return next })
      }
      setShowForm(false); resetForm()
    } catch (err) { alert('Error: ' + (err as Error).message) }
  }

  const handleEdit = (crop: CropDto) => {
    setEditingId(crop.id)
    setForm({
      name:              crop.name,
      variety:           (crop as unknown as { variety?: string }).variety || '',
      greenhouse_id:     crop.greenhouseId ?? '',
      temp_min:          crop.temp_min          || 15,
      temp_max:          crop.temp_max          || 25,
      humidity_min:      crop.humidity_min      || 50,
      humidity_max:      crop.humidity_max      || 70,
      soil_moisture_min: crop.soil_moisture_min || 40,
      soil_moisture_max: crop.soil_moisture_max || 60,
      active:            crop.active ? 1 : 0,
    })
    setShowForm(true)
  }

  const handleDelete = async (id: number, name: string) => {
    if (confirm(`¿Eliminar el cultivo "${name}"?`)) {
      setCrops(prev => { const next = prev.filter(c => c.id !== id); saveCropsCache(next); return next })
      try { await cropRepository.remove(id) }
      catch (err) { loadCrops(); alert('Error: ' + (err as Error).message) }
    }
  }

  const numInput = (label: string, key: keyof CropForm, borderCls: string) => (
    <div>
      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">{label}</label>
      <input type="number" step="0.1" value={form[key] as number}
        onChange={e => setForm({ ...form, [key]: parseFloat(e.target.value) })}
        className={`input-field border-${borderCls}`} />
    </div>
  )

  const ghName = (id?: number) =>
    id ? (greenhouses.find(g => g.id === id)?.name ?? `Inv. ${id}`) : null

  const displayCrops = filterGhId !== ''
    ? crops.filter(c => c.greenhouseId === filterGhId)
    : crops

  return (
    <div className="space-y-5">
      {/* Header */}
      <div ref={headerRef} className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className="section-title">Cultivos</h2>
          <p className="section-subtitle">Gestión de cultivos y rangos óptimos por invernadero</p>
        </div>
        {!showForm && filterGhId !== '' && (
          <button onClick={() => { setShowForm(true); setForm({ ...EMPTY_FORM, greenhouse_id: filterGhId }) }}
            className="btn-primary px-4 py-2 text-sm">
            <Plus size={14} /> Nuevo cultivo
          </button>
        )}
      </div>

      {/* Greenhouse filter chips */}
      {greenhouses.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => { setFilterGhId(''); setShowForm(false) }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-2xl text-xs font-semibold transition-all border
              ${filterGhId === ''
                ? 'bg-green-600 text-white border-green-600 shadow-sm'
                : 'border-[rgba(74,222,128,0.12)] hover:border-green-400/20'}`}
            style={filterGhId !== '' ? { background: '#051a0a', color: 'rgba(255,255,255,0.5)' } : {}}
          >
            <Sprout size={11} /> Todos
          </button>
          {greenhouses.map(g => (
            <button key={g.id}
              onClick={() => setFilterGhId(g.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-2xl text-xs font-semibold transition-all border
                ${filterGhId === g.id
                  ? 'bg-green-600 text-white border-green-600 shadow-sm'
                  : 'border-[rgba(74,222,128,0.12)] hover:border-green-400/20'}`}
              style={filterGhId !== g.id ? { background: '#051a0a', color: 'rgba(255,255,255,0.5)' } : {}}
            >
              <Building2 size={11} /> {g.name}
            </button>
          ))}
        </div>
      )}

      {/* Create gate banner */}
      {filterGhId === '' && !showForm && (
        <div className="flex items-center gap-2.5 px-4 py-3 bg-blue-50 border border-blue-100 rounded-2xl text-xs text-blue-700 font-medium">
          <Building2 size={14} className="shrink-0" />
          Selecciona un invernadero para crear cultivos
        </div>
      )}

      {error && <div className="alert-danger text-sm">{error}</div>}

      {/* Form */}
      {showForm && (
        <form ref={formRef} onSubmit={handleSubmit} className="card p-5 space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold" style={{ color: '#e2ffe9' }}>{editingId ? 'Editar Cultivo' : 'Nuevo Cultivo'}</h3>
            <button type="button" onClick={() => { setShowForm(false); resetForm() }}
              className="p-1.5 rounded-lg hover:bg-[rgba(74,222,128,0.08)] transition-colors" style={{ color: 'rgba(255,255,255,0.35)' }}>
              <X size={16} />
            </button>
          </div>

          {/* Greenhouse selector */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: 'rgba(255,255,255,0.35)' }}>
              Invernadero *
            </label>
            <select
              value={form.greenhouse_id}
              onChange={e => setForm({ ...form, greenhouse_id: e.target.value === '' ? '' : parseInt(e.target.value) })}
              className="input-field"
              required
            >
              <option value="">Seleccionar invernadero...</option>
              {greenhouses.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: 'rgba(255,255,255,0.35)' }}>Nombre del cultivo *</label>
              <input type="text" placeholder="Tomate, Lechuga..." value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })} className="input-field" required />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wide mb-1.5" style={{ color: 'rgba(255,255,255,0.35)' }}>Variedad</label>
              <input type="text" placeholder="Variedad (opcional)" value={form.variety}
                onChange={e => setForm({ ...form, variety: e.target.value })} className="input-field" />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button type="button" onClick={fillRangesWithAI} disabled={aiLoading}
              className="flex items-center gap-2 bg-gradient-to-r from-violet-500 to-purple-500 hover:from-violet-600 hover:to-purple-600 disabled:opacity-50 text-white px-4 py-2.5 rounded-2xl text-sm font-semibold shadow-sm transition-all">
              {aiLoading
                ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Consultando...</>
                : <><Sparkles size={14} /> Rellenar con IA</>
              }
            </button>
            {aiProvider && <span className="badge-purple">{aiProvider}</span>}
          </div>

          {/* Temp range */}
          <div className="bg-orange-50 rounded-2xl p-4 border border-orange-100">
            <p className="text-xs font-semibold text-orange-700 uppercase tracking-wide mb-3">Temperatura (°C)</p>
            <div className="grid grid-cols-2 gap-4">
              {numInput('Mínima', 'temp_min', 'orange-200')}
              {numInput('Máxima', 'temp_max', 'orange-200')}
            </div>
          </div>

          {/* Humidity range */}
          <div className="bg-sky-50 rounded-2xl p-4 border border-sky-100">
            <p className="text-xs font-semibold text-sky-700 uppercase tracking-wide mb-3">Humedad Aire (%)</p>
            <div className="grid grid-cols-2 gap-4">
              {numInput('Mínima', 'humidity_min', 'sky-200')}
              {numInput('Máxima', 'humidity_max', 'sky-200')}
            </div>
          </div>

          {/* Soil range */}
          <div className="bg-green-50 rounded-2xl p-4 border border-green-100">
            <p className="text-xs font-semibold text-green-700 uppercase tracking-wide mb-3">Humedad Suelo (%)</p>
            <div className="grid grid-cols-2 gap-4">
              {numInput('Mínima', 'soil_moisture_min', 'green-200')}
              {numInput('Máxima', 'soil_moisture_max', 'green-200')}
            </div>
          </div>

          <label className="flex items-center gap-3 cursor-pointer select-none">
            <input type="checkbox" checked={form.active === 1 || form.active === true}
              onChange={e => setForm({ ...form, active: e.target.checked ? 1 : 0 })}
              className="w-4 h-4 text-green-600 rounded cursor-pointer" />
            <span className="text-sm font-medium" style={{ color: 'rgba(255,255,255,0.7)' }}>Cultivo activo</span>
          </label>

          <div className="flex gap-3">
            <button type="submit" className="flex-1 btn-primary py-2.5 text-sm">
              {editingId ? 'Actualizar' : 'Crear cultivo'}
            </button>
            <button type="button" onClick={() => { setShowForm(false); resetForm() }}
              className="flex-1 btn-secondary py-2.5 text-sm">Cancelar</button>
          </div>
        </form>
      )}

      {/* List */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => <div key={i} className="skeleton h-36 rounded-3xl" />)}
        </div>
      ) : displayCrops.length === 0 ? (
        <div className="empty-state card p-10">
          <Sprout size={40} className="empty-state-icon" />
          <p className="empty-state-title">
            {filterGhId !== '' ? 'Sin cultivos en este invernadero' : 'No hay cultivos registrados'}
          </p>
          <p className="empty-state-sub">
            {filterGhId !== '' ? 'Crea un cultivo para este invernadero.' : 'Selecciona un invernadero para comenzar.'}
          </p>
          {filterGhId !== '' && (
            <button onClick={() => { setShowForm(true); setForm({ ...EMPTY_FORM, greenhouse_id: filterGhId }) }}
              className="btn-primary px-4 py-2 text-sm mt-4">
              <Plus size={14} /> Nuevo cultivo
            </button>
          )}
        </div>
      ) : (
        <div ref={listRef} className="space-y-3">
          {displayCrops.map(c => {
            const isActive = c.active === 1 || c.active === true
            const variety  = (c as unknown as { variety?: string }).variety
            const ghLabel  = ghName(c.greenhouseId)
            return (
              <div key={c.id} className={`card p-5 transition-all duration-200 ${isActive ? 'ring-1 ring-green-200' : ''}`}>
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-2xl" style={{ background: isActive ? 'rgba(74,222,128,0.1)' : 'rgba(255,255,255,0.06)' }}>
                      <Sprout size={18} className={isActive ? 'text-green-600' : 'text-gray-400'} />
                    </div>
                    <div>
                      <h3 className="font-semibold" style={{ color: '#e2ffe9' }}>{c.name}</h3>
                      {variety && <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>{variety}</p>}
                      {ghLabel && (
                        <p className="text-xs flex items-center gap-1 mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>
                          <Building2 size={10} /> {ghLabel}
                        </p>
                      )}
                    </div>
                  </div>
                  <span className={isActive ? 'badge-green' : 'badge-gray'}>
                    {isActive ? 'Activo' : 'Inactivo'}
                  </span>
                </div>

                <div className="space-y-3 mb-4">
                  {c.temp_min != null && c.temp_max != null &&
                    <RangeBar label="Temperatura" min={c.temp_min} max={c.temp_max} unit="°C" color="bg-orange-400" scaleMax={60} />}
                  {c.humidity_min != null && c.humidity_max != null &&
                    <RangeBar label="Humedad aire" min={c.humidity_min} max={c.humidity_max} unit="%" color="bg-sky-400" scaleMax={100} />}
                  {c.soil_moisture_min != null && c.soil_moisture_max != null &&
                    <RangeBar label="Humedad suelo" min={c.soil_moisture_min} max={c.soil_moisture_max} unit="%" color="bg-green-400" scaleMax={100} />}
                </div>

                <div className="flex gap-2 pt-3 border-t border-[rgba(74,222,128,0.12)]">
                  <button onClick={() => handleEdit(c)} className="flex-1 btn-secondary py-2 text-xs">
                    <Edit2 size={12} /> Editar
                  </button>
                  <button onClick={() => handleDelete(c.id, c.name)} className="flex-1 btn-danger py-2 text-xs">
                    <Trash2 size={12} /> Eliminar
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
