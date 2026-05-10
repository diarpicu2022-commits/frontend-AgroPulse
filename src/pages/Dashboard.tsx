import { useState, useEffect } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Thermometer, Droplets, Leaf, Bell, RefreshCw, Sun, Activity, ChevronDown, type LucideIcon } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { greenhouseRepository, readingRepository, alertRepository, cropRepository } from '../repositories'
import SensorCard from '../components/SensorCard'
import AlertsBanner from '../components/AlertsBanner'
import type { GreenhouseDto, CropDto, AlertDto, SensorReadingDto, SensorType, AutoAlert } from '../types'

interface SensorMeta {
  label: string; unit: string; icon: LucideIcon; color: string
}

const SENSOR_META: Record<string, SensorMeta> = {
  TEMPERATURE_INTERNAL: { label: 'Temp. Interior', unit: '°C',  icon: Thermometer, color: 'bg-orange-500' },
  TEMPERATURE_EXTERNAL: { label: 'Temp. Exterior', unit: '°C',  icon: Thermometer, color: 'bg-blue-500'   },
  TEMPERATURE:          { label: 'Temperatura',    unit: '°C',  icon: Thermometer, color: 'bg-orange-500' },
  HUMIDITY:             { label: 'Humedad Aire',   unit: '%',   icon: Droplets,    color: 'bg-cyan-500'   },
  SOIL_MOISTURE:        { label: 'Humedad Suelo',  unit: '%',   icon: Leaf,        color: 'bg-green-600'  },
  LIGHT:                { label: 'Luminosidad',    unit: 'lx',  icon: Sun,         color: 'bg-yellow-500' },
  CO2:                  { label: 'CO₂',            unit: 'ppm', icon: Activity,    color: 'bg-purple-500' },
}

interface ChartPoint { time: string; temp: number }

