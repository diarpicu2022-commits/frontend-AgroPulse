import { useEffect, useRef } from 'react'

export default function AgroBackground() {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!ref.current) return
    ref.current.style.opacity = '1'
  }, [])

  return (
    <div
      ref={ref}
      aria-hidden="true"
      style={{
        position: 'fixed', inset: 0, zIndex: 0,
        pointerEvents: 'none', overflow: 'hidden',
        opacity: 0, transition: 'opacity 1.4s ease',
      }}
    >
      <style>{`
        @keyframes agro-sway {
          0%,100% { transform: rotate(-4deg) scale(1); }
          50%      { transform: rotate(4deg) scale(1.04); }
        }
        @keyframes agro-float {
          0%,100% { transform: translateY(0px); }
          50%      { transform: translateY(-9px); }
        }
        @keyframes agro-peck {
          0%,35%,100% { transform: rotate(0deg) translateY(0); }
          50%          { transform: rotate(22deg) translateY(3px); }
        }
        @keyframes agro-breathe {
          0%,100% { transform: scaleX(1) scaleY(1); }
          50%      { transform: scaleX(1.07) scaleY(0.97); }
        }
        @keyframes agro-flutter {
          0%,100% { transform: scaleX(1); }
          50%      { transform: scaleX(0.55); }
        }
        @keyframes agro-drift {
          0%   { transform: translate(0,0); }
          25%  { transform: translate(7px,-5px); }
          50%  { transform: translate(0,-10px); }
          75%  { transform: translate(-7px,-5px); }
          100% { transform: translate(0,0); }
        }
        @keyframes agro-tail {
          0%,100% { transform: rotate(-15deg); }
          50%      { transform: rotate(15deg); }
        }
        @media (prefers-reduced-motion: reduce) {
          [data-agro] * { animation: none !important; }
        }
      `}</style>

      {/* ══ PLANTAS ══════════════════════════════════════════════ */}

      {/* Esquina inferior izquierda — arbusto con flores */}
      <svg data-agro style={{ position:'absolute', bottom:-20, left:-10, opacity:0.09 }}
           width="200" height="240" viewBox="0 0 200 240">
        <line x1="100" y1="240" x2="100" y2="80" stroke="#4ade80" strokeWidth="4" strokeLinecap="round"/>
        <line x1="100" y1="170" x2="45"  y2="115" stroke="#4ade80"  strokeWidth="2.5" strokeLinecap="round"/>
        <line x1="100" y1="140" x2="38"  y2="90"  stroke="#22d3ee" strokeWidth="2"   strokeLinecap="round"/>
        <line x1="100" y1="170" x2="158" y2="115" stroke="#4ade80"  strokeWidth="2.5" strokeLinecap="round"/>
        <line x1="100" y1="148" x2="162" y2="98"  stroke="#22d3ee" strokeWidth="2"   strokeLinecap="round"/>
        <ellipse cx="40"  cy="104" rx="20" ry="11" fill="#4ade80" style={{ transformOrigin:'40px 104px',  animation:'agro-sway 3.8s ease-in-out infinite' }}      transform="rotate(-30)"/>
        <ellipse cx="32"  cy="80"  rx="16" ry="9"  fill="#22d3ee" style={{ transformOrigin:'32px 80px',   animation:'agro-sway 4.3s ease-in-out infinite 0.5s' }} transform="rotate(-50)"/>
        <ellipse cx="162" cy="104" rx="20" ry="11" fill="#4ade80" style={{ transformOrigin:'162px 104px', animation:'agro-sway 3.5s ease-in-out infinite 0.8s' }} transform="rotate(30)"/>
        <ellipse cx="168" cy="84"  rx="16" ry="9"  fill="#fb923c" opacity="0.7" style={{ transformOrigin:'168px 84px', animation:'agro-sway 4s ease-in-out infinite 1.2s' }} transform="rotate(50)"/>
        <ellipse cx="100" cy="68"  rx="18" ry="26" fill="#4ade80" style={{ transformOrigin:'100px 68px',  animation:'agro-sway 3.2s ease-in-out infinite 0.3s' }}/>
        <circle cx="100" cy="56" r="7"  fill="#fbbf24" opacity="0.85"/>
        <circle cx="100" cy="56" r="3.5" fill="#fb923c"/>
      </svg>

      {/* Esquina superior derecha — planta trepadora */}
      <svg data-agro style={{ position:'absolute', top:-10, right:-10, opacity:0.08 }}
           width="190" height="190" viewBox="0 0 190 190">
        <line x1="190" y1="0" x2="95"  y2="115" stroke="#22d3ee" strokeWidth="3" strokeLinecap="round"/>
        <line x1="172" y1="0" x2="76"  y2="132" stroke="#4ade80" strokeWidth="2" strokeLinecap="round"/>
        <ellipse cx="80"  cy="96"  rx="19" ry="10" fill="#22d3ee" style={{ transformOrigin:'80px 96px',  animation:'agro-sway 4s ease-in-out infinite' }}      transform="rotate(-40)"/>
        <ellipse cx="100" cy="76"  rx="17" ry="9"  fill="#4ade80" style={{ transformOrigin:'100px 76px', animation:'agro-sway 3.5s ease-in-out infinite 0.7s' }} transform="rotate(-20)"/>
        <ellipse cx="65"  cy="124" rx="15" ry="8"  fill="#fbbf24" opacity="0.6" style={{ transformOrigin:'65px 124px', animation:'agro-sway 4.5s ease-in-out infinite 1s' }} transform="rotate(-55)"/>
        <circle cx="90" cy="64" r="5" fill="#fb923c" opacity="0.7"/>
        <circle cx="90" cy="64" r="2.5" fill="#fbbf24"/>
      </svg>

      {/* Borde derecho — caña de bambú */}
      <svg data-agro style={{ position:'absolute', right:18, top:'28%', opacity:0.07 }}
           width="58" height="280" viewBox="0 0 58 280">
        <line x1="28" y1="0" x2="28" y2="280" stroke="#4ade80" strokeWidth="5" strokeLinecap="round"/>
        {[55,110,165,220].map(y => (
          <g key={y}>
            <line x1="28" y1={y}   x2="28" y2={y+8} stroke="#22d3ee" strokeWidth="7" strokeLinecap="round"/>
            <line x1="28" y1={y+4} x2="52" y2={y-14} stroke="#4ade80" strokeWidth="2" strokeLinecap="round"/>
            <ellipse cx="50" cy={y-18} rx="13" ry="6" fill="#4ade80"
              style={{ transformOrigin:`50px ${y-18}px`, animation:`agro-sway 3.5s ease-in-out infinite ${y*0.01}s` }}
              transform="rotate(-20)"/>
          </g>
        ))}
      </svg>

      {/* Borde izquierdo — helecho */}
      <svg data-agro style={{ position:'absolute', left:-6, top:'38%', opacity:0.08 }}
           width="115" height="190" viewBox="0 0 115 190">
        <line x1="18" y1="190" x2="76" y2="56" stroke="#4ade80" strokeWidth="3" strokeLinecap="round"/>
        {[0,1,2,3,4].map(i => {
          const y = 172 - i * 26; const xb = 76 - i * 10
          return (
            <g key={i}>
              <ellipse cx={xb-24} cy={y-9} rx="19" ry="7" fill="#22d3ee"
                style={{ transformOrigin:`${xb-24}px ${y-9}px`, animation:`agro-sway ${3.5+i*0.3}s ease-in-out infinite ${i*0.2}s` }}
                transform="rotate(-30)" opacity="0.9"/>
              <ellipse cx={xb+14} cy={y-9} rx="17" ry="7" fill="#4ade80"
                style={{ transformOrigin:`${xb+14}px ${y-9}px`, animation:`agro-sway ${3.8+i*0.2}s ease-in-out infinite ${i*0.3}s` }}
                transform="rotate(30)" opacity="0.9"/>
            </g>
          )
        })}
      </svg>

      {/* Centro fondo — flores silvestres */}
      {([
        { x:280,  y:110, c:'#fbbf24', r:6 },
        { x:580,  y:75,  c:'#fb923c', r:5 },
        { x:860,  y:140, c:'#a78bfa', r:7 },
        { x:440,  y:390, c:'#22d3ee', r:5 },
        { x:730,  y:340, c:'#4ade80', r:6 },
        { x:1060, y:190, c:'#fbbf24', r:5 },
      ] as const).map(({ x, y, c, r }, i) => (
        <svg key={i} style={{ position:'absolute', left:x, top:y, opacity:0.065 }}
             width={r*8} height={r*8} viewBox={`0 0 ${r*8} ${r*8}`}>
          {[0,60,120,180,240,300].map(a => (
            <ellipse key={a} cx={r*4} cy={r*4-r*2} rx={r*0.9} ry={r*1.4}
              fill={c} transform={`rotate(${a} ${r*4} ${r*4})`}
              style={{ animation:`agro-float ${3+i*0.4}s ease-in-out infinite ${i*0.3}s` }}/>
          ))}
          <circle cx={r*4} cy={r*4} r={r*0.7} fill="#fbbf24"/>
        </svg>
      ))}

      {/* Esquina inferior derecha — árbol frutal */}
      <svg data-agro style={{ position:'absolute', bottom:-30, right:-20, opacity:0.08 }}
           width="170" height="230" viewBox="0 0 170 230">
        <line x1="85" y1="230" x2="85" y2="100" stroke="#fb923c" strokeWidth="6" strokeLinecap="round" opacity="0.5"/>
        <ellipse cx="85" cy="78"  rx="52" ry="43" fill="#14532d"/>
        <ellipse cx="62" cy="63"  rx="36" ry="30" fill="#166534"/>
        <ellipse cx="110" cy="68" rx="33" ry="28" fill="#15803d"/>
        <ellipse cx="85" cy="48"  rx="30" ry="26" fill="#22c55e"
          style={{ animation:'agro-sway 4s ease-in-out infinite' }}/>
        <circle cx="68"  cy="70" r="5.5" fill="#f87171" opacity="0.9"/>
        <circle cx="100" cy="66" r="5"   fill="#fb923c" opacity="0.9"/>
        <circle cx="84"  cy="53" r="5"   fill="#fbbf24" opacity="0.9"/>
      </svg>

      {/* ══ ANIMALES DE GRANJA ═══════════════════════════════════ */}

      {/* VACA — izquierda centro-alta */}
      <svg data-agro style={{ position:'absolute', top:'18%', left:55, opacity:0.10 }}
           width="80" height="60" viewBox="0 0 80 60">
        <g style={{ animation:'agro-float 4s ease-in-out infinite' }}>
          {/* Cuerpo */}
          <ellipse cx="46" cy="38" rx="26" ry="16" fill="#f0ebe0"/>
          {/* Manchas */}
          <ellipse cx="40" cy="34" rx="7"  ry="5"  fill="#3d2b1f" opacity="0.35"/>
          <ellipse cx="56" cy="40" rx="5"  ry="4"  fill="#3d2b1f" opacity="0.28"/>
          {/* Cabeza */}
          <ellipse cx="16" cy="28" rx="13" ry="11" fill="#f0ebe0"/>
          {/* Orejas */}
          <ellipse cx="7"  cy="19" rx="4"  ry="5.5" fill="#f0ebe0" transform="rotate(-15 7 19)"/>
          <ellipse cx="25" cy="18" rx="3.5" ry="5"  fill="#f0ebe0" transform="rotate(10 25 18)"/>
          {/* Nariz */}
          <ellipse cx="8" cy="30" rx="6" ry="4" fill="#f5c5b0"/>
          <circle  cx="6.5" cy="30" r="1.4" fill="#8b5040"/>
          <circle  cx="9.5" cy="30" r="1.4" fill="#8b5040"/>
          {/* Ojo */}
          <circle cx="18" cy="25" r="2.5" fill="#1a0a00"/>
          <circle cx="18.6" cy="24.4" r="0.9" fill="#fff"/>
          {/* Cuernos */}
          <path d="M10 17 Q7 10 5 12"  fill="none" stroke="#c8b89a" strokeWidth="1.8" strokeLinecap="round"/>
          <path d="M24 17 Q26 10 28 12" fill="none" stroke="#c8b89a" strokeWidth="1.8" strokeLinecap="round"/>
          {/* Patas */}
          <rect x="30" y="52" width="5" height="8" rx="2" fill="#e0d5c4"/>
          <rect x="38" y="52" width="5" height="8" rx="2" fill="#e0d5c4"/>
          <rect x="52" y="52" width="5" height="8" rx="2" fill="#e0d5c4"/>
          <rect x="60" y="52" width="5" height="8" rx="2" fill="#e0d5c4"/>
          {/* Ubre */}
          <ellipse cx="38" cy="52" rx="8" ry="4" fill="#f9c5b0"/>
          {/* Cola */}
          <path d="M72 35 Q80 28 76 22" fill="none" stroke="#c8b89a" strokeWidth="2" strokeLinecap="round"
            style={{ transformOrigin:'72px 35px', animation:'agro-tail 2s ease-in-out infinite' }}/>
        </g>
      </svg>

      {/* GALLINA — borde inferior izquierda */}
      <svg data-agro style={{ position:'absolute', bottom:50, left:'18%', opacity:0.10 }}
           width="52" height="58" viewBox="0 0 52 58">
        <g style={{ animation:'agro-float 3s ease-in-out infinite 0.8s' }}>
          {/* Cuerpo */}
          <ellipse cx="26" cy="40" rx="18" ry="13" fill="#d48c20"/>
          {/* Ala */}
          <ellipse cx="20" cy="38" rx="12" ry="8" fill="#c07818" opacity="0.7" transform="rotate(-10 20 38)"/>
          {/* Cola */}
          <path d="M44 38 Q52 28 50 22 Q46 26 44 38Z" fill="#a06010"/>
          <path d="M44 38 Q54 32 54 24 Q49 29 44 38Z" fill="#c07818" opacity="0.8"/>
          {/* Cuello */}
          <rect x="20" y="26" width="10" height="12" rx="5" fill="#d4a030"/>
          {/* Cabeza — animada picoteando */}
          <g style={{ transformOrigin:'25px 24px', animation:'agro-peck 1.4s ease-in-out infinite' }}>
            <ellipse cx="25" cy="18" rx="10" ry="8" fill="#d4a030"/>
            {/* Cresta */}
            <path d="M20 10 Q21 5 23 8 Q24 3 26 7 Q27 4 29 8 Q31 5 32 10" fill="#f87171"/>
            {/* Pico */}
            <path d="M15 18 L10 20 L15 22" fill="#f59e0b"/>
            {/* Ojo */}
            <circle cx="28" cy="16" r="2.5" fill="#1a0a00"/>
            <circle cx="28.7" cy="15.3" r="0.9" fill="#fff"/>
            {/* Papada */}
            <ellipse cx="17" cy="22" rx="3" ry="4" fill="#f87171"/>
          </g>
          {/* Patas */}
          <line x1="20" y1="52" x2="17" y2="58" stroke="#f59e0b" strokeWidth="2.2" strokeLinecap="round"/>
          <line x1="30" y1="52" x2="33" y2="58" stroke="#f59e0b" strokeWidth="2.2" strokeLinecap="round"/>
          <path d="M17 58 L13 56 M17 58 L15 60 M17 58 L19 60" fill="none" stroke="#f59e0b" strokeWidth="1.4" strokeLinecap="round"/>
          <path d="M33 58 L29 56 M33 58 L31 60 M33 58 L35 60" fill="none" stroke="#f59e0b" strokeWidth="1.4" strokeLinecap="round"/>
        </g>
      </svg>

      {/* CERDO — borde inferior derecho */}
      <svg data-agro style={{ position:'absolute', bottom:45, right:'15%', opacity:0.10 }}
           width="72" height="54" viewBox="0 0 72 54">
        <g style={{ transformOrigin:'36px 36px', animation:'agro-breathe 2.6s ease-in-out infinite 0.4s' }}>
          {/* Cuerpo */}
          <ellipse cx="42" cy="36" rx="26" ry="16" fill="#f9b8cf"/>
          {/* Cabeza */}
          <ellipse cx="14" cy="30" rx="14" ry="12" fill="#f9b8cf"/>
          {/* Oreja izq */}
          <ellipse cx="7"  cy="18" rx="4.5" ry="6"  fill="#f9b8cf" transform="rotate(-20 7 18)"/>
          <ellipse cx="7"  cy="19" rx="2.5" ry="3.5" fill="#f4a0be" transform="rotate(-20 7 19)"/>
          {/* Oreja der */}
          <ellipse cx="21" cy="18" rx="4"   ry="5.5" fill="#f9b8cf" transform="rotate(15 21 18)"/>
          <ellipse cx="21" cy="19" rx="2.2" ry="3.2" fill="#f4a0be" transform="rotate(15 21 19)"/>
          {/* Hocico */}
          <ellipse cx="5" cy="32" rx="7" ry="5.5" fill="#f4a0be"/>
          <circle cx="3"  cy="32" r="1.6" fill="#c06080"/>
          <circle cx="7"  cy="32" r="1.6" fill="#c06080"/>
          {/* Ojo */}
          <circle cx="16" cy="26" r="2.8" fill="#1a0a00"/>
          <circle cx="16.8" cy="25.2" r="1" fill="#fff"/>
          {/* Patas */}
          <rect x="24" y="50" width="7" height="4" rx="2" fill="#f4a0be"/>
          <rect x="34" y="50" width="7" height="4" rx="2" fill="#f4a0be"/>
          <rect x="50" y="50" width="7" height="4" rx="2" fill="#f4a0be"/>
          <rect x="60" y="50" width="7" height="4" rx="2" fill="#f4a0be"/>
          {/* Rabo */}
          <path d="M68 32 Q76 26 74 20 Q70 25 68 32" fill="none" stroke="#f9b8cf" strokeWidth="2" strokeLinecap="round"
            style={{ transformOrigin:'68px 32px', animation:'agro-tail 1.8s ease-in-out infinite 0.3s' }}/>
        </g>
      </svg>

      {/* ABEJA — esquina superior izquierda */}
      <svg data-agro style={{ position:'absolute', top:75, left:185, opacity:0.11 }}
           width="42" height="34" viewBox="0 0 42 34">
        <g style={{ animation:'agro-drift 6s ease-in-out infinite' }}>
          {/* Cuerpo */}
          <ellipse cx="21" cy="20" rx="10" ry="7" fill="#fbbf24"/>
          <line x1="15" y1="18" x2="27" y2="18" stroke="#1a0a00" strokeWidth="2.2"/>
          <line x1="14" y1="22" x2="28" y2="22" stroke="#1a0a00" strokeWidth="2.2"/>
          {/* Alas */}
          <ellipse cx="14" cy="11" rx="10" ry="5.5" fill="#e2ffe9" opacity="0.6"
            style={{ transformOrigin:'14px 11px', animation:'agro-flutter 0.28s ease-in-out infinite' }}/>
          <ellipse cx="28" cy="11" rx="10" ry="5.5" fill="#e2ffe9" opacity="0.6"
            style={{ transformOrigin:'28px 11px', animation:'agro-flutter 0.28s ease-in-out infinite 0.14s' }}/>
          {/* Cabeza */}
          <circle cx="31" cy="20" r="5.5" fill="#fbbf24"/>
          <circle cx="33" cy="18" r="1.3" fill="#1a0a00"/>
          {/* Aguijón */}
          <path d="M11 20 L5 20" stroke="#f59e0b" strokeWidth="1.6" strokeLinecap="round"/>
        </g>
      </svg>

      {/* GIRASOL — derecha centro */}
      <svg data-agro style={{ position:'absolute', top:'28%', right:'8%', opacity:0.09 }}
           width="70" height="200" viewBox="0 0 70 200">
        {/* Tallo */}
        <path d="M35 200 Q30 160 35 120 Q40 80 35 40" stroke="#4ade80" strokeWidth="4" fill="none" strokeLinecap="round"/>
        {/* Hoja izquierda */}
        <ellipse cx="20" cy="140" rx="18" ry="9" fill="#22d3ee" opacity="0.9"
          style={{ transformOrigin:'20px 140px', animation:'agro-sway 4s ease-in-out infinite' }}
          transform="rotate(-35)"/>
        {/* Hoja derecha */}
        <ellipse cx="50" cy="110" rx="18" ry="9" fill="#4ade80" opacity="0.9"
          style={{ transformOrigin:'50px 110px', animation:'agro-sway 3.8s ease-in-out infinite 0.6s' }}
          transform="rotate(35)"/>
        {/* Pétalos */}
        {[0,40,80,120,160,200,240,280,320].map(a => (
          <ellipse key={a} cx="35" cy="22" rx="5" ry="12" fill="#fbbf24"
            transform={`rotate(${a} 35 40)`}
            style={{ transformOrigin:'35px 40px', animation:`agro-sway 3.5s ease-in-out infinite ${a*0.01}s` }}/>
        ))}
        {/* Centro */}
        <circle cx="35" cy="40" r="12" fill="#92400e"/>
        <circle cx="35" cy="40" r="8"  fill="#78350f"/>
        {/* Puntitos centro */}
        {[0,45,90,135,180,225,270,315].map(a => (
          <circle key={a} cx={35 + 5*Math.cos(a*Math.PI/180)} cy={40 + 5*Math.sin(a*Math.PI/180)} r="1.2" fill="#fbbf24" opacity="0.6"/>
        ))}
      </svg>

    </div>
  )
}
