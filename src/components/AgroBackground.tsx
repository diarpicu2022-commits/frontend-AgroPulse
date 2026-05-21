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
        opacity: 0, transition: 'opacity 1.2s ease',
      }}
    >
      <style>{`
        @keyframes agro-sway {
          0%,100% { transform: rotate(-4deg) scale(1); }
          50%      { transform: rotate(4deg)  scale(1.04); }
        }
        @keyframes agro-float {
          0%,100% { transform: translateY(0px); }
          50%      { transform: translateY(-8px); }
        }
        @keyframes agro-peck {
          0%,100% { transform: rotate(0deg); }
          50%      { transform: rotate(18deg); }
        }
        @keyframes agro-breathe {
          0%,100% { transform: scaleX(1); }
          50%      { transform: scaleX(1.06); }
        }
        @keyframes agro-flutter {
          0%,100% { transform: scaleX(1)  rotate(-5deg); }
          50%      { transform: scaleX(0.7) rotate(5deg); }
        }
        @keyframes agro-drift {
          0%   { transform: translate(0,0) rotate(0deg); }
          25%  { transform: translate(6px,-4px) rotate(8deg); }
          50%  { transform: translate(0,-8px) rotate(0deg); }
          75%  { transform: translate(-6px,-4px) rotate(-8deg); }
          100% { transform: translate(0,0) rotate(0deg); }
        }
        @media (prefers-reduced-motion: reduce) {
          [data-agro] * { animation: none !important; }
        }
      `}</style>

      {/* ── PLANTAS — esquinas y bordes ─────────────────── */}

      {/* Esquina inferior izquierda — arbusto grande */}
      <svg data-agro style={{ position:'absolute', bottom:-20, left:-10, opacity:0.09 }}
           width="220" height="260" viewBox="0 0 220 260">
        <line x1="110" y1="260" x2="110" y2="80" stroke="#4ade80" strokeWidth="4" strokeLinecap="round"/>
        <line x1="110" y1="180" x2="50" y2="120" stroke="#4ade80" strokeWidth="2.5" strokeLinecap="round"/>
        <line x1="110" y1="140" x2="40" y2="90" stroke="#22d3ee" strokeWidth="2" strokeLinecap="round"/>
        <line x1="110" y1="180" x2="170" y2="120" stroke="#4ade80" strokeWidth="2.5" strokeLinecap="round"/>
        <line x1="110" y1="150" x2="175" y2="100" stroke="#22d3ee" strokeWidth="2" strokeLinecap="round"/>
        <ellipse cx="45" cy="108" rx="22" ry="12" fill="#4ade80" style={{ transformOrigin:'45px 108px', animation:'agro-sway 3.8s ease-in-out infinite' }} transform="rotate(-30)"/>
        <ellipse cx="35" cy="82" rx="18" ry="10" fill="#22d3ee" style={{ transformOrigin:'35px 82px', animation:'agro-sway 4.2s ease-in-out infinite 0.5s' }} transform="rotate(-50)"/>
        <ellipse cx="175" cy="108" rx="22" ry="12" fill="#4ade80" style={{ transformOrigin:'175px 108px', animation:'agro-sway 3.5s ease-in-out infinite 0.8s' }} transform="rotate(30)"/>
        <ellipse cx="180" cy="88" rx="18" ry="10" fill="#fb923c" opacity="0.7" style={{ transformOrigin:'180px 88px', animation:'agro-sway 4s ease-in-out infinite 1.2s' }} transform="rotate(50)"/>
        <ellipse cx="110" cy="72" rx="20" ry="28" fill="#4ade80" style={{ transformOrigin:'110px 72px', animation:'agro-sway 3.2s ease-in-out infinite 0.3s' }}/>
        <circle cx="110" cy="60" r="8" fill="#fbbf24" opacity="0.8"/>
        <circle cx="110" cy="60" r="4" fill="#fb923c"/>
      </svg>

      {/* Esquina superior derecha — planta trepadora */}
      <svg data-agro style={{ position:'absolute', top:-10, right:-10, opacity:0.08 }}
           width="200" height="200" viewBox="0 0 200 200">
        <line x1="200" y1="0" x2="100" y2="120" stroke="#22d3ee" strokeWidth="3" strokeLinecap="round"/>
        <line x1="180" y1="0" x2="80" y2="140" stroke="#4ade80" strokeWidth="2" strokeLinecap="round"/>
        <ellipse cx="85" cy="100" rx="20" ry="11" fill="#22d3ee" style={{ transformOrigin:'85px 100px', animation:'agro-sway 4s ease-in-out infinite' }} transform="rotate(-40)"/>
        <ellipse cx="105" cy="80" rx="18" ry="10" fill="#4ade80" style={{ transformOrigin:'105px 80px', animation:'agro-sway 3.5s ease-in-out infinite 0.7s' }} transform="rotate(-20)"/>
        <ellipse cx="70" cy="130" rx="16" ry="9" fill="#fbbf24" opacity="0.6" style={{ transformOrigin:'70px 130px', animation:'agro-sway 4.5s ease-in-out infinite 1s' }} transform="rotate(-55)"/>
        <circle cx="95" cy="68" r="6" fill="#fb923c" opacity="0.7"/>
        <circle cx="95" cy="68" r="3" fill="#fbbf24"/>
      </svg>

      {/* Borde derecho — caña de bambú */}
      <svg data-agro style={{ position:'absolute', right:20, top:'30%', opacity:0.07 }}
           width="60" height="300" viewBox="0 0 60 300">
        <line x1="30" y1="0" x2="30" y2="300" stroke="#4ade80" strokeWidth="5" strokeLinecap="round"/>
        {[60,120,180,240].map(y => (
          <g key={y}>
            <line x1="30" y1={y} x2="30" y2={y+8} stroke="#22d3ee" strokeWidth="7" strokeLinecap="round"/>
            <line x1="30" y1={y+4} x2="55" y2={y-15} stroke="#4ade80" strokeWidth="2" strokeLinecap="round"/>
            <ellipse cx="52" cy={y-20} rx="14" ry="7" fill="#4ade80"
              style={{ transformOrigin:`52px ${y-20}px`, animation:`agro-sway 3.5s ease-in-out infinite ${y*0.01}s` }}
              transform="rotate(-20)"/>
          </g>
        ))}
      </svg>

      {/* Borde izquierdo centro — helecho */}
      <svg data-agro style={{ position:'absolute', left:-5, top:'40%', opacity:0.08 }}
           width="120" height="200" viewBox="0 0 120 200">
        <line x1="20" y1="200" x2="80" y2="60" stroke="#4ade80" strokeWidth="3" strokeLinecap="round"/>
        {[0,1,2,3,4,5].map(i => {
          const y  = 180 - i * 24
          const xl = 80 - i * 10
          const xr = 80 - i * 10
          return (
            <g key={i}>
              <ellipse cx={xl - 25} cy={y - 10} rx="20" ry="8" fill="#22d3ee"
                style={{ transformOrigin:`${xl-25}px ${y-10}px`, animation:`agro-sway ${3.5+i*0.3}s ease-in-out infinite ${i*0.2}s` }}
                transform="rotate(-30)" opacity="0.9"/>
              <ellipse cx={xr + 15} cy={y - 10} rx="18" ry="7" fill="#4ade80"
                style={{ transformOrigin:`${xr+15}px ${y-10}px`, animation:`agro-sway ${3.8+i*0.2}s ease-in-out infinite ${i*0.3}s` }}
                transform="rotate(30)" opacity="0.9"/>
            </g>
          )
        })}
      </svg>

      {/* Centro fondo — flores silvestres dispersas */}
      {[
        { x:300, y:120, c:'#fbbf24', r:6 },
        { x:600, y:80,  c:'#fb923c', r:5 },
        { x:900, y:150, c:'#a78bfa', r:7 },
        { x:450, y:400, c:'#22d3ee', r:5 },
        { x:750, y:350, c:'#4ade80', r:6 },
        { x:200, y:500, c:'#fbbf24', r:4 },
        { x:1100,y:200, c:'#fb923c', r:5 },
      ].map(({ x, y, c, r }, i) => (
        <svg key={i} style={{ position:'absolute', left:x, top:y, opacity:0.07 }}
             width={r*8} height={r*8} viewBox={`0 0 ${r*8} ${r*8}`}>
          {[0,60,120,180,240,300].map(a => (
            <ellipse key={a} cx={r*4} cy={r*4-r*2} rx={r*0.9} ry={r*1.4}
              fill={c} transform={`rotate(${a} ${r*4} ${r*4})`}
              style={{ animation:`agro-float ${3+i*0.4}s ease-in-out infinite ${i*0.3}s` }}/>
          ))}
          <circle cx={r*4} cy={r*4} r={r*0.7} fill="#fbbf24"/>
        </svg>
      ))}

      {/* Esquina inferior derecha — árbol pequeño */}
      <svg data-agro style={{ position:'absolute', bottom:-30, right:-20, opacity:0.08 }}
           width="180" height="240" viewBox="0 0 180 240">
        <line x1="90" y1="240" x2="90" y2="100" stroke="#fb923c" strokeWidth="6" strokeLinecap="round" opacity="0.6"/>
        <ellipse cx="90" cy="80" rx="55" ry="45" fill="#14532d"/>
        <ellipse cx="65" cy="65" rx="38" ry="32" fill="#166534"/>
        <ellipse cx="115" cy="70" rx="35" ry="30" fill="#15803d"/>
        <ellipse cx="90" cy="50" rx="32" ry="28" fill="#22c55e"
          style={{ animation:'agro-sway 4s ease-in-out infinite' }}/>
        <circle cx="70" cy="72" r="6" fill="#f87171" opacity="0.9"/>
        <circle cx="105" cy="68" r="5" fill="#fb923c" opacity="0.9"/>
        <circle cx="88" cy="55" r="5" fill="#fbbf24" opacity="0.9"/>
      </svg>

      {/* ── ANIMALES — dispersos por la página ─────────────── */}

      {/* Abeja — esquina superior izquierda */}
      <svg data-agro style={{ position:'absolute', top:80, left:180, opacity:0.10 }}
           width="40" height="32" viewBox="0 0 40 32">
        <g style={{ animation:'agro-drift 6s ease-in-out infinite' }}>
          <ellipse cx="20" cy="18" rx="10" ry="7" fill="#fbbf24"/>
          <line x1="14" y1="16" x2="26" y2="16" stroke="#1a0a00" strokeWidth="2"/>
          <line x1="13" y1="20" x2="27" y2="20" stroke="#1a0a00" strokeWidth="2"/>
          <ellipse cx="14" cy="10" rx="9" ry="5" fill="#e2ffe9" opacity="0.6"
            style={{ transformOrigin:'14px 10px', animation:'agro-flutter 0.3s ease-in-out infinite' }}/>
          <ellipse cx="26" cy="10" rx="9" ry="5" fill="#e2ffe9" opacity="0.6"
            style={{ transformOrigin:'26px 10px', animation:'agro-flutter 0.3s ease-in-out infinite 0.15s' }}/>
          <circle cx="30" cy="18" r="5" fill="#fbbf24"/>
          <circle cx="32" cy="16" r="1.2" fill="#1a0a00"/>
          <path d="M10 18 L5 18" stroke="#f59e0b" strokeWidth="1.5" strokeLinecap="round"/>
        </g>
      </svg>

      {/* Mariposa — centro izquierda */}
      <svg data-agro style={{ position:'absolute', top:'25%', left:'12%', opacity:0.09 }}
           width="50" height="44" viewBox="0 0 50 44">
        <g style={{ animation:'agro-drift 8s ease-in-out infinite 1s' }}>
          <ellipse cx="18" cy="18" rx="14" ry="12" fill="#a78bfa"
            style={{ transformOrigin:'18px 22px', animation:'agro-flutter 0.8s ease-in-out infinite' }}/>
          <ellipse cx="32" cy="18" rx="14" ry="12" fill="#fb923c"
            style={{ transformOrigin:'32px 22px', animation:'agro-flutter 0.8s ease-in-out infinite 0.4s' }}/>
          <ellipse cx="16" cy="28" rx="10" ry="8" fill="#fbbf24"
            style={{ transformOrigin:'16px 24px', animation:'agro-flutter 0.8s ease-in-out infinite 0.2s' }}/>
          <ellipse cx="34" cy="28" rx="10" ry="8" fill="#22d3ee"
            style={{ transformOrigin:'34px 24px', animation:'agro-flutter 0.8s ease-in-out infinite 0.6s' }}/>
          <ellipse cx="25" cy="22" rx="2.5" ry="10" fill="#1a0a00"/>
          <line x1="25" y1="13" x2="18" y2="4" stroke="#1a0a00" strokeWidth="1"/>
          <circle cx="18" cy="3" r="1.5" fill="#fb923c"/>
          <line x1="25" y1="13" x2="32" y2="4" stroke="#1a0a00" strokeWidth="1"/>
          <circle cx="32" cy="3" r="1.5" fill="#a78bfa"/>
        </g>
      </svg>

      {/* Rana — borde inferior centro-izquierda */}
      <svg data-agro style={{ position:'absolute', bottom:40, left:'25%', opacity:0.10 }}
           width="44" height="36" viewBox="0 0 44 36">
        <g style={{ animation:'agro-float 2.5s ease-in-out infinite' }}>
          <ellipse cx="22" cy="24" rx="14" ry="10" fill="#22c55e"/>
          <ellipse cx="22" cy="14" rx="12" ry="9" fill="#22c55e"/>
          <circle cx="14" cy="8" r="5" fill="#4ade80"/>
          <circle cx="30" cy="8" r="5" fill="#4ade80"/>
          <circle cx="14" cy="8" r="2.5" fill="#1a0a00"/>
          <circle cx="30" cy="8" r="2.5" fill="#1a0a00"/>
          <circle cx="15" cy="7" r="1" fill="#fff"/>
          <circle cx="31" cy="7" r="1" fill="#fff"/>
          <path d="M15 18 Q22 22 29 18" fill="none" stroke="#166534" strokeWidth="1.5" strokeLinecap="round"/>
          <path d="M8 28 Q2 32 4 36" fill="none" stroke="#22c55e" strokeWidth="3" strokeLinecap="round"/>
          <path d="M36 28 Q42 32 40 36" fill="none" stroke="#22c55e" strokeWidth="3" strokeLinecap="round"/>
          <path d="M4 36 L0 34 M4 36 L2 38" fill="none" stroke="#22c55e" strokeWidth="2" strokeLinecap="round"/>
          <path d="M40 36 L44 34 M40 36 L42 38" fill="none" stroke="#22c55e" strokeWidth="2" strokeLinecap="round"/>
        </g>
      </svg>

      {/* Gusano/oruga — borde inferior derecha */}
      <svg data-agro style={{ position:'absolute', bottom:60, right:'20%', opacity:0.09 }}
           width="80" height="30" viewBox="0 0 80 30">
        <g style={{ animation:'agro-float 3s ease-in-out infinite 0.5s' }}>
          {[0,1,2,3].map(i => (
            <circle key={i} cx={12 + i*16} cy="18" r="10"
              fill={(['#4ade80','#22d3ee','#4ade80','#a78bfa'] as const)[i]}/>
          ))}
          <circle cx="74" cy="16" r="11" fill="#fb923c"/>
          <circle cx="70" cy="12" r="2.5" fill="#1a0a00"/>
          <circle cx="78" cy="12" r="2.5" fill="#1a0a00"/>
          <circle cx="70.8" cy="11.2" r="1" fill="#fff"/>
          <circle cx="78.8" cy="11.2" r="1" fill="#fff"/>
          <line x1="70" y1="6" x2="66" y2="0" stroke="#1a0a00" strokeWidth="1"/>
          <circle cx="66" cy="0" r="1.5" fill="#fbbf24"/>
          <line x1="78" y1="6" x2="82" y2="0" stroke="#1a0a00" strokeWidth="1"/>
          <circle cx="82" cy="0" r="1.5" fill="#fbbf24"/>
        </g>
      </svg>

      {/* Pajarito volando — parte superior centro */}
      <svg data-agro style={{ position:'absolute', top:60, left:'45%', opacity:0.09 }}
           width="48" height="28" viewBox="0 0 48 28">
        <g style={{ animation:'agro-drift 10s ease-in-out infinite 2s' }}>
          <ellipse cx="24" cy="18" rx="10" ry="6" fill="#fbbf24"/>
          <path d="M24 16 Q10 6 4 10" fill="none" stroke="#f59e0b" strokeWidth="3" strokeLinecap="round"
            style={{ transformOrigin:'24px 16px', animation:'agro-flutter 0.5s ease-in-out infinite' }}/>
          <path d="M24 16 Q38 6 44 10" fill="none" stroke="#f59e0b" strokeWidth="3" strokeLinecap="round"
            style={{ transformOrigin:'24px 16px', animation:'agro-flutter 0.5s ease-in-out infinite 0.25s' }}/>
          <circle cx="33" cy="16" r="6" fill="#fbbf24"/>
          <path d="M38 16 L44 15 L38 17" fill="#fb923c"/>
          <circle cx="35" cy="14" r="1.8" fill="#1a0a00"/>
          <circle cx="35.5" cy="13.5" r="0.7" fill="#fff"/>
          <path d="M14 18 L6 14 M14 18 L5 18 M14 18 L6 22" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round"/>
        </g>
      </svg>

      {/* Caracol — esquina inferior izquierda alta */}
      <svg data-agro style={{ position:'absolute', bottom:120, left:60, opacity:0.09 }}
           width="50" height="36" viewBox="0 0 50 36">
        <g style={{ animation:'agro-float 4s ease-in-out infinite 1s' }}>
          <circle cx="32" cy="18" r="14" fill="none" stroke="#fb923c" strokeWidth="3"/>
          <circle cx="32" cy="18" r="9"  fill="none" stroke="#fbbf24" strokeWidth="2"/>
          <circle cx="32" cy="18" r="5"  fill="#fb923c" opacity="0.6"/>
          <circle cx="32" cy="18" r="2"  fill="#fbbf24"/>
          <ellipse cx="18" cy="26" rx="16" ry="7" fill="#4ade80"/>
          <ellipse cx="6" cy="22" rx="7" ry="6" fill="#4ade80"/>
          <line x1="4" y1="17" x2="1" y2="10" stroke="#22d3ee" strokeWidth="1.5"/>
          <circle cx="1" cy="9" r="2" fill="#22d3ee"/>
          <line x1="8" y1="16" x2="10" y2="9" stroke="#22d3ee" strokeWidth="1.5"/>
          <circle cx="10" cy="8" r="2" fill="#22d3ee"/>
        </g>
      </svg>

    </div>
  )
}
