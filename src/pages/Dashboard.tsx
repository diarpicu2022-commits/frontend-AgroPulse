import { useState, useEffect, useRef } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import {
  Thermometer, Droplets, Leaf, Bell, RefreshCw,
  Sun, Activity, ChevronDown, TrendingUp, type LucideIcon,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { Sprout } from 'lucide-react'
import { greenhouseRepository, readingRepository, alertRepository, cropRepository, sensorRepository } from '../repositories'
import SensorCard from '../components/SensorCard'
import AlertsBanner from '../components/AlertsBanner'
import anime from 'animejs'
import type { GreenhouseDto, CropDto, AlertDto, SensorReadingDto, SensorDto, SensorType, AutoAlert } from '../types'
import PageHeader from '../components/ui/PageHeader'
import type { AccentColor } from '../styles/tokens'

interface SensorMeta { label: string; unit: string; icon: LucideIcon; accent: AccentColor; source?: string }

const SENSOR_META: Record<string, SensorMeta> = {
  TEMPERATURE:          { label: 'Temp. Interior', unit: '°C',  icon: Thermometer, accent: 'amber',  source: 'DHT22' },
  TEMPERATURE_INTERNAL: { label: 'Temp. Interior', unit: '°C',  icon: Thermometer, accent: 'amber',  source: 'DHT22' },
  TEMPERATURE_EXTERNAL: { label: 'Temp. Exterior', unit: '°C',  icon: Thermometer, accent: 'golden', source: 'DHT11' },
  HUMIDITY:             { label: 'Hum. Interior',  unit: '%',   icon: Droplets,    accent: 'cyan',   source: 'DHT22' },
  HUMIDITY_INTERNAL:    { label: 'Hum. Interior',  unit: '%',   icon: Droplets,    accent: 'cyan',   source: 'DHT22' },
  HUMIDITY_EXTERNAL:    { label: 'Hum. Exterior',  unit: '%',   icon: Droplets,    accent: 'violet', source: 'DHT11' },
  SOIL_MOISTURE:        { label: 'Hum. Suelo',     unit: '%',   icon: Leaf,        accent: 'green',  source: 'Capacitivo' },
  LIGHT:                { label: 'Luminosidad',    unit: 'lx',  icon: Sun,         accent: 'golden', source: 'LDR' },
  CO2:                  { label: 'CO₂',            unit: 'ppm', icon: Activity,    accent: 'amber',  source: 'MQ135' },
}

interface ChartPoint { time: string; interior: number; exterior?: number }

export default function Dashboard() {
  const { allowedGreenhouseIds } = useAuth()
  const [greenhouses, setGreenhouses] = useState<GreenhouseDto[]>([])
  const [selectedGh,  setSelectedGh]  = useState<GreenhouseDto | null>(null)
  const [readings,    setReadings]    = useState<SensorReadingDto[]>([])
  const [dbSensors,   setDbSensors]   = useState<SensorDto[]>([])
  const [history,     setHistory]     = useState<ChartPoint[]>([])
  const [alerts,      setAlerts]      = useState<AlertDto[]>([])
  const [autoAlerts,  setAutoAlerts]  = useState<AutoAlert[]>([])
  const [crop,        setCrop]        = useState<CropDto | null>(null)
  const [loading,     setLoading]     = useState(true)
  const [lastUpdate,  setLastUpdate]  = useState<string | null>(null)
  const [error,       setError]       = useState<string | null>(null)
  const gridRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    greenhouseRepository.list()
      .then(data => {
        const all  = data?.greenhouses ?? []
        const list = allowedGreenhouseIds === null
          ? all
          : all.filter(g => allowedGreenhouseIds.includes(g.id))
        setGreenhouses(list)
        if (list.length > 0) setSelectedGh(list[0])
        else setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!selectedGh) return
    loadData()
    const interval = setInterval(loadData, 5000)
    return () => clearInterval(interval)
  }, [selectedGh?.id])

  const generateAutoAlerts = (readingsData: SensorReadingDto[], cropData: CropDto): AutoAlert[] => {
    const newAlerts: AutoAlert[] = []
    const now = new Date()
    const tempR = readingsData.find(r => r.sensorType?.startsWith('TEMPERATURE'))
    if (tempR) {
      if (cropData.temp_min != null && tempR.value < cropData.temp_min)
        newAlerts.push({ type: 'TEMPERATURE', title: 'Temperatura muy baja', message: `${tempR.value.toFixed(1)}°C (mín: ${cropData.temp_min}°C)`, timestamp: now })
      else if (cropData.temp_max != null && tempR.value > cropData.temp_max)
        newAlerts.push({ type: 'TEMPERATURE', title: 'Temperatura muy alta', message: `${tempR.value.toFixed(1)}°C (máx: ${cropData.temp_max}°C)`, timestamp: now })
    }
    const humidity = readingsData.find(r => r.sensorType === 'HUMIDITY')
    if (humidity && cropData.humidity_min != null && cropData.humidity_max != null) {
      if (humidity.value < cropData.humidity_min)
        newAlerts.push({ type: 'HUMIDITY', title: 'Humedad muy baja', message: `${humidity.value.toFixed(1)}% (mín: ${cropData.humidity_min}%)`, timestamp: now })
      else if (humidity.value > cropData.humidity_max)
        newAlerts.push({ type: 'HUMIDITY', title: 'Humedad muy alta', message: `${humidity.value.toFixed(1)}% (máx: ${cropData.humidity_max}%)`, timestamp: now })
    }
    const soil = readingsData.find(r => r.sensorType === 'SOIL_MOISTURE')
    if (soil && cropData.soil_moisture_min != null && cropData.soil_moisture_max != null) {
      if (soil.value < cropData.soil_moisture_min)
        newAlerts.push({ type: 'SOIL_MOISTURE', title: 'Suelo muy seco', message: `${soil.value.toFixed(1)}% (mín: ${cropData.soil_moisture_min}%)`, timestamp: now })
      else if (soil.value > cropData.soil_moisture_max)
        newAlerts.push({ type: 'SOIL_MOISTURE', title: 'Suelo muy húmedo', message: `${soil.value.toFixed(1)}% (máx: ${cropData.soil_moisture_max}%)`, timestamp: now })
    }
    return newAlerts
  }

  const loadData = async () => {
    if (!selectedGh) return
    try {
      // Cargar cultivo: primero caché local (mismo que CropsPage), luego API
      try {
        let cropsList: import('../types').CropDto[] = []
        try {
          const cached = localStorage.getItem('agropulse_crops_v1')
          if (cached) cropsList = JSON.parse(cached) as import('../types').CropDto[]
        } catch { /* ignore */ }
        if (cropsList.length === 0) {
          const cropsRaw = await cropRepository.list()
          cropsList = Array.isArray(cropsRaw)
            ? (cropsRaw as unknown as import('../types').CropDto[])
            : (cropsRaw?.crops ?? [])
        }
        if (cropsList.length > 0) {
          const activeCrop = cropsList.find(c => Boolean(c.active)) ?? cropsList[0]
          setCrop(activeCrop)
        }
      } catch (e) { console.error('[Dashboard] crops load error:', e) }

      const readingsData = await readingRepository.list(null, 200, selectedGh.id)
      if (readingsData?.readings) {
        setReadings(readingsData.readings)
        const intType = (['TEMPERATURE_INTERNAL', 'TEMPERATURE'] as SensorType[])
          .find(t => readingsData.readings.some(r => r.sensorType === t))
        const extType = 'TEMPERATURE_EXTERNAL' as SensorType
        const intReadings = intType
          ? readingsData.readings.filter(r => r.sensorType === intType).slice(0, 20).reverse()
          : []
        const extMap = new Map(
          readingsData.readings
            .filter(r => r.sensorType === extType)
            .map(r => [parseTs(r.timestamp).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Bogota' }), r.value])
        )
        if (intReadings.length > 0) {
          const chartData = intReadings.map(r => {
            const t = parseTs(r.timestamp).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Bogota' })
            return { time: t, interior: parseFloat(r.value.toFixed(1)), exterior: extMap.has(t) ? parseFloat(extMap.get(t)!.toFixed(1)) : undefined }
          })
          setHistory(chartData)
        } else {
          setHistory([])
        }
        // Generar auto-alertas solo si hay cultivo cargado
        setCrop(prev => {
          if (prev) {
            const newAutoAlerts = generateAutoAlerts(readingsData.readings, prev)
            if (newAutoAlerts.length > 0) {
              setAutoAlerts(newAutoAlerts)
              newAutoAlerts.forEach(a =>
                alertRepository.create({ type: a.type, level: 'WARNING', message: a.message, title: a.title }).catch(() => {})
              )
            } else setAutoAlerts([])
          }
          return prev
        })
      }
      try {
        const alertsData = await alertRepository.list()
        if (alertsData?.alerts) setAlerts(alertsData.alerts.slice(0, 5))
      } catch { /* alerts may not be ready */ }
      // Cargar sensores registrados en la BD (fuente de verdad para qué tarjetas mostrar)
      try {
        const sd = await sensorRepository.list(selectedGh.id)
        setDbSensors((sd?.sensors ?? []).filter(s => s.active !== false))
      } catch { /* ignore */ }
      setLastUpdate(new Date().toLocaleTimeString('es-CO', { timeZone: 'America/Bogota' }))
      setError(null)
    } catch (err) { setError((err as Error).message) }
    finally { setLoading(false) }
  }

  useEffect(() => {
    if (!gridRef.current || loading || readings.length === 0) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced) return
    anime({
      targets: Array.from(gridRef.current.children) as Element[],
      opacity: [0, 1],
      translateY: [14, 0],
      delay: anime.stagger(60),
      duration: 350,
      easing: 'easeOutCubic',
    })
  }, [loading, readings.length])

  // Force UTC parsing: backend timestamps may lack 'Z' suffix
  const parseTs = (ts: string) => new Date(/Z|[+-]\d{2}:\d{2}$/.test(ts) ? ts : ts + 'Z')

  // Build reading lookup maps (readings are newest-first)
  const latestBySensorId = new Map<number, SensorReadingDto>()
  const latestByType     = new Map<string, SensorReadingDto>()
  for (const r of readings) {
    if (!r.sensorType) continue
    if (!latestBySensorId.has(r.sensorId)) latestBySensorId.set(r.sensorId, r)
    if (!latestByType.has(r.sensorType))   latestByType.set(r.sensorType, r)
  }

  // Card list: DB sensors are the source of truth (show card even with no recent reading).
  // Readings not covered by any registered sensor are appended as extra cards.
  type CardEntry = { key: string; type: string; reading?: SensorReadingDto }
  const cardEntries: CardEntry[] = []
  const seenTypes = new Set<string>()

  // Normalize aliases so TEMPERATURE_INTERNAL and TEMPERATURE share one card slot,
  // and HUMIDITY_INTERNAL and HUMIDITY share one card slot.
  const normKey = (t: string) =>
    t === 'TEMPERATURE_INTERNAL' ? 'TEMPERATURE' :
    t === 'HUMIDITY_INTERNAL'    ? 'HUMIDITY' : t

  for (const s of dbSensors) {
    const t   = s.type as string
    const key = normKey(t)
    if (!key || seenTypes.has(key)) continue
    seenTypes.add(key)
    // Prefer sensorId match (accurate when firmware uses backendId);
    // fall back to type match (when firmware uses i+1 fallback IDs).
    const reading = latestBySensorId.get(s.id) ?? latestByType.get(t) ?? latestByType.get(key)
    cardEntries.push({ key: `db-${s.id}`, type: t, reading })
  }
  // Append readings whose type wasn't covered by any DB sensor
  for (const r of latestBySensorId.values()) {
    const t   = r.sensorType ?? ''
    const key = normKey(t)
    if (!key || seenTypes.has(key)) continue
    seenTypes.add(key)
    cardEntries.push({ key: `rd-${r.sensorId}`, type: t, reading: r })
  }
  // If DHT11 (TEMPERATURE_EXTERNAL) is registered but HUMIDITY_EXTERNAL is not yet
  // in the DB, add a placeholder card — same sensor, just not reporting yet.
  if (seenTypes.has('TEMPERATURE_EXTERNAL') && !seenTypes.has('HUMIDITY_EXTERNAL')) {
    const reading = latestByType.get('HUMIDITY_EXTERNAL')
    cardEntries.push({ key: 'inferred-HUMIDITY_EXTERNAL', type: 'HUMIDITY_EXTERNAL', reading })
    seenTypes.add('HUMIDITY_EXTERNAL')
  }

  const sensorEntries = cardEntries

  const alertLevelCls: Record<string, string> = {
    CRITICAL: 'alert-danger',
    WARNING:  'alert-warning',
    INFO:     'alert-info',
  }

  return (
    <div className="space-y-5">
      <AlertsBanner alerts={autoAlerts} onDismiss={idx => setAutoAlerts(a => a.filter((_, i) => i !== idx))} />

      {error && (
        <div className="alert-danger">
          <Activity size={14} className="shrink-0" />
          <span>Error cargando datos: {error}</span>
        </div>
      )}

      <style>{`
        @keyframes agro-float    { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-5px)} }
        @keyframes agro-peck     { 0%,100%{transform:rotate(0deg)} 50%{transform:rotate(18deg)} }
        @keyframes agro-breathe  { 0%,100%{transform:scaleX(1)} 50%{transform:scaleX(1.06)} }
      `}</style>

      {/* ── Hero Banner — Invernadero + Cultivo ── */}
      <div style={{
        background: 'linear-gradient(135deg,#0d2210 0%,#131a0a 40%,#0f1e0b 100%)',
        border: '1px solid rgba(251,146,60,0.18)',
        borderRadius: '14px',
        padding: '16px 18px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        position: 'relative',
        overflow: 'hidden',
        minHeight: 110,
      }}>
        {/* Dot grid */}
        <div style={{ position:'absolute', inset:0, backgroundImage:'radial-gradient(rgba(251,146,60,0.07) 1px,transparent 1px)', backgroundSize:'20px 20px', pointerEvents:'none' }} />

        {/* Animalitos fondo */}
        <div style={{ position:'absolute', right:12, bottom:0, display:'flex', alignItems:'flex-end', gap:14, opacity:0.17, pointerEvents:'none' }}>
          {/* Vaca */}
          <svg width="48" height="42" viewBox="0 0 52 46" style={{ animation:'agro-float 3.5s ease-in-out infinite' }}>
            <ellipse cx="28" cy="30" rx="18" ry="12" fill="#f5f0e8"/>
            <ellipse cx="17" cy="27" rx="5" ry="4" fill="#3d2b1f" opacity="0.5"/>
            <ellipse cx="32" cy="32" rx="4" ry="3" fill="#3d2b1f" opacity="0.4"/>
            <ellipse cx="10" cy="20" rx="9" ry="8" fill="#f5f0e8"/>
            <ellipse cx="5" cy="13" rx="3" ry="4" fill="#f5f0e8"/>
            <circle cx="8" cy="18" r="2" fill="#1a0a00"/>
            <ellipse cx="7" cy="25" rx="4.5" ry="3" fill="#f9c5b0"/>
            <rect x="12" y="40" width="4" height="6" rx="2" fill="#e8ddd0"/>
            <rect x="18" y="40" width="4" height="6" rx="2" fill="#e8ddd0"/>
            <rect x="28" y="40" width="4" height="6" rx="2" fill="#e8ddd0"/>
            <rect x="34" y="40" width="4" height="6" rx="2" fill="#e8ddd0"/>
          </svg>
          {/* Gallina */}
          <svg width="30" height="38" viewBox="0 0 34 40" style={{ animation:'agro-float 2.8s ease-in-out infinite 0.6s' }}>
            <ellipse cx="17" cy="28" rx="12" ry="9" fill="#e8a020"/>
            <rect x="13" y="17" width="8" height="8" rx="4" fill="#e8a020"/>
            <g style={{ transformOrigin:'13px 14px', animation:'agro-peck 1.1s ease-in-out infinite' }}>
              <ellipse cx="13" cy="13" rx="7" ry="6" fill="#e8a020"/>
              <path d="M7 13 L4 14 L7 15" fill="#f59e0b"/>
              <path d="M10 8 Q11 4 12 7 Q13 3 14 7 Q15 4 16 8" fill="#f87171"/>
              <circle cx="15" cy="11" r="1.8" fill="#1a0a00"/>
            </g>
            <line x1="13" y1="36" x2="11" y2="40" stroke="#f59e0b" strokeWidth="1.8"/>
            <line x1="21" y1="36" x2="23" y2="40" stroke="#f59e0b" strokeWidth="1.8"/>
          </svg>
          {/* Cerdo */}
          <svg width="40" height="36" viewBox="0 0 42 38" style={{ transformOrigin:'50% 50%', animation:'agro-breathe 2.3s ease-in-out infinite 0.3s' }}>
            <ellipse cx="24" cy="26" rx="16" ry="10" fill="#f9a8d4"/>
            <ellipse cx="10" cy="22" rx="9" ry="8" fill="#f9a8d4"/>
            <ellipse cx="5" cy="14" rx="3" ry="4" fill="#f9a8d4" transform="rotate(-20 5 14)"/>
            <ellipse cx="7" cy="24" rx="5" ry="3.5" fill="#fb9ebe"/>
            <circle cx="5.5" cy="24" r="1.2" fill="#c06080"/>
            <circle cx="8.5" cy="24" r="1.2" fill="#c06080"/>
            <circle cx="12" cy="20" r="2" fill="#1a0a00"/>
            <rect x="13" y="34" width="4" height="4" rx="2" fill="#f9a8d4"/>
            <rect x="20" y="34" width="4" height="4" rx="2" fill="#f9a8d4"/>
            <rect x="27" y="34" width="4" height="4" rx="2" fill="#f9a8d4"/>
          </svg>
        </div>

        {/* Izquierda: nombre invernadero */}
        <div style={{ position:'relative', zIndex:1 }}>
          <p style={{ color:'rgba(255,255,255,0.35)', fontSize:9, letterSpacing:'2px', textTransform:'uppercase', marginBottom:4 }}>Invernadero activo</p>
          <p style={{ color:'#fbbf24', fontSize:18, fontWeight:800, marginBottom:6 }}>{selectedGh?.name ?? 'Sin invernadero'}</p>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <span style={{ background:'rgba(74,222,128,0.1)', border:'1px solid rgba(74,222,128,0.25)', borderRadius:20, color:'#4ade80', fontSize:8, padding:'2px 8px', fontWeight:600 }}>● Óptimo</span>
            {selectedGh?.deviceId && <span style={{ color:'rgba(255,255,255,0.25)', fontSize:9, fontFamily:'JetBrains Mono,monospace' }}>ESP32: {selectedGh.deviceId}</span>}
          </div>
        </div>

        {/* Derecha: progreso del cultivo activo */}
        <div style={{ position:'relative', zIndex:1, marginRight:180 }}>
          {crop ? (() => {
            const STAGES = ['SEEDING','GROWING','FLOWERING','HARVESTING','DORMANT'] as const
            const STAGE_ES: Record<string, string> = { SEEDING:'Siembra', GROWING:'Crecimiento', FLOWERING:'Floración', HARVESTING:'Cosecha', DORMANT:'Reposo' }
            const STAGE_EMOJI: Record<string, string> = { SEEDING:'🌱', GROWING:'🌿', FLOWERING:'🌸', HARVESTING:'🌾', DORMANT:'💤' }
            const stageIdx = crop.currentStage ? STAGES.indexOf(crop.currentStage) : 0
            const stagePct = Math.round(((stageIdx + 1) / STAGES.length) * 100)
            const diasPlantado = crop.plantingDate
              ? Math.floor((Date.now() - new Date(crop.plantingDate).getTime()) / 86400000)
              : null
            return (
              <div style={{ display:'flex', alignItems:'center', gap:14 }}>
                <div style={{ width:58, height:58, background:'linear-gradient(135deg,#0f3d20,#163a18)', border:'1px solid rgba(74,222,128,0.25)', borderRadius:14, display:'flex', alignItems:'center', justifyContent:'center', fontSize:28, flexShrink:0 }}>
                  {STAGE_EMOJI[crop.currentStage ?? 'SEEDING']}
                </div>
                <div style={{ display:'flex', flexDirection:'column', gap:5, minWidth:160 }}>
                  <div>
                    <p style={{ color:'rgba(255,255,255,0.28)', fontSize:8, letterSpacing:'2px', textTransform:'uppercase', marginBottom:2 }}>Cultivo activo</p>
                    <p style={{ color:'#f0fdf4', fontSize:14, fontWeight:800, lineHeight:1.1 }}>
                      {crop.name}{crop.variety ? <span style={{ color:'rgba(255,255,255,0.4)', fontWeight:400, fontSize:11 }}> · {crop.variety}</span> : null}
                    </p>
                  </div>
                  <div style={{ display:'flex', gap:14 }}>
                    {diasPlantado !== null && (
                      <div>
                        <p style={{ color:'rgba(255,255,255,0.28)', fontSize:7, textTransform:'uppercase', letterSpacing:1 }}>Días plantado</p>
                        <p style={{ color:'#fbbf24', fontSize:13, fontWeight:700, fontFamily:'JetBrains Mono,monospace' }}>{diasPlantado}d</p>
                      </div>
                    )}
                    <div>
                      <p style={{ color:'rgba(255,255,255,0.28)', fontSize:7, textTransform:'uppercase', letterSpacing:1 }}>Etapa</p>
                      <p style={{ color:'#4ade80', fontSize:12, fontWeight:700 }}>{STAGE_ES[crop.currentStage ?? 'SEEDING']}</p>
                    </div>
                    <div>
                      <p style={{ color:'rgba(255,255,255,0.28)', fontSize:7, textTransform:'uppercase', letterSpacing:1 }}>Progreso</p>
                      <p style={{ color:'#fb923c', fontSize:13, fontWeight:700, fontFamily:'JetBrains Mono,monospace' }}>{stagePct}%</p>
                    </div>
                  </div>
                  {/* Barra de progreso del ciclo */}
                  <div>
                    <div style={{ height:4, background:'rgba(255,255,255,0.06)', borderRadius:99 }}>
                      <div style={{ width:`${stagePct}%`, height:'100%', background:'linear-gradient(90deg,#4ade80,#fbbf24)', borderRadius:99, boxShadow:'0 0 8px rgba(74,222,128,0.4)', transition:'width 1s ease' }}/>
                    </div>
                    <div style={{ display:'flex', justifyContent:'space-between', marginTop:3 }}>
                      {STAGES.map((s,i) => (
                        <span key={s} style={{ fontSize:6, color: i <= stageIdx ? 'rgba(74,222,128,0.7)' : 'rgba(255,255,255,0.2)', fontFamily:'JetBrains Mono,monospace', letterSpacing:0.5 }}>
                          {STAGE_ES[s].slice(0,3).toUpperCase()}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )
          })() : (
            <div style={{ display:'flex', alignItems:'center', gap:10, opacity:0.4 }}>
              <div style={{ width:46, height:46, border:'1px dashed rgba(74,222,128,0.3)', borderRadius:12, display:'flex', alignItems:'center', justifyContent:'center', fontSize:20 }}>🌿</div>
              <div>
                <p style={{ color:'rgba(255,255,255,0.3)', fontSize:8, letterSpacing:'2px', textTransform:'uppercase' }}>Sin cultivo</p>
                <p style={{ color:'rgba(255,255,255,0.35)', fontSize:10 }}>Asigna un cultivo al invernadero</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <PageHeader
        title="Panel de Control"
        subtitle={crop ? `Cultivo activo: ${crop.name}${lastUpdate ? ' · ' + lastUpdate : ''}` : lastUpdate ?? undefined}
        action={
          <button onClick={loadData} className="btn-primary px-4 py-2 text-sm shrink-0">
            <RefreshCw size={14} />
            Actualizar
          </button>
        }
      />

      {/* Greenhouse selector — always visible */}
      {greenhouses.length === 0 ? (
        <div className="alert-info text-sm">
          <Sprout size={14} className="shrink-0" />
          <span>Sin invernaderos asignados. Contacta al administrador para obtener acceso.</span>
        </div>
      ) : (
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-sm font-medium shrink-0 font-mono" style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem' }}>Invernadero</span>
          <div className="relative inline-block">
            <select
              value={selectedGh?.id ?? ''}
              onChange={e => {
                const gh = greenhouses.find(g => g.id === parseInt(e.target.value))
                if (gh) { setSelectedGh(gh); setReadings([]); setLoading(true) }
              }}
              className="appearance-none input-field py-2 pr-8 text-sm font-medium"
            >
              {greenhouses.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
            <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
          {selectedGh?.deviceId && (
            <span className="badge-purple font-mono text-[10px]">ESP32: {selectedGh.deviceId}</span>
          )}
        </div>
      )}

      {/* Sensor grid */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="skeleton h-32 rounded-3xl" />
          ))}
        </div>
      ) : sensorEntries.length === 0 && dbSensors.length === 0 ? (
        <div className="empty-state card p-10">
          <Activity size={40} className="empty-state-icon" />
          <p className="empty-state-title">Sin sensores para {selectedGh?.name ?? 'este invernadero'}</p>
          <p className="empty-state-sub">El ESP32 comenzará a enviar datos cuando esté vinculado y conectado.</p>
        </div>
      ) : (
        <>
          <div ref={gridRef} className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {sensorEntries.map(({ key, type, reading }) => {
              const meta = SENSOR_META[type] ?? { label: type, unit: '', icon: Activity, accent: 'green' as AccentColor }
              let min: number | undefined, max: number | undefined
              if (type.startsWith('TEMPERATURE') && crop) { min = crop.temp_min;          max = crop.temp_max }
              else if (type === 'HUMIDITY' && crop)        { min = crop.humidity_min;      max = crop.humidity_max }
              else if (type === 'SOIL_MOISTURE' && crop)   { min = crop.soil_moisture_min; max = crop.soil_moisture_max }
              return (
                <SensorCard key={key} icon={meta.icon} label={meta.label} unit={meta.unit}
                  value={reading?.value} accent={meta.accent} source={meta.source}
                  min={min} max={max} timestamp={reading?.timestamp} />
              )
            })}
          </div>

          {history.length > 0 && (
            <div className="card p-5">
              <div className="flex items-center justify-between gap-2 mb-4">
                <div className="flex items-center gap-2">
                  <TrendingUp size={15} style={{ color:'#fb923c' }} />
                  <h3 className="text-sm font-semibold" style={{ color:'#f0fdf4' }}>Temperatura — Últimas lecturas</h3>
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:4, fontSize:9, color:'rgba(255,255,255,0.35)' }}>
                    <div style={{ width:6, height:6, borderRadius:'50%', background:'#fb923c', boxShadow:'0 0 4px #fb923c' }}/>Interior (DHT22)
                  </div>
                  <div style={{ display:'flex', alignItems:'center', gap:4, fontSize:9, color:'rgba(255,255,255,0.35)' }}>
                    <div style={{ width:6, height:6, borderRadius:'50%', background:'#fbbf24' }}/>Exterior (DHT11)
                  </div>
                </div>
              </div>
              <div className="rounded-[14px] p-4" style={{ background:'#0d1a0a', border:'1px solid rgba(251,146,60,0.1)' }}>
                <ResponsiveContainer width="100%" height={160}>
                  <LineChart data={history}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(251,146,60,0.06)" />
                    <XAxis dataKey="time" tick={{ fill:'rgba(255,255,255,0.3)', fontSize:10, fontFamily:'JetBrains Mono' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill:'rgba(255,255,255,0.3)', fontSize:10, fontFamily:'JetBrains Mono' }} axisLine={false} tickLine={false} domain={['auto','auto']} />
                    <Tooltip
                      contentStyle={{ background:'#0d1a0a', border:'1px solid rgba(251,146,60,0.2)', borderRadius:10, color:'#f0fdf4', fontFamily:'JetBrains Mono' }}
                      formatter={(v: number, name: string) => [`${v}°C`, name === 'interior' ? 'Interior' : 'Exterior']}
                    />
                    <Line type="monotone" dataKey="interior" stroke="#fb923c" strokeWidth={2} dot={false} activeDot={{ r:4, fill:'#fb923c' }} name="interior" />
                    <Line type="monotone" dataKey="exterior" stroke="#fbbf24" strokeWidth={1.5} strokeDasharray="5 3" dot={false} activeDot={{ r:3, fill:'#fbbf24' }} name="exterior" connectNulls />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {alerts.length > 0 && (
            <div className="card p-5">
              <div className="flex items-center gap-2 mb-3">
                <Bell size={14} className="text-amber-500" />
                <h3 className="text-sm font-semibold text-gray-800">Alertas Recientes</h3>
              </div>
              <div className="space-y-2">
                {alerts.map(a => (
                  <div key={a.id} className={alertLevelCls[a.level] || 'alert-info'}>
                    <Bell size={13} className="shrink-0" />
                    <span>{a.message}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
