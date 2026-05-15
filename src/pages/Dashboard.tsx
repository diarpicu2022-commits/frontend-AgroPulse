import { useState, useEffect, useRef } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import {
  Thermometer, Droplets, Leaf, Bell, RefreshCw,
  Sun, Activity, ChevronDown, TrendingUp, type LucideIcon,
} from 'lucide-react'
import anime from 'animejs'
import { useAuth } from '../context/AuthContext'
import { Sprout } from 'lucide-react'
import { greenhouseRepository, readingRepository, alertRepository, cropRepository } from '../repositories'
import SensorCard from '../components/SensorCard'
import AlertsBanner from '../components/AlertsBanner'
import type { GreenhouseDto, CropDto, AlertDto, SensorReadingDto, SensorType, AutoAlert } from '../types'

interface SensorMeta { label: string; unit: string; icon: LucideIcon; color: string }

const SENSOR_META: Record<string, SensorMeta> = {
  TEMPERATURE_INTERNAL: { label: 'Temp. Interior',   unit: '°C',  icon: Thermometer, color: 'bg-orange-500' },
  TEMPERATURE_EXTERNAL: { label: 'Temp. Exterior',   unit: '°C',  icon: Thermometer, color: 'bg-blue-500'   },
  TEMPERATURE:          { label: 'Temperatura',      unit: '°C',  icon: Thermometer, color: 'bg-orange-500' },
  HUMIDITY:             { label: 'Humedad Interior', unit: '%',   icon: Droplets,    color: 'bg-cyan-500'   },
  HUMIDITY_EXTERNAL:    { label: 'Humedad Exterior', unit: '%',   icon: Droplets,    color: 'bg-sky-500'    },
  SOIL_MOISTURE:        { label: 'Humedad Suelo',    unit: '%',   icon: Leaf,        color: 'bg-green-600'  },
  LIGHT:                { label: 'Luminosidad',      unit: 'lx',  icon: Sun,         color: 'bg-yellow-500' },
  CO2:                  { label: 'CO₂',              unit: 'ppm', icon: Activity,    color: 'bg-purple-500' },
}

interface ChartPoint { time: string; temp: number }

