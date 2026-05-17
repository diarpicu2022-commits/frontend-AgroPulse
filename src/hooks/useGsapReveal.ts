import { useEffect, useRef, type RefObject } from 'react'
import gsap from 'gsap'

interface RevealOptions {
  stagger?:  number
  delay?:    number
  duration?: number
  y?:        number
}

export function useGsapReveal<T extends HTMLElement = HTMLDivElement>(
  options: RevealOptions = {},
): RefObject<T> {
  const ref = useRef<T>(null)
  const { stagger = 0.08, delay = 0, duration = 0.5, y = 20 } = options

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const children = Array.from(el.children) as HTMLElement[]
    const targets  = children.length > 0 ? children : [el]

    gsap.set(targets, { opacity: 0, y })

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue
          gsap.to(targets, {
            opacity: 1,
            y:       0,
            duration,
            delay,
            stagger,
            ease:       'power2.out',
            clearProps: 'opacity,transform',
          })
          observer.disconnect()
        }
      },
      { threshold: 0.1 },
    )

    observer.observe(el)

    return () => {
      observer.disconnect()
      gsap.set(targets, { clearProps: 'all' })
    }
  }, [])

  return ref as RefObject<T>
}
