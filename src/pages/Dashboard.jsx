import { useState, useEffect } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Thermometer, Droplets, Leaf, Bell, RefreshCw } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import api from '../services/api'
import SensorCard from '../components/SensorCard'
import AlertsBanner from '../components/AlertsBanner'

export default function Dashboard() {
  const { user }                    = useAuth()
  const [readings, setReadings]     = useState([])
  const [history,  setHistory]      = useState([])
  const [alerts,   setAlerts]       = useState([])
  const [autoAlerts, setAutoAlerts] = useState([])
  const [crop,     setCrop]         = useState(null)
  const [loading,  setLoading]      = useState(true)
  const [lastUpdate, setLastUpdate] = useState(null)
  const [error, setError]           = useState(null)

  useEffect(() => {
    loadData()
    const interval = setInterval(loadData, 5000)
    return () => clearInterval(interval)
  }, [])

  const generateAutoAlerts = (readingsData, cropData) => {
    if (!cropData || readingsData.length === 0) return []
    const newAlerts = []
    const now = new Date()
    const tempInt = readingsData.find(r => r.sensorType === 'TEMPERATURE_INTERNAL')
    if (tempInt) {
      if (tempInt.value < cropData.temp_min)
        newAlerts.push({ type: 'TEMPERATURE', title: '❄️ Temperatura muy baja', message: `${tempInt.value.toFixed(1)}°C (mín: ${cropData.temp_min}°C)`, timestamp: now })
      else if (tempInt.value > cropData.temp_max)
        newAlerts.push({ type: 'TEMPERATURE', title: '🔥 Temperatura muy alta', message: `${tempInt.value.toFixed(1)}°C (máx: ${cropData.temp_max}°C)`, timestamp: now })
    }
    const humidity = readingsData.find(r => r.sensorType === 'HUMIDITY')
    if (humidity) {
      if (humidity.value < cropData.humidity_min)
        newAlerts.push({ type: 'HUMIDITY', title: '🏜️ Humedad muy baja', message: `${humidity.value.toFixed(1)}% (mín: ${cropData.humidity_min}%)`, timestamp: now })
      else if (humidity.value > cropData.humidity_max)
        newAlerts.push({ type: 'HUMIDITY', title: '💦 Humedad muy alta', message: `${humidity.value.toFixed(1)}% (máx: ${cropData.humidity_max}%)`, timestamp: now })
    }
    const soil = readingsData.find(r => r.sensorType === 'SOIL_MOISTURE')
    if (soil) {
      if (soil.value < cropData.soil_moisture_min)
        newAlerts.push({ type: 'SOIL_MOISTURE', title: '🏜️ Suelo muy seco', message: `${soil.value.toFixed(1)}% (mín: ${cropData.soil_moisture_min}%)`, timestamp: now })
      else if (soil.value > cropData.soil_moisture_max)
        newAlerts.push({ type: 'SOIL_MOISTURE', title: '💧 Suelo muy húmedo', message: `${soil.value.toFixed(1)}% (máx: ${cropData.soil_moisture_max}%)`, timestamp: now })
    }
    return newAlerts
  }

  const saveAutoAlert = async (alert) => {
    try { await api.alerts.create({ type: alert.type, level: 'WARNING', message: alert.message, title: alert.title }) }
    catch (err) { console.error('Error saving alert:', err) }
  }

  const loadData = async () => {
    try {
      const readingsData = await api.readings.list(null, 200)
      if (readingsData && readingsData.readings) {
        setReadings(readingsData.readings)
        const tempData = readingsData.readings
          .filter(r => r.sensorType === 'TEMPERATURE_INTERNAL').slice(0, 20).reverse()
          .map(r => ({ time: new Date(r.timestamp).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }), temp: parseFloat(r.value.toFixed(1)) }))
        setHistory(tempData)
        const cropsData = await api.crops.list()
        if (cropsData && cropsData.crops && cropsData.crops.length > 0) {
          const activeCrop = cropsData.crops.find(c => c.active === 1 || c.active === true) || cropsData.crops[0]
          setCrop(activeCrop)
          const newAutoAlerts = generateAutoAlerts(readingsData.readings, activeCrop)
          if (newAutoAlerts.length > 0) { setAutoAlerts(newAutoAlerts); newAutoAlerts.forEach(alert => saveAutoAlert(alert)) }
          else setAutoAlerts([])
        }
      }
      try {
        const alertsData = await api.alerts.list()
        if (alertsData && alertsData.alerts) setAlerts(alertsData.alerts.slice(0, 5))
      } catch { /* alerts table may not be ready */ }
      setLastUpdate(new Date().toLocaleTimeString('es-CO'))
      setError(null)
    } catch (err) { setError(err.message) }
    finally { setLoading(false) }
  }

  const latest = (type) => { const r = readings.find(r => r.sensorType === type); return r ? r.value : null }
  const dismissAutoAlert = (idx) => setAutoAlerts(autoAlerts.filter((_, i) => i !== idx))

  return (
    <div className="space-y-6">
      <AlertsBanner alerts={autoAlerts} onDismiss={dismissAutoAlert} />
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
          ⚠️ Error cargando datos: {error}
        </div>
      )}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-3xl font-bold text-gray-800 mb-1">¡Bienvenido! 👋</h2>
          <p className="text-sm text-gray-600">
            {crop ? `🌿 Cultivo activo: ${crop.name}` : 'Sin cultivo activo'}
            {lastUpdate && ' · Actualizado hace momentos'}
          </p>
        </div>
        <button onClick={loadData} className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white px-5 py-2.5 rounded-xl text-sm font-medium shadow-md hover:shadow-lg transition-all duration-200 transform hover:scale-105 flex items-center gap-2">
          <RefreshCw size={16} className="animate-spin-slow" /> Actualizar
        </button>
      </div>
      {loading ? (
        <div className="flex items-center justify-center h-40"><div className="animate-spin text-4xl">🌿</div></div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3">
            <SensorCard icon={Thermometer} label="Temp. Interior" unit="°C" value={latest('TEMPERATURE_INTERNAL')} color="bg-orange-500" min={crop?.temp_min} max={crop?.temp_max} />
            <SensorCard icon={Thermometer} label="Temp. Exterior" unit="°C" value={latest('TEMPERATURE_EXTERNAL')} color="bg-blue-500" min={crop?.temp_min} max={crop?.temp_max} />
            <SensorCard icon={Droplets} label="Humedad" unit="%" value={latest('HUMIDITY')} color="bg-cyan-500" min={crop?.humidity_min} max={crop?.humidity_max} />
            <SensorCard icon={Leaf} label="Humedad Suelo" unit="%" value={latest('SOIL_MOISTURE')} color="bg-green-600" min={crop?.soil_moisture_min} max={crop?.soil_moisture_max} />
          </div>
          {history.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">📈 Temperatura Interior (últimas lecturas)</h3>
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
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">🔔 Alertas Recientes</h3>
              <div className="space-y-2">
                {alerts.map(a => (
                  <div key={a.id} className={`flex items-start gap-2 p-2 rounded-xl text-sm ${a.level === 'CRITICAL' ? 'bg-red-50 text-red-700' : a.level === 'WARNING' ? 'bg-yellow-50 text-yellow-700' : 'bg-blue-50 text-blue-700'}`}>
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
