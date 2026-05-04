import React, { useState } from 'react'

const initialAlerts = [
  { id:1, level:'CRITICAL', message:'Temperatura superior a 35°C en Zona A', time:'Hace 5 min',  read:false },
  { id:2, level:'WARNING',  message:'CO₂ elevado: 1240 ppm en Zona B',       time:'Hace 18 min', read:false },
  { id:3, level:'INFO',     message:'Riego automático completado — Zona C',   time:'Hace 1h',     read:true  },
  { id:4, level:'WARNING',  message:'Humedad del suelo por debajo del 40%',   time:'Hace 2h',     read:true  },
  { id:5, level:'INFO',     message:'Cultivo Tomate Cherry avanzó a GROWING', time:'Hace 3h',     read:true  },
]

const levelConfig = {
  CRITICAL: { color:'var(--color-alert-red)',    icon:'⚠', badge:'badge-critical', label:'Crítico' },
  WARNING:  { color:'var(--color-alert-yellow)', icon:'◉', badge:'badge-warn',     label:'Advertencia' },
  INFO:     { color:'var(--color-mint)',          icon:'◈', badge:'badge-ok',       label:'Info' },
}

export default function AlertsPage() {
  const [alerts, setAlerts] = useState(initialAlerts)
  const [filter, setFilter] = useState('ALL')

  const filtered = filter==='ALL' ? alerts : alerts.filter(a=>a.level===filter)
  const unread   = alerts.filter(a=>!a.read).length

  const markRead = (id) => setAlerts(prev=>prev.map(a=>a.id===id?{...a,read:true}:a))
  const dismiss  = (id) => setAlerts(prev=>prev.filter(a=>a.id!==id))

  return (
    <div className="page">
      <div className="page-header">
        <div style={{display:'flex',alignItems:'center',gap:12}}>
          <h2>Alertas</h2>
          {unread>0&&<span className="badge badge-critical">{unread} sin leer</span>}
        </div>
        <p>Implementa: Patrón Observer (AlertObserver), Pila LIFO (AlertStack), Patrón Proxy (control de acceso)</p>
      </div>

      <div style={{display:'flex',gap:8,marginBottom:20}}>
        {['ALL','CRITICAL','WARNING','INFO'].map(f=>(
          <button key={f} className={`btn ${filter===f?'btn-primary':'btn-outline'}`}
            style={{fontSize:'0.75rem',padding:'4px 12px'}} onClick={()=>setFilter(f)}>
            {f==='ALL'?'Todas':levelConfig[f]?.label??f}
          </button>
        ))}
      </div>

      <div style={{display:'flex',flexDirection:'column',gap:10}}>
        {filtered.map(alert=>{
          const cfg = levelConfig[alert.level]
          return (
            <div key={alert.id} className="card" style={{
              borderLeft:`3px solid ${cfg.color}`,
              opacity: alert.read ? 0.65 : 1,
              padding:'16px 20px',
            }}>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                <div style={{display:'flex',alignItems:'center',gap:12}}>
                  <span style={{fontSize:'1.2rem'}}>{cfg.icon}</span>
                  <div>
                    <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:4}}>
                      <span className={`badge ${cfg.badge}`}>{cfg.label}</span>
                      <span style={{fontSize:'0.7rem',color:'var(--text-muted)',fontFamily:'var(--font-display)'}}>{alert.time}</span>
                    </div>
                    <div style={{fontSize:'0.9rem',color:'var(--text-primary)'}}>{alert.message}</div>
                  </div>
                </div>
                <div style={{display:'flex',gap:8}}>
                  {!alert.read&&<button className="btn btn-outline" style={{fontSize:'0.7rem',padding:'3px 10px'}} onClick={()=>markRead(alert.id)}>Leer</button>}
                  <button className="btn btn-danger" style={{fontSize:'0.7rem',padding:'3px 10px'}} onClick={()=>dismiss(alert.id)}>✕</button>
                </div>
              </div>
            </div>
          )
        })}
        {filtered.length===0&&(
          <div className="card" style={{textAlign:'center',padding:'40px',color:'var(--text-muted)'}}>
            ◈ No hay alertas en esta categoría
          </div>
        )}
      </div>
    </div>
  )
}
