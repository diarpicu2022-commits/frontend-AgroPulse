import { useEffect, useState, useRef } from 'react'
import { MapPin, Activity } from 'lucide-react'
import anime from 'animejs'
import { Map, MapMarker, MarkerContent, MarkerPopup, MarkerTooltip, MapControls } from '@/components/ui/map'
import { greenhouseRepository, readingRepository } from '../repositories'
import type { GreenhouseDto, SensorReadingDto } from '../types'
import PageHeader from '../components/ui/PageHeader'

interface MapPageProps {
  onNavigate: (page: 'dashboard') => void
}

export default function MapPage({ onNavigate }: MapPageProps) {
  const [greenhouses, setGreenhouses] = useState<GreenhouseDto[]>([])
  const [readings, setReadings] = useState<Record<number, SensorReadingDto[]>>({})
  const [loading, setLoading] = useState(true)
  const wrapperRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let alive = true
    greenhouseRepository.list().then(data => {
      if (alive) { setGreenhouses(data.greenhouses ?? []); setLoading(false) }
    }).catch(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [])

  const handleMarkerClick = (ghId: number) => {
    if (readings[ghId]) return
    readingRepository.list(null, 10, ghId).then(data => {
      setReadings(prev => ({ ...prev, [ghId]: data.readings ?? [] }))
    }).catch(() => {})
  }

  useEffect(() => {
    if (loading || !wrapperRef.current) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced) return
    anime({ targets: wrapperRef.current, opacity: [0, 1], translateY: [16, 0], duration: 420, easing: 'easeOutCubic' })
  }, [loading])

  useEffect(() => {
    if (loading || greenhouses.length === 0) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced) return
    // Scope selector to this component's wrapper to avoid matching foreign DOM nodes
    const targets = wrapperRef.current?.querySelectorAll('.map-marker-pin')
    if (targets && targets.length > 0) {
      anime({
        targets: Array.from(targets),
        opacity: [0, 1],
        scale: [0.5, 1],
        delay: anime.stagger(80),
        duration: 400,
        easing: 'easeOutBack',
      })
    }
  }, [loading, greenhouses.length])

  const mapped = greenhouses.filter(gh => gh.latitude != null && gh.longitude != null)
  const unmapped = greenhouses.filter(gh => gh.latitude == null || gh.longitude == null)

  const center: [number, number] = mapped.length > 0
    ? [
        mapped.reduce((s, g) => s + g.longitude!, 0) / mapped.length,
        mapped.reduce((s, g) => s + g.latitude!, 0) / mapped.length,
      ]
    : [-74.08, 4.71]

  const zoom = mapped.length > 1 ? 7 : mapped.length === 1 ? 12 : 6

  const getLastReadings = (ghId: number): SensorReadingDto[] => {
    const list = readings[ghId] ?? []
    const seen = new Set<string>()
    return list.filter(r => {
      const key = r.sensorType ?? String(r.sensorId)
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-green-500/30 border-t-green-400 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div ref={wrapperRef} className="space-y-5" style={{ opacity: 0 }}>
      <PageHeader title="Mapa de Invernaderos" subtitle="Ubicación geográfica y sensores en tiempo real" accent="cyan" />

      <p className="text-xs text-white/40 -mt-3">
        {mapped.length} con ubicación GPS · {unmapped.length} sin ubicación
      </p>

      <div className="shadow-glass-dark"
           style={{ height: 'calc(100vh - 220px)', minHeight: '400px', border: '1px solid rgba(74,222,128,0.15)', borderRadius: '14px', overflow: 'hidden' }}>
        <Map center={center} zoom={zoom}>
          <MapControls />
          {mapped.map(gh => {
            const lastReadings = getLastReadings(gh.id)
            return (
              <MapMarker
                key={gh.id}
                longitude={gh.longitude!}
                latitude={gh.latitude!}
                onClick={() => handleMarkerClick(gh.id)}
              >
                <MarkerContent>
                  <div className="map-marker-pin w-8 h-8 bg-green-500 rounded-full border-2 border-white
                                  flex items-center justify-center shadow-lg cursor-pointer
                                  hover:scale-110 transition-transform duration-200">
                    <MapPin size={14} className="text-white" />
                  </div>
                </MarkerContent>
                <MarkerTooltip>{gh.name}</MarkerTooltip>
                <MarkerPopup>
                  <div className="w-64 bg-[#0f2d17] border border-green-900/40 rounded-xl overflow-hidden shadow-xl">
                    {gh.photoUrl ? (
                      <img
                        src={gh.photoUrl}
                        alt={gh.name}
                        className="w-full h-32 object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-20 bg-gradient-to-br from-green-900/40 to-green-800/20
                                      flex items-center justify-center">
                        <MapPin size={28} className="text-green-500/40" />
                      </div>
                    )}

                    <div className="p-3 space-y-2">
                      <h3 className="text-sm font-bold text-white font-heading">{gh.name}</h3>
                      {gh.description && (
                        <p className="text-xs text-white/50 line-clamp-2">{gh.description}</p>
                      )}

                      {lastReadings.length > 0 ? (
                        <div className="space-y-1">
                          <p className="text-[10px] font-semibold text-white/30 uppercase tracking-widest">
                            Últimas lecturas
                          </p>
                          {lastReadings.map(r => (
                            <div key={r.id} className="flex justify-between items-center
                                                         bg-green-900/20 rounded-lg px-2 py-1">
                              <span className="text-[11px] text-white/60">
                                {r.sensorType ?? `Sensor ${r.sensorId}`}
                              </span>
                              <span className="text-[11px] font-bold text-green-400">
                                {r.value.toFixed(1)}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-white/30">
                          <Activity size={12} />
                          <span className="text-[11px]">Toca para ver sensores</span>
                        </div>
                      )}

                      <button
                        onClick={() => onNavigate('dashboard')}
                        className="w-full mt-1 py-1.5 bg-green-500/20 hover:bg-green-500/30
                                   border border-green-500/30 rounded-lg text-xs font-semibold
                                   text-green-400 transition-colors duration-200 cursor-pointer"
                      >
                        Ir al Dashboard →
                      </button>
                    </div>
                  </div>
                </MarkerPopup>
              </MapMarker>
            )
          })}
        </Map>
      </div>

      {unmapped.length > 0 && (
        <div className="bg-yellow-900/10 border border-yellow-500/20 rounded-xl px-4 py-3">
          <p className="text-xs text-yellow-400/80 font-medium">
            {unmapped.length} invernadero{unmapped.length > 1 ? 's' : ''} sin GPS:{' '}
            {unmapped.map(g => g.name).join(', ')}
          </p>
        </div>
      )}
    </div>
  )
}
