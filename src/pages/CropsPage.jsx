import React, { useState } from 'react'

const crops = [
  { id:1, name:'Tomate Cherry',  variety:'Lycopersicum', stage:'GROWING',    tempMin:18, tempMax:28, humMin:60, humMax:75, days:34 },
  { id:2, name:'Lechuga Boston', variety:'Lactuca sativa',stage:'HARVESTING',tempMin:15, tempMax:22, humMin:65, humMax:80, days:68 },
  { id:3, name:'Cilantro',       variety:'Coriandrum',   stage:'SEEDING',    tempMin:17, tempMax:27, humMin:55, humMax:70, days:3  },
]

const stageLabels = { SEEDING:'Siembra', GROWING:'Crecimiento', FLOWERING:'Floración', HARVESTING:'Cosecha', DORMANT:'Reposo' }
const stageFlow   = ['SEEDING','GROWING','FLOWERING','HARVESTING','DORMANT']

function StageProgress({ stage }) {
  const idx = stageFlow.indexOf(stage)
  return (
    <div style={{display:'flex',alignItems:'center',gap:4,margin:'16px 0'}}>
      {stageFlow.map((s,i)=>(
        <React.Fragment key={s}>
          <div style={{
            padding:'3px 8px', borderRadius:20, fontSize:'0.65rem',
            fontFamily:'var(--font-display)',
            background: i===idx ? 'rgba(109,171,127,0.2)' : 'var(--surface-2)',
            color: i===idx ? 'var(--color-mint)' : i<idx ? 'var(--text-muted)' : 'var(--text-muted)',
            border: i===idx ? '1px solid rgba(109,171,127,0.4)' : '1px solid transparent',
          }}>{stageLabels[s]}</div>
          {i<stageFlow.length-1&&<div style={{color:'var(--text-muted)',fontSize:'0.6rem'}}>→</div>}
        </React.Fragment>
      ))}
    </div>
  )
}

export default function CropsPage() {
  const [crops_state, setCrops] = useState(crops)

  const advanceStage = (id) => {
    setCrops(prev=>prev.map(c=>{
      if (c.id!==id) return c
      const idx = stageFlow.indexOf(c.stage)
      const next = stageFlow[(idx+1)%stageFlow.length]
      return {...c, stage: next}
    }))
  }

  return (
    <div className="page">
      <div className="page-header">
        <h2>Cultivos</h2>
        <p>Implementa: Patrón State (ciclo de vida), Prototype (clonar cultivo), Builder (horarios de riego)</p>
      </div>
      <div style={{display:'flex',flexDirection:'column',gap:16}}>
        {crops_state.map(c=>(
          <div key={c.id} className="card">
            <div className="card-header">
              <div>
                <h2 style={{fontSize:'1.1rem',marginBottom:4}}>{c.name}</h2>
                <span style={{fontSize:'0.75rem',color:'var(--text-muted)',fontStyle:'italic'}}>{c.variety}</span>
              </div>
              <div style={{display:'flex',gap:8,alignItems:'center'}}>
                <span className={`stage-badge stage-${c.stage}`}>{stageLabels[c.stage]}</span>
                <span style={{fontSize:'0.75rem',color:'var(--text-muted)',fontFamily:'var(--font-display)'}}>DÍA {c.days}</span>
              </div>
            </div>

            <StageProgress stage={c.stage} />

            <div className="grid-4" style={{marginBottom:16}}>
              {[
                {label:'Temp. Min',value:`${c.tempMin}°C`},
                {label:'Temp. Max',value:`${c.tempMax}°C`},
                {label:'Hum. Min', value:`${c.humMin}%`},
                {label:'Hum. Max', value:`${c.humMax}%`},
              ].map(m=>(
                <div key={m.label} style={{background:'var(--surface-2)',borderRadius:8,padding:'10px 12px'}}>
                  <div style={{fontSize:'0.65rem',color:'var(--text-muted)',fontFamily:'var(--font-display)'}}>{m.label}</div>
                  <div style={{fontFamily:'var(--font-display)',fontSize:'1rem',color:'var(--text-primary)',marginTop:4}}>{m.value}</div>
                </div>
              ))}
            </div>

            <div style={{display:'flex',gap:8}}>
              <button className="btn btn-primary" onClick={()=>advanceStage(c.id)}>
                ▶ Avanzar Etapa
              </button>
              <button className="btn btn-outline">⊕ Clonar Cultivo</button>
              <button className="btn btn-outline">◌ Programar Riego</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
