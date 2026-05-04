import React, { useState, useEffect } from 'react'
import {
  LineChart, Line, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts'

/* ─── Mock data (en producción viene del backend Spring Boot) ─ */
const mockReadings = Array.from({ length: 24 }, (_, i) => ({
  hour: `${String(i).padStart(2, '0')}:00`,
  temp:     22 + Math.sin(i * 0.3) * 4 + Math.random() * 1.5,
  humidity: 65 + Math.cos(i * 0.25) * 8 + Math.random() * 2,
  co2:      820 + Math.sin(i * 0.4) * 120 + Math.random() * 30,
  soil:     55 + Math.sin(i * 0.2) * 10 + Math.random() * 3,
}))

const currentSensors = [
  { type: 'TEMPERATURE',   label: 'Temperatura',   value: 24.3,  unit: '°C',  icon: '🌡',  status: 'ok',     color: '#e8871a', trend: '+0.4° últimas 2h' },
  { type: 'HUMIDITY',      label: 'Humedad Aire',  value: 68.1,  unit: '%',   icon: '💧',  status: 'ok',     color: '#5b9bd5', trend: '-2% últimas 2h' },
  { type: 'CO2',           label: 'CO₂',           value: 847,   unit: 'ppm', icon: '🌬',  status: 'warn',   color: '#d4a017', trend: '+87ppm últimas 2h' },
  { type: 'SOIL_MOISTURE', label: 'Humedad Suelo', value: 52.7,  unit: '%',   icon: '🪨',  status: 'ok',     color: '#6dab7f', trend: '-3% últimas 2h' },
  { type: 'LIGHT',         label: 'Luminosidad',   value: 12400, unit: 'lux', icon: '☀',   status: 'ok',     color: '#f4a144', trend: 'Pico solar 12:00' },
  { type: 'PH',            label: 'pH Suelo',      value: 6.4,   unit: 'pH',  icon: '⚗',   status: 'ok',     color: '#a8d8a8', trend: 'Óptimo para cultivo' },
]

const cropStages = [
  { name: 'Tomate Cherry',  stage: 'GROWING',    days: 34, progress: 45 },
  { name: 'Lechuga Boston', stage: 'HARVESTING', days: 68, progress: 90 },
  { name: 'Cilantro',       stage: 'SEEDING',    days: 3,  progress: 8 },
]

const stageLabels = {
  SEEDING:    'Siembra',
  GROWING:    'Crecimiento',
  FLOWERING:  'Floración',
  HARVESTING: 'Cosecha',
  DORMANT:    'Reposo',
}

/* ─── Sub-components ─────────────────────────────────────── */
function SensorCard({ sensor }) {
  return (
    <div className="card sensor-card" style={{ '--accent-color': sensor.color }}>
      <div className="card-header">
        <span className="card-label">{sensor.label}</span>
        <span className="sensor-icon">{sensor.icon}</span>
      </div>
      <div className="sensor-value mono">{sensor.value.toLocaleString()}</div>
      <div className="sensor-unit">{sensor.unit}</div>
      <div className="sensor-trend">{sensor.trend}</div>
      <div style={{ marginTop: 12 }}>
        <span className={`badge badge-${sensor.status}`}>
          {sensor.status === 'ok' ? 'Normal' : sensor.status === 'warn' ? 'Atención' : 'Crítico'}
        </span>
      </div>
    </div>
  )
}

function CropRow({ crop }) {
  return (
    <tr>
      <td><strong style={{ color: 'var(--text-primary)' }}>{crop.name}</strong></td>
      <td>
        <span className={`stage-badge stage-${crop.stage}`}>
          {stageLabels[crop.stage]}
        </span>
      </td>
      <td className="mono" style={{ color: 'var(--text-muted)' }}>Día {crop.days}</td>
      <td style={{ width: 120 }}>
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${crop.progress}%` }} />
        </div>
      </td>
      <td className="mono" style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{crop.progress}%</td>
    </tr>
  )
}

/* ─── Tooltip personalizado ─────────────────────────────── */
function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: 'var(--surface-2)',
      border: '1px solid var(--border-normal)',
      borderRadius: 8,
      padding: '8px 12px',
      fontSize: '0.8rem',
      fontFamily: 'var(--font-display)',
    }}>
      <div style={{ color: 'var(--text-muted)', marginBottom: 6 }}>{label}</div>
      {payload.map((entry, i) => (
        <div key={i} style={{ color: entry.color }}>
          {entry.name}: {entry.value.toFixed(1)}
        </div>
      ))}
    </div>
  )
}

/* ─── Dashboard principal ───────────────────────────────── */
export default function Dashboard() {
  const [activeChart, setActiveChart] = useState('temp')

  const chartConfig = {
    temp:     { key: 'temp',     label: 'Temperatura °C',   color: '#e8871a' },
    humidity: { key: 'humidity', label: 'Humedad %',        color: '#5b9bd5' },
    co2:      { key: 'co2',      label: 'CO₂ ppm',          color: '#d4a017' },
    soil:     { key: 'soil',     label: 'Hum. Suelo %',     color: '#6dab7f' },
  }

  const chart = chartConfig[activeChart]

  return (
    <div className="page">
      {/* Header */}
      <div className="page-header">
        <h2>Resumen del Sistema</h2>
        <p>Monitoreo en tiempo real — Invernadero Principal, Pasto, Nariño</p>
      </div>

      {/* Sensor cards grid */}
      <div className="grid-3" style={{ marginBottom: 24 }}>
        {currentSensors.map(s => <SensorCard key={s.type} sensor={s} />)}
      </div>

      {/* Chart + Crops */}
      <div className="grid-2">

        {/* Chart card */}
        <div className="card" style={{ gridColumn: 'span 1' }}>
          <div className="card-header">
            <h3>Histórico 24h</h3>
            <div style={{ display: 'flex', gap: 8 }}>
              {Object.values(chartConfig).map(c => (
                <button
                  key={c.key}
                  className={`btn ${activeChart === c.key ? 'btn-primary' : 'btn-outline'}`}
                  style={{ padding: '4px 10px', fontSize: '0.7rem' }}
                  onClick={() => setActiveChart(c.key)}
                >
                  {c.label.split(' ')[0]}
                </button>
              ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={mockReadings} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
              <defs>
                <linearGradient id="colorGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={chart.color} stopOpacity={0.25} />
                  <stop offset="95%" stopColor={chart.color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" />
              <XAxis dataKey="hour" tick={{ fontSize: 10, fill: 'var(--text-muted)', fontFamily: 'var(--font-display)' }} interval={3} />
              <YAxis tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey={chart.key}
                name={chart.label}
                stroke={chart.color}
                strokeWidth={2}
                fill="url(#colorGrad)"
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Crops status card */}
        <div className="card">
          <div className="card-header">
            <h3>Estado de Cultivos</h3>
            <span className="badge badge-ok">{cropStages.length} activos</span>
          </div>
          <table className="data-table">
            <thead>
              <tr>
                <th>Cultivo</th>
                <th>Etapa</th>
                <th>Edad</th>
                <th>Progreso</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {cropStages.map(c => <CropRow key={c.name} crop={c} />)}
            </tbody>
          </table>
        </div>

      </div>

      {/* Pattern callout */}
      <div className="card" style={{ marginTop: 20, borderColor: 'rgba(168,216,168,0.2)' }}>
        <div className="card-header">
          <h3>Patrones de Diseño Activos</h3>
        </div>
        <div className="grid-4">
          {[
            { pat: 'Singleton', desc: 'Conexión DB única', color: '#6dab7f' },
            { pat: 'Observer',  desc: 'Monitor → Alertas', color: '#5b9bd5' },
            { pat: 'State',     desc: 'Ciclo del cultivo', color: '#f4a144' },
            { pat: 'Facade',    desc: 'API unificada', color: '#d4a017' },
            { pat: 'Proxy',     desc: 'Caché + roles', color: '#a8d8a8' },
            { pat: 'Decorator', desc: 'Filtro + promedio', color: '#e8871a' },
            { pat: 'Bridge',    desc: 'WiFi / LoRa ESP32', color: '#c94040' },
            { pat: 'Builder',   desc: 'Horarios de riego', color: '#6b8f6d' },
          ].map(p => (
            <div key={p.pat} style={{
              padding: '10px 14px',
              background: 'var(--surface-2)',
              borderRadius: 8,
              borderLeft: `3px solid ${p.color}`,
            }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.75rem', color: p.color }}>{p.pat}</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 2 }}>{p.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
