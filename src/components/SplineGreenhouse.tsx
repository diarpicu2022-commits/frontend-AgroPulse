import { Suspense, lazy, useState, useEffect, useRef } from 'react'
import gsap from 'gsap'

const SplineLazy = lazy(() => import('@splinetool/react-spline'))

const SPLINE_URL = (import.meta.env.VITE_SPLINE_GREENHOUSE_URL as string) || ''

function GlowOrb() {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!ref.current) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    gsap.to(ref.current, {
      scale:    1.08,
      opacity:  0.8,
      duration: 2.5,
      yoyo:     true,
      repeat:   -1,
      ease:     'sine.inOut',
    })
    return () => gsap.killTweensOf(ref.current)
  }, [])

  return (
    <div
      ref={ref}
      style={{
        width:        180,
        height:       180,
        borderRadius: '50%',
        background:   'radial-gradient(circle at 40% 35%, #4ade8033 0%, #16a34a11 50%, transparent 70%)',
        border:       '1px solid #4ade8022',
        opacity:      0.5,
      }}
    />
  )
}

export default function SplineGreenhouse() {
  const [hasWebGL,  setHasWebGL]  = useState(true)
  const [timedOut,  setTimedOut]  = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    try {
      const c  = document.createElement('canvas')
      const gl = c.getContext('webgl') || c.getContext('experimental-webgl')
      if (!gl) setHasWebGL(false)
    } catch {
      setHasWebGL(false)
    }

    const timer = setTimeout(() => setTimedOut(true), 5000)
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    if (!containerRef.current) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    gsap.from(containerRef.current, { scale: 0.82, opacity: 0, duration: 0.9, ease: 'power3.out' })
    return () => gsap.killTweensOf(containerRef.current)
  }, [])

  const showFallback = !hasWebGL || timedOut || !SPLINE_URL

  return (
    <div
      ref={containerRef}
      style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
    >
      {showFallback ? (
        <GlowOrb />
      ) : (
        <Suspense fallback={<GlowOrb />}>
          <SplineLazy scene={SPLINE_URL} style={{ width: '100%', height: '100%' }} />
        </Suspense>
      )}
    </div>
  )
}