export default function Dashboard() {
  const { allowedGreenhouseIds } = useAuth()
  const [greenhouses, setGreenhouses] = useState<GreenhouseDto[]>([])
  const [selectedGh,  setSelectedGh]  = useState<GreenhouseDto | null>(null)
  const [readings,    setReadings]    = useState<SensorReadingDto[]>([])
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

  // Stagger sensor cards entrance on first load
  useEffect(() => {
    if (!gridRef.current || loading) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced) return
    anime({
      targets:    Array.from(gridRef.current.children) as Element[],
      opacity:    [0, 1],
      translateY: [16, 0],
      delay:      anime.stagger(55),
      duration:   380,
      easing:     'easeOutCubic',
    })
  }, [loading])

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
      const readingsData = await readingRepository.list(null, 200, selectedGh.id)
      if (readingsData?.readings) {
        setReadings(readingsData.readings)
        const tempType = (['TEMPERATURE_INTERNAL', 'TEMPERATURE', 'TEMPERATURE_EXTERNAL'] as SensorType[])
          .find(t => readingsData.readings.some(r => r.sensorType === t))
        if (tempType) {
          const tempData = readingsData.readings
            .filter(r => r.sensorType === tempType).slice(0, 20).reverse()
            .map(r => ({
              time: new Date(r.timestamp).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Bogota' }),
              temp: parseFloat(r.value.toFixed(1)),
            }))
          setHistory(tempData)
        } else setHistory([])
        try {
          const cropsData = await cropRepository.list()
          if ((cropsData?.crops?.length ?? 0) > 0) {
            const activeCrop = cropsData.crops.find(c => c.active === 1 || c.active === true) ?? cropsData.crops[0]
            setCrop(activeCrop)
            const newAutoAlerts = generateAutoAlerts(readingsData.readings, activeCrop)
            if (newAutoAlerts.length > 0) {
              setAutoAlerts(newAutoAlerts)
              newAutoAlerts.forEach(a =>
                alertRepository.create({ type: a.type, level: 'WARNING', message: a.message, title: a.title }).catch(() => {})
              )
            } else setAutoAlerts([])
          }
        } catch { /* crops not critical */ }
      }
      try {
        const alertsData = await alertRepository.list()
        if (alertsData?.alerts) setAlerts(alertsData.alerts.slice(0, 5))
      } catch { /* alerts may not be ready */ }
      setLastUpdate(new Date().toLocaleTimeString('es-CO', { timeZone: 'America/Bogota' }))
      setError(null)
    } catch (err) { setError((err as Error).message) }
    finally { setLoading(false) }
  }

  const uniqueTypes = [...new Set(readings.map(r => r.sensorType).filter(Boolean))] as SensorType[]
  const latestByType: Record<string, number> = {}
  for (const type of uniqueTypes) {
    const r = readings.find(r => r.sensorType === type)
    if (r) latestByType[type] = r.value
  }

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

      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="section-title">Panel de Control</h2>
          <p className="section-subtitle">
            {crop ? `Cultivo activo: ${crop.name}` : 'Sin cultivo activo'}
            {lastUpdate && ` · ${lastUpdate}`}
          </p>
        </div>
        <button onClick={loadData} className="btn-primary px-4 py-2 text-sm shrink-0">
          <RefreshCw size={14} />
          Actualizar
        </button>
      </div>

      {/* Greenhouse selector — always visible */}
      {greenhouses.length === 0 ? (
        <div className="alert-info text-sm">
          <Sprout size={14} className="shrink-0" />
          <span>Sin invernaderos asignados. Contacta al administrador para obtener acceso.</span>
        </div>
      ) : (
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-sm text-gray-500 font-medium shrink-0">Invernadero</span>
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
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="skeleton h-32 rounded-3xl" />
          ))}
        </div>
      ) : uniqueTypes.length === 0 ? (
        <div className="empty-state card p-10">
          <Activity size={40} className="empty-state-icon" />
          <p className="empty-state-title">Sin lecturas para {selectedGh?.name ?? 'este invernadero'}</p>
          <p className="empty-state-sub">El ESP32 comenzará a enviar datos cuando esté vinculado y conectado.</p>
        </div>
      ) : (
        <>
          <div ref={gridRef} className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {uniqueTypes.map(type => {
              const meta  = SENSOR_META[type] ?? { label: type, unit: '', icon: Activity, color: 'bg-gray-500' }
              const value = latestByType[type]
              let min: number | undefined, max: number | undefined
              if (type.startsWith('TEMPERATURE') && crop) { min = crop.temp_min;          max = crop.temp_max }
              else if (type === 'HUMIDITY' && crop)        { min = crop.humidity_min;      max = crop.humidity_max }
              else if (type === 'SOIL_MOISTURE' && crop)   { min = crop.soil_moisture_min; max = crop.soil_moisture_max }
              return (
                <SensorCard key={type} icon={meta.icon} label={meta.label} unit={meta.unit}
                  value={value} color={meta.color} min={min} max={max} />
              )
            })}
          </div>

          {history.length > 0 && (
            <div className="card p-5">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp size={15} className="text-green-500" />
                <h3 className="text-sm font-semibold text-gray-800">Temperatura — Últimas lecturas</h3>
              </div>
              <ResponsiveContainer width="100%" height={160}>
                <LineChart data={history}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f4f0" />
                  <XAxis dataKey="time" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false} domain={['auto', 'auto']} />
                  <Tooltip
                    contentStyle={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '12px', boxShadow: '0 4px 16px rgba(0,0,0,0.06)', fontSize: 12 }}
                    formatter={(v: number) => [`${v}°C`, 'Temperatura']}
                  />
                  <Line type="monotone" dataKey="temp" stroke="#16a34a" strokeWidth={2} dot={false} activeDot={{ r: 4, fill: '#16a34a' }} />
                </LineChart>
              </ResponsiveContainer>
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
