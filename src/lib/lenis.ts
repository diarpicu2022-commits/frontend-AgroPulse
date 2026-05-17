import Lenis from 'lenis'
import gsap from 'gsap'

let _instance: Lenis | null = null

export function initLenis(): Lenis {
  if (_instance) return _instance

  _instance = new Lenis({
    duration:    1.2,
    easing:      (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smoothWheel: true,
  })

  gsap.ticker.add((time: number) => {
    _instance!.raf(time * 1000)
  })
  gsap.ticker.lagSmoothing(0)

  return _instance
}

export function destroyLenis(): void {
  if (!_instance) return
  _instance.destroy()
  _instance = null
}
