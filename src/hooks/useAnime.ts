import { useEffect, useRef, type RefObject } from 'react'
import anime from 'animejs'

interface EntranceOptions {
  /** ms delay before starting (default 0) */
  delay?: number
  /** stagger between children in ms (default 60) */
  stagger?: number
  /** duration in ms (default 420) */
  duration?: number
  /** target children elements instead of container itself */
  children?: boolean
  /** easing (default easeOutCubic) */
  easing?: string
  /** initial translateY offset (default 18) */
  translateY?: number
}

/**
 * Animates entrance of a container or its children using anime.js.
 * Respects prefers-reduced-motion automatically.
 */
export function useAnimeEntrance<T extends HTMLElement = HTMLDivElement>(
  options: EntranceOptions = {}
): RefObject<T> {
  const ref = useRef<T>(null)
  const {
    delay      = 0,
    stagger    = 60,
    duration   = 420,
    children   = false,
    easing     = 'easeOutCubic',
    translateY = 18,
  } = options

  useEffect(() => {
    if (!ref.current) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced) return

    const targets = children
      ? Array.from(ref.current.children) as Element[]
      : ref.current

    anime({
      targets,
      opacity:    [0, 1],
      translateY: [translateY, 0],
      delay:      children ? anime.stagger(stagger, { start: delay }) : delay,
      duration,
      easing,
    })
  }, [])

  return ref
}

/**
 * Animate a counter from 0 to `value` when the element enters view.
 */
export function useAnimeCounter(
  value: number,
  options: { duration?: number; decimals?: number } = {}
): RefObject<HTMLSpanElement> {
  const ref  = useRef<HTMLSpanElement>(null)
  const { duration = 900, decimals = 1 } = options

  useEffect(() => {
    if (!ref.current) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced) { if (ref.current) ref.current.textContent = value.toFixed(decimals); return }

    const obj = { val: 0 }
    anime({
      targets: obj,
      val:     [0, value],
      duration,
      easing:  'easeOutCubic',
      update:  () => { if (ref.current) ref.current.textContent = obj.val.toFixed(decimals) },
    })
  }, [value])

  return ref
}

/**
 * Run an anime timeline when the component mounts.
 */
export function useAnimeMountEffect(
  fn: (a: typeof anime) => void,
  deps: unknown[] = []
): void {
  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced) return
    fn(anime)
  }, deps)
}