export default function Dashboard() {
  useAuth()
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

  useEffect(() => {
    greenhouseRepository.list()
      .then(data => {
        const list = data?.greenhouses ?? []
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
        newAlerts.push({ type: 'TEMPERATURE', title: '❄️ Temperatura muy baja', message: `${tempR.value.toFixed(1)}°C (mín: ${cropData.temp_min}°C)`, timestamp: now })
      else if (cropData.temp_max != null && tempR.value > cropData.temp_max)
        newAlerts.push({ type: 'TEMPERATURE', title: '🔥 Temperatura muy alta', message: `${tempR.value.toFixed(1)}°C (máx: ${cropData.temp_max}°C)`, timestamp: now })
    }

    const humidity = readingsData.find(r => r.sensorType === 'HUMIDITY')
    if (humidity && cropData.humidity_min != null && cropData.humidity_max != null) {
      if (humidity.value < cropData.humidity_min)
        newAlerts.push({ type: 'HUMIDITY', title: '🏜️ Humedad muy baja', message: `${humidity.value.toFixed(1)}% (mín: ${cropData.humidity_min}%)`, timestamp: now })
      else if (humidity.value > cropData.humidity_max)
        newAlerts.push({ type: 'HUMIDITY', title: '💦 Humedad muy alta', message: `${humidity.value.toFixed(1)}% (máx: ${cropData.humidity_max}%)`, timestamp: now })
    }

    const soil = readingsData.find(r => r.sensorType === 'SOIL_MOISTURE')
    if (soil && cropData.soil_moisture_min != null && cropData.soil_moisture_max != null) {
      if (soil.value < cropData.soil_moisture_min)
        newAlerts.push({ type: 'SOIL_MOISTURE', title: '🏜️ Suelo muy seco', message: `${soil.value.toFixed(1)}% (mín: ${cropData.soil_moisture_min}%)`, timestamp: now })
      else if (soil.value > cropData.soil_moisture_max)
        newAlerts.push({ type: 'SOIL_MOISTURE', title: '💧 Suelo muy húmedo', message: `${soil.value.toFixed(1)}% (máx: ${cropData.soil_moisture_max}%)`, timestamp: now })
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
              time: new Date(r.timestamp).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }),
              temp: parseFloat(r.value.toFixed(1)),
            }))
          setHistory(tempData)
        } else { setHistory([]) }

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

      setLastUpdate(new Date().toLocaleTimeString('es-CO'))
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

  return (
    <div className="space-y-5">
      <AlertsBanner alerts={autoAlerts} onDismiss={idx => setAutoAlerts(a => a.filter((_, i) => i !== idx))} />

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
          ⚠️ Error cargando datos: {error}
        </div>
      )}

      {/* Header row */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-1">¡Bienvenido! 👋</h2>
          <p className="text-sm text-gray-600">
            {crop ? `🌿 Cultivo activo: ${crop.name}` : 'Sin cultivo activo'}
            {lastUpdate && ' · Actualizado hace momentos'}
          </p>
        </div>
        <button onClick={loadData}
          className="btn-primary px-4 py-2 text-sm flex items-center gap-2 shrink-0">
          <RefreshCw size={15} /> Actualizar
        </button>
      </div>

      {/* Greenhouse selector */}
      {greenhouses.length > 1 && (
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600 font-medium">Invernadero:</span>
          <div className="relative">
            <select
              value={selectedGh?.id ?? ''}
              onChange={e => {
                const gh = greenhouses.find(g => g.id === parseInt(e.target.value))
                if (gh) { setSelectedGh(gh); setReadings([]); setLoading(true) }
              }}
              className="appearance-none bg-white border border-gray-200 rounded-lg px-3 py-1.5 pr-8 text-sm font-medium text-gray-800 focus:outline-none focus:ring-2 focus:ring-green-400 cursor-pointer"
            >
              {greenhouses.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
            <ChevronDown size={14} className="absolute right-2 top-2.5 text-gray-400 pointer-events-none" />
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="animate-spin text-4xl">🌿</div>
        </div>
      ) : (
        <>
          {uniqueTypes.length === 0 ? (
            <div className="bg-gray-50 rounded-2xl border border-dashed border-gray-200 p-8 text-center">
              <p className="text-gray-400 text-sm">Sin lecturas para {selectedGh?.name ?? 'este invernadero'}.</p>
              <p className="text-gray-400 text-xs mt-1">El ESP32 comenzará a enviar datos cuando esté vinculado y conectado.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {uniqueTypes.map(type => {
                const meta  = SENSOR_META[type] ?? { label: type, unit: '', icon: Activity, color: 'bg-gray-500' }
                const Icon  = meta.icon
                const value = latestByType[type]
                let min: number | undefined, max: number | undefined
                if (type.startsWith('TEMPERATURE') && crop) { min = crop.temp_min;          max = crop.temp_max }
                else if (type === 'HUMIDITY' && crop)        { min = crop.humidity_min;      max = crop.humidity_max }
                else if (type === 'SOIL_MOISTURE' && crop)   { min = crop.soil_moisture_min; max = crop.soil_moisture_max }
                return (
                  <SensorCard key={type} icon={Icon} label={meta.label} unit={meta.unit}
                    value={value} color={meta.color} min={min} max={max} />
                )
              })}
            </div>
          )}

          {history.length > 0 && (
            <div className="card p-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">📈 Temperatura (últimas lecturas)</h3>
              <ResponsiveContainer width="100%" height={160}>
                <LineChart data={history}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="time" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} domain={['auto', 'auto']} />
                  <Tooltip />
                  <Line type="monotone" dataKey="temp" stroke="#16a34a" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {alerts.length > 0 && (
            <div className="card p-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">🔔 Alertas Recientes</h3>
              <div className="space-y-2">
                {alerts.map(a => (
                  <div key={a.id} className={`flex items-start gap-2 p-2 rounded-xl text-sm ${
                    a.level === 'CRITICAL' ? 'bg-red-50 text-red-700' :
                    a.level === 'WARNING'  ? 'bg-yellow-50 text-yellow-700' :
                    'bg-blue-50 text-blue-700'
                  }`}>
                    <Bell size={14} className="mt-0.5 shrink-0" />
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
