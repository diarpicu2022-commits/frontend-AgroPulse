/// <reference types="vite/client" />

declare module 'animejs' {
  interface AnimeParams {
    targets?: string | Element | Element[] | NodeList | null
    opacity?: number | number[] | [number, number]
    translateY?: number | number[] | [number, number]
    translateX?: number | number[] | [number, number]
    scaleY?: number | number[] | [number, number]
    scale?: number | number[] | [number, number]
    delay?: number | AnimeStagger
    duration?: number
    easing?: string
    [key: string]: unknown
  }

  interface AnimeInstance {
    play(): void
    pause(): void
    restart(): void
    seek(time: number): void
  }

  interface AnimeStagger {
    (index: number): number
  }

  interface AnimeStatic {
    (params: AnimeParams): AnimeInstance
    stagger(value: number, options?: { start?: number; from?: number | string; direction?: string; easing?: string }): AnimeStagger
    timeline(params?: AnimeParams): AnimeInstance
    setDashoffset(el: Element): number
    easings: Record<string, (t: number) => number>
    running: AnimeInstance[]
    remove(targets: unknown): void
  }

  const anime: AnimeStatic
  export default anime
}
