import React, { useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

const sensors = [
  { id:1, name:'Temp-Interior-A', type:'TEMPERATURE', value:24.3, unit:'°C', location:'Zona A', active:true },
  { id:2, name:'Hum-Interior-A',  type:'HUMIDITY',    value:68.1, unit:'%',  location:'Zona A', active:true },
  { id:3, name:'CO2-Interior-B',  type:'CO2',         value:847,  unit:'ppm',location:'Zona B', active:true },
  { id:4, name:'SuMoist-Campo-C', type:'SOIL_MOISTURE',value:52.7,unit:'%',  location:'Zona C', active:true },
  { id:5, name:'pH-Campo-D',      type:'PH',          value:6.4,  unit:'pH', location:'Zona D', active:false},
  { id:6, name:'Temp-Exterior',   type:'TEMPERATURE', value:16.8, unit:'°C', location:'Exterior',active:true},
]

const typeColors = { TEMPERATURE:'#e8871a', HUMIDITY:'#5b9bd5', CO2:'#d4a017', SOIL_MOISTURE:'#6dab7f', PH:'#a8d8a8', LIGHT:'#f4a144' }
const typeIcons  = { TEMPERATURE:'🌡', HUMIDITY:'💧', CO2:'🌬', SOIL_MOISTURE:'🪨', PH:'⚗', LIGHT:'☀' }

export default function SensorsPage() {
  const [filter, setFilter] = useState('ALL')

  const filtered = filter==='ALL' ? sensors : sensors.filter(s=>s.type===filter)
  const types    = ['ALL', ...new Set(sensors.map(s=>s.type))]

  return (
    <div className="page">
      <div className="page-header">
        <h2>Sensores</h2>
        <p>Implementa: Abstract Factory (familias indoor/outdoor/field), Decorator (NoiseFilter + MovingAverage), Bridge (WiFi/LoRa)</p>
      </div>
      <div style={{display:'flex',gap:8,marginBottom:20,flexWrap:'wrap'}}>
        {types.map(t=>(
          <button key={t} className={`btn ${filter===t?'btn-primary':'btn-outline'}`}
            style={{fontSize:'0.75rem',padding:'4px 12px'}} onClick={()=>setFilter(t)}>
            {t==='ALL'?'Todos':t}
          </button>
        ))}
      </div>
      <div className="grid-3">
        {filtered.map(s=>(
          <div key={s.id} className="card sensor-card" style={{opacity:s.active?1:0.5,'--accent-color':typeColors[s.type]}}>
            <div className="card-header">
              <span className="card-label">{typeIcons[s.type]} {s.name}</span>
              <span className={`badge ${s.active?'badge-ok':'badge-warn'}`}>{s.active?'Activo':'Inactivo'}</span>
            </div>
            <div className="sensor-value mono">{s.value}</div>
            <div className="sensor-unit">{s.unit} — {s.location}</div>
            <div style={{marginTop:12,fontSize:'0.7rem',color:'var(--text-muted)',fontFamily:'var(--font-display)'}}>
              TIPO: {s.type}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
