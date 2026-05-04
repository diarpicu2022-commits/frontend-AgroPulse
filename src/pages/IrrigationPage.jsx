import React, { useState } from 'react'

const zones = [
  { id:'A', name:'Zona A — Tomates',  duration:25, time:'06:00', days:['Lun','Mié','Vie'], active:true,  humidity:52 },
  { id:'B', name:'Zona B — Lechugas', duration:15, time:'06:30', days:['Lun','Mar','Jue','Vie'], active:true, humidity:71 },
  { id:'C', name:'Zona C — Cilantro', duration:20, time:'07:00', days:['Mié','Sáb'],       active:false, humidity:38 },
  { id:'D', name:'Zona D — Campo',    duration:40, time:'05:30', days:['Lun','Jue'],        active:true,  humidity:45 },
]

export default function IrrigationPage() {
  const [zones_state, setZones] = useState(zones)
  const [showNew, setShowNew] = useState(false)

  const toggle = (id) => setZones(prev=>prev.map(z=>z.id===id?{...z,active:!z.active}:z))

  return (
    <div className="page">
      <div className="page-header">
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <div>
            <h2>Programas de Riego</h2>
            <p>Implementa: Builder (IrrigationSchedule), Cola FIFO (IrrigationQueue), Lista Circular Doble (rotación de zonas)</p>
          </div>
          <button className="btn btn-primary" onClick={()=>setShowNew(!showNew)}>+ Nuevo Programa</button>
        </div>
      </div>

      <div style={{display:'flex',flexDirection:'column',gap:14}}>
        {zones_state.map((z,i)=>(
          <div key={z.id} className="card" style={{borderLeft:`3px solid ${z.active?'var(--color-mint)':'var(--border-subtle)'}`}}>
            <div className="card-header">
              <div style={{display:'flex',alignItems:'center',gap:12}}>
                <div style={{
                  width:32,height:32,borderRadius:8,
                  background:'var(--surface-2)',
                  display:'flex',alignItems:'center',justifyContent:'center',
                  fontFamily:'var(--font-display)',fontSize:'0.85rem',
                  color:'var(--color-mint)'
                }}>{z.id}</div>
                <div>
                  <div style={{fontWeight:600,color:'var(--text-primary)'}}>{z.name}</div>
                  <div style={{fontSize:'0.7rem',color:'var(--text-muted)',marginTop:2}}>
                    {z.days.join(' · ')} — {z.time} — {z.duration} min
                  </div>
                </div>
              </div>
              <div style={{display:'flex',alignItems:'center',gap:10}}>
                <div style={{textAlign:'right'}}>
                  <div style={{fontSize:'0.65rem',color:'var(--text-muted)',fontFamily:'var(--font-display)'}}>HUM. SUELO</div>
                  <div style={{fontFamily:'var(--font-display)',color:z.humidity<45?'var(--color-alert-red)':'var(--color-mint)'}}>{z.humidity}%</div>
                </div>
                <button
                  className={`btn ${z.active?'btn-primary':'btn-outline'}`}
                  style={{padding:'6px 14px',fontSize:'0.8rem'}}
                  onClick={()=>toggle(z.id)}
                >{z.active?'Activo':'Inactivo'}</button>
              </div>
            </div>
            <div className="progress-bar" style={{marginTop:8}}>
              <div className="progress-fill" style={{width:`${z.humidity}%`}} />
            </div>
          </div>
        ))}
      </div>

      <div className="card" style={{marginTop:20}}>
        <h3 style={{marginBottom:16}}>Cola de Riego (FIFO)</h3>
        <p style={{fontSize:'0.85rem',marginBottom:12}}>
          Las órdenes de riego se encolan y ejecutan en el orden en que fueron programadas.
          La <strong style={{color:'var(--color-mint)'}}>estructura de datos Cola</strong> garantiza que la primera zona programada sea la primera en ejecutarse.
        </p>
        <table className="data-table">
          <thead><tr><th>#</th><th>Zona</th><th>Hora</th><th>Duración</th><th>Estado</th></tr></thead>
          <tbody>
            {zones_state.filter(z=>z.active).map((z,i)=>(
              <tr key={z.id}>
                <td className="mono" style={{color:'var(--text-muted)'}}>{i+1}</td>
                <td style={{color:'var(--text-primary)'}}>{z.name}</td>
                <td className="mono">{z.time}</td>
                <td className="mono">{z.duration} min</td>
                <td><span className="badge badge-ok">En espera</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
