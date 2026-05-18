import { useEffect, useRef } from 'react'
import * as THREE from 'three'

export default function ThreeBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const canvas = canvasRef.current
    if (!canvas) return

    const W = window.innerWidth
    const H = window.innerHeight
    const isMobile = W < 768
    if (isMobile) return  // skip WebGL on mobile — causes visual artifacts

    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5))
    renderer.setSize(W, H)

    const scene  = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(60, W / H, 0.1, 100)
    camera.position.z = 6

    const C_BRIGHT = new THREE.Color('#4ade80')
    const C_MID    = new THREE.Color('#16a34a')

    // ── Spores (floating points) ──────────────────────────────────────
    const SPORE_COUNT = isMobile ? 40 : 100
    const sporePos    = new Float32Array(SPORE_COUNT * 3)
    const sporeSpeeds = new Float32Array(SPORE_COUNT)
    const sporePhases = new Float32Array(SPORE_COUNT)

    for (let i = 0; i < SPORE_COUNT; i++) {
      sporePos[i * 3]     = (Math.random() - 0.5) * 12
      sporePos[i * 3 + 1] = (Math.random() - 0.5) * 9
      sporePos[i * 3 + 2] = (Math.random() - 0.5) * 4
      sporeSpeeds[i] = 0.2 + Math.random() * 0.6
      sporePhases[i] = Math.random() * Math.PI * 2
    }

    const sporeGeo = new THREE.BufferGeometry()
    sporeGeo.setAttribute('position', new THREE.BufferAttribute(sporePos, 3))
    const sporeMat = new THREE.PointsMaterial({
      color:          C_BRIGHT,
      size:           isMobile ? 0.03 : 0.05,
      transparent:    true,
      opacity:        0.5,
      sizeAttenuation: true,
    })
    scene.add(new THREE.Points(sporeGeo, sporeMat))

    // ── Leaves (planes) ───────────────────────────────────────────────
    const LEAF_COUNT = isMobile ? 25 : 70
    const leafGeo    = new THREE.PlaneGeometry(0.18, 0.25)
    const leafMats   = [
      new THREE.MeshBasicMaterial({ color: C_BRIGHT, transparent: true, opacity: 0.22, side: THREE.DoubleSide }),
      new THREE.MeshBasicMaterial({ color: C_MID,    transparent: true, opacity: 0.18, side: THREE.DoubleSide }),
    ]

    type LeafData = { mesh: THREE.Mesh; speed: number; phase: number; rotSpeed: number }
    const leaves: LeafData[] = []

    for (let i = 0; i < LEAF_COUNT; i++) {
      const mesh = new THREE.Mesh(leafGeo, leafMats[i % 2])
      mesh.position.set(
        (Math.random() - 0.5) * 12,
        (Math.random() - 0.5) * 9,
        (Math.random() - 0.5) * 3,
      )
      mesh.rotation.set(
        Math.random() * Math.PI,
        Math.random() * Math.PI,
        Math.random() * Math.PI,
      )
      scene.add(mesh)
      leaves.push({
        mesh,
        speed:    0.2 + Math.random() * 0.5,
        phase:    Math.random() * Math.PI * 2,
        rotSpeed: (Math.random() - 0.5) * 0.008,
      })
    }

    // ── Stems (line segments) ─────────────────────────────────────────
    const STEM_COUNT = isMobile ? 8 : 18
    type StemData = { line: THREE.Line; phase: number; speed: number }
    const stems:   StemData[] = []
    const stemMat  = new THREE.LineBasicMaterial({ color: C_MID, transparent: true, opacity: 0.12 })

    for (let i = 0; i < STEM_COUNT; i++) {
      const h   = 0.8 + Math.random() * 1.2
      const x   = (Math.random() - 0.5) * 12
      const geo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(x, -5, 0),
        new THREE.Vector3(x + (Math.random() - 0.5) * 0.3, -5 + h, 0),
      ])
      const line = new THREE.Line(geo, stemMat)
      scene.add(line)
      stems.push({ line, phase: Math.random() * Math.PI * 2, speed: 0.4 + Math.random() * 0.4 })
    }

    // ── Render loop ───────────────────────────────────────────────────
    let rafId:  number
    let hidden = false

    const onVisibility = () => { hidden = document.hidden }
    document.addEventListener('visibilitychange', onVisibility)

    const animate = (t: number) => {
      rafId = requestAnimationFrame(animate)
      if (hidden) return

      const time = t * 0.001

      const posAttr = sporeGeo.attributes.position as THREE.BufferAttribute
      for (let i = 0; i < SPORE_COUNT; i++) {
        let ny = posAttr.getY(i) + 0.0008 * sporeSpeeds[i]
        if (ny > 5) ny = -5
        posAttr.setY(i, ny)
        posAttr.setX(i, posAttr.getX(i) + Math.sin(time * sporeSpeeds[i] + sporePhases[i]) * 0.0008)
      }
      posAttr.needsUpdate = true

      for (const { mesh, speed, phase, rotSpeed } of leaves) {
        mesh.position.y += Math.sin(time * speed + phase) * 0.0008
        mesh.rotation.z += rotSpeed
      }

      for (const { line, phase, speed } of stems) {
        line.rotation.z = Math.sin(time * speed + phase) * 0.04
      }

      renderer.render(scene, camera)
    }
    rafId = requestAnimationFrame(animate)

    const onResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight
      camera.updateProjectionMatrix()
      renderer.setSize(window.innerWidth, window.innerHeight)
    }
    window.addEventListener('resize', onResize)

    return () => {
      cancelAnimationFrame(rafId)
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('resize', onResize)
      sporeGeo.dispose()
      leafGeo.dispose()
      leafMats.forEach(m => m.dispose())
      sporeMat.dispose()
      stemMat.dispose()
      stems.forEach(({ line }) => line.geometry.dispose())
      renderer.dispose()
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      style={{
        position:      'fixed',
        top:           0,
        left:          0,
        width:         '100%',
        height:        '100%',
        zIndex:        0,
        pointerEvents: 'none',
      }}
    />
  )
}
