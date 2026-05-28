import { useEffect, useState, useRef } from 'react'
import { MapPin, Activity, ChevronRight, Wifi, WifiOff } from 'lucide-react'
import anime from 'animejs'
import { Map, MapMarker, MarkerContent, MarkerPopup, MarkerTooltip, MapControls, useMap } from '@/components/ui/map'
import { fetchWeather, owmTileUrl, hasOwmKey, uvLabel, type WeatherData } from '../lib/weather'
import { greenhouseRepository, readingRepository } from '../repositories'
import type { GreenhouseDto, SensorReadingDto } from '../types'
import PageHeader from '../components/ui/PageHeader'

type WeatherLayer = 'none' | 'precipitation_new' | 'temp_new' | 'clouds_new' | 'wind_new'

function WeatherTileLayer({ activeLayer }: { activeLayer: WeatherLayer }) {
  const { map, isLoaded } = useMap()

  useEffect(() => {
    if (!map || !isLoaded) return

    const SRC = 'owm-weather'
    const LYR = 'owm-weather-layer'

    const cleanup = () => {
      try {
        if (map.getLayer(LYR)) map.removeLayer(LYR)
        if (map.getSource(SRC)) map.removeSource(SRC)
      } catch { /* map already destroyed */ }
    }

    cleanup()

    if (activeLayer !== 'none' && hasOwmKey()) {
      map.addSource(SRC, {
        type: 'raster',
        tiles: [owmTileUrl(activeLayer)],
        tileSize: 256,
      })
      map.addLayer({
        id: LYR,
        type: 'raster',
        source: SRC,
        paint: { 'raster-opacity': 0.7 },
      })
    }

    return cleanup
  }, [map, isLoaded, activeLayer])

  return null
}

interface MapPageProps {
  onNavigate: (page: 'dashboard') => void
}

const WEATHER_LAYERS = [
  { id: 'precipitation_new' as WeatherLayer, label: 'Lluvia',      icon: '🌧' },
  { id: 'temp_new'          as WeatherLayer, label: 'Temperatura', icon: '🌡' },
  { id: 'clouds_new'        as WeatherLayer, label: 'Nubes',       icon: '☁️' },
  { id: 'wind_new'          as WeatherLayer, label: 'Viento',      icon: '💨' },
]

export default function MapPage({ onNavigate }: MapPageProps) {
  const [greenhouses, setGreenhouses] = useState<GreenhouseDto[]>([])
  const [readings, setReadings] = useState<Record<number, SensorReadingDto[]>>({})
  const [loading, setLoading] = useState(true)
  const wrapperRef = useRef<HTMLDivElement>(null)
  const [activeLayer,    setActiveLayer]    = useState<WeatherLayer>('none')
  const [weather,        setWeather]        = useState<Record<number, WeatherData>>({})
  const [weatherLoading, setWeatherLoading] = useState<Record<number, boolean>>({})
  const layerBarRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let alive = true
    greenhouseRepository.list().then(data => {
      if (alive) { setGreenhouses(data.greenhouses ?? []); setLoading(false) }
    }).catch(() => { if (alive) setLoading(false) })
    return () => { alive = false }
  }, [])

  const handleMarkerClick = (ghId: number) => {
    if (!readings[ghId]) {
      readingRepository.list(null, 10, ghId).then(data => {
        setReadings(prev => ({ ...prev, [ghId]: data.readings ?? [] }))
      }).catch(() => {})
    }
    const gh = mapped.find(g => g.id === ghId)
    if (gh && gh.latitude != null && gh.longitude != null && !weather[ghId] && !weatherLoading[ghId]) {
      setWeatherLoading(prev => ({ ...prev, [ghId]: true }))
      fetchWeather(gh.latitude, gh.longitude)
        .then(w  => setWeather(prev => ({ ...prev, [ghId]: w })))
        .catch(() => {})
        .finally(() => setWeatherLoading(prev => ({ ...prev, [ghId]: false })))
    }
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

  useEffect(() => {
    if (loading || !layerBarRef.current) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced) return
    anime({
      targets:    layerBarRef.current,
      opacity:    [0, 1],
      translateY: [8, 0],
      duration:   340,
      delay:      200,
      easing:     'easeOutCubic',
    })
  }, [loading])

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
          <WeatherTileLayer activeLayer={activeLayer} />
          {mapped.map(gh => {
            const lastReadings = getLastReadings(gh.id)
            return (
              <MapMarker
                key={gh.id}
                longitude={gh.longitude!}
                latitude={gh.latitude!}
                onClick={() => handleMarkerClick(gh.id)}
              >
                <MarkerContent className="drop-shadow-lg">
                  <div className="map-marker-pin w-8 h-8 bg-green-500 rounded-full border-2 border-white
                                  flex items-center justify-center shadow-lg cursor-pointer
                                  hover:scale-110 transition-transform duration-200">
                    <MapPin size={14} className="text-white" />
                  </div>
                </MarkerContent>
                <MarkerTooltip>{gh.name}</MarkerTooltip>
                <MarkerPopup className="!p-0 !m-0 !bg-transparent !border-0 !shadow-none !max-w-none !rounded-none">
                  {/* ── Popup card ────────────────────────────────────────── */}
                  <div
                    className="w-72 rounded-2xl overflow-hidden"
                    style={{
                      background: '#071a0c',
                      border: '1px solid rgba(74,222,128,0.15)',
                      boxShadow: '0 20px 60px rgba(0,0,0,0.7), 0 0 0 1px rgba(74,222,128,0.08)',
                    }}
                  >
                    {/* ── Foto / header ─────────────────────────────── */}
                    <div className="relative h-36 overflow-hidden">
                      {gh.photoUrl ? (
                        <img
                          src={gh.photoUrl}
                          alt={gh.name}
                          className="w-full h-full object-cover"
                          loading="lazy"
                          style={{ filter: 'brightness(0.85)' }}
                        />
                      ) : (
                        <div
                          className="w-full h-full flex flex-col items-center justify-center gap-2"
                          style={{ background: 'linear-gradient(135deg,#0b2714 0%,#163d22 60%,#0f2d1a 100%)' }}
                        >
                          <MapPin size={36} style={{ color: 'rgba(74,222,128,0.25)' }} />
                          <span className="text-[10px]" style={{ color: 'rgba(74,222,128,0.3)' }}>
                            Sin foto
                          </span>
                        </div>
                      )}

                      {/* gradiente oscuro en la parte inferior sobre la foto */}
                      <div
                        className="absolute inset-0"
                        style={{ background: 'linear-gradient(to top, rgba(7,26,12,1) 0%, rgba(7,26,12,0.5) 45%, transparent 100%)' }}
                      />

                      {/* badge WiFi top-right */}
                      <div
                        className="absolute top-2.5 right-2.5 flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-semibold"
                        style={{
                          background: 'rgba(7,26,12,0.75)',
                          border: '1px solid rgba(74,222,128,0.3)',
                          color: '#4ade80',
                          backdropFilter: 'blur(6px)',
                        }}
                      >
                        <Wifi size={9} />
                        Activo
                      </div>

                      {/* nombre + descripción sobre foto (bottom) */}
                      <div className="absolute bottom-0 left-0 right-0 px-3 pb-3">
                        <h3 className="text-sm font-bold text-white leading-tight drop-shadow">
                          {gh.name}
                        </h3>
                        {gh.description && (
                          <p className="text-[10px] mt-0.5 line-clamp-1" style={{ color: 'rgba(255,255,255,0.5)' }}>
                            {gh.description}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* ── Cuerpo del popup ──────────────────────────── */}
                    <div className="px-3 pt-2.5 pb-3 space-y-2.5">

                      {/* Clima exterior ───────────────────────────── */}
                      {weatherLoading[gh.id] && (
                        <div className="space-y-1.5">
                          <div className="skeleton h-2.5 w-24 rounded" />
                          <div className="skeleton h-8 rounded-xl" />
                        </div>
                      )}

                      {weather[gh.id] && !weatherLoading[gh.id] && (() => {
                        const w = weather[gh.id]
                        const uv = uvLabel(w.uvIndex)
                        return (
                          <div
                            className="rounded-xl px-3 py-2"
                            style={{ background: 'rgba(125,211,252,0.06)', border: '1px solid rgba(125,211,252,0.1)' }}
                          >
                            {/* fila principal: icono + temp + descripcion */}
                            <div className="flex items-center gap-2.5">
                              <span className="text-2xl leading-none">{w.icon}</span>
                              <div className="flex-1 min-w-0">
                                <span className="text-sm font-bold" style={{ color: '#7dd3fc' }}>
                                  {w.temperature}°C
                                </span>
                                <span className="text-[10px] ml-2 truncate" style={{ color: 'rgba(255,255,255,0.4)' }}>
                                  {w.description}
                                </span>
                              </div>
                            </div>
                            {/* fila secundaria: 4 métricas en línea */}
                            <div className="flex items-center gap-3 mt-1.5">
                              {[
                                { e: '💧', v: `${w.humidity}%` },
                                { e: '🌬', v: `${w.windSpeed} km/h` },
                                { e: '🌧', v: `${w.precipitation} mm` },
                                { e: '☀️', v: uv.label, c: uv.color },
                              ].map(({ e, v, c }) => (
                                <span key={e} className="text-[10px] flex items-center gap-0.5">
                                  <span>{e}</span>
                                  <span style={{ color: c ?? 'rgba(255,255,255,0.55)' }}>{v}</span>
                                </span>
                              ))}
                            </div>
                          </div>
                        )
                      })()}

                      {/* Sensores en tiempo real ─────────────────── */}
                      {(() => {
                        const META: Record<string, { label: string; emoji: string; unit: string; max: number }> = {
                          TEMPERATURE_INTERNAL: { label: 'Temp. Interior', emoji: '🌡', unit: '°C', max: 50 },
                          TEMPERATURE_EXTERNAL: { label: 'Temp. Exterior', emoji: '🌡', unit: '°C', max: 50 },
                          TEMPERATURE:          { label: 'Temperatura',    emoji: '🌡', unit: '°C', max: 50 },
                          HUMIDITY:             { label: 'Humedad',        emoji: '💧', unit: '%',  max: 100 },
                          HUMIDITY_EXTERNAL:    { label: 'Hum. Exterior',  emoji: '💧', unit: '%',  max: 100 },
                          SOIL_MOISTURE:        { label: 'Suelo',          emoji: '🌱', unit: '%',  max: 100 },
                          CURRENT:              { label: 'Corriente',      emoji: '⚡', unit: 'A',  max: 20  },
                          LIGHT:                { label: 'Luz',            emoji: '🔆', unit: ' lx', max: 1000 },
                          CO2:                  { label: 'CO₂',            emoji: '🫧', unit: ' ppm', max: 2000 },
                        }

                        if (lastReadings.length === 0) return (
                          <div className="flex items-center gap-2 py-0.5" style={{ color: 'rgba(255,255,255,0.2)' }}>
                            <Activity size={11} />
                            <span className="text-[11px]">Sin lecturas recientes</span>
                          </div>
                        )

                        return (
                          <div className="space-y-1.5">
                            <p className="text-[9px] font-semibold uppercase tracking-widest"
                               style={{ color: 'rgba(255,255,255,0.22)' }}>
                              Sensores · tiempo real
                            </p>
                            {lastReadings.slice(0, 5).map(r => {
                              const m = META[r.sensorType ?? ''] ?? {
                                label: r.sensorType ?? `Sensor ${r.sensorId}`,
                                emoji: '📊', unit: '', max: 100,
                              }
                              const isPct = m.unit === '%'
                              const isTemp = m.unit === '°C'
                              const pct = Math.min(100, Math.max(0, (r.value / m.max) * 100))
                              const barColor = isTemp
                                ? r.value > 30 ? '#f97316' : r.value < 15 ? '#7dd3fc' : '#4ade80'
                                : '#4ade80'

                              return (
                                <div key={r.id} className="flex items-center gap-2">
                                  <span className="text-xs w-4 shrink-0 text-center">{m.emoji}</span>
                                  <span className="text-[11px] flex-1 truncate"
                                        style={{ color: 'rgba(255,255,255,0.5)' }}>
                                    {m.label}
                                  </span>
                                  <span className="text-[11px] font-bold tabular-nums shrink-0"
                                        style={{ color: '#d1fae5' }}>
                                    {r.value.toFixed(1)}{m.unit}
                                  </span>
                                  {(isPct || isTemp) && (
                                    <div className="w-12 h-1 rounded-full shrink-0 overflow-hidden"
                                         style={{ background: 'rgba(255,255,255,0.08)' }}>
                                      <div className="h-full rounded-full"
                                           style={{ width: `${pct}%`, background: barColor }} />
                                    </div>
                                  )}
                                </div>
                              )
                            })}
                          </div>
                        )
                      })()}

                      {/* Botón CTA ───────────────────────────────── */}
                      <button
                        onClick={() => onNavigate('dashboard')}
                        className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl
                                   text-xs font-semibold transition-all duration-200 cursor-pointer group"
                        style={{
                          background: 'rgba(74,222,128,0.1)',
                          border: '1px solid rgba(74,222,128,0.22)',
                          color: '#4ade80',
                        }}
                        onMouseEnter={e => {
                          e.currentTarget.style.background = 'rgba(74,222,128,0.2)'
                          e.currentTarget.style.borderColor = 'rgba(74,222,128,0.4)'
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.background = 'rgba(74,222,128,0.1)'
                          e.currentTarget.style.borderColor = 'rgba(74,222,128,0.22)'
                        }}
                      >
                        Ver Dashboard
                        <ChevronRight size={13} className="transition-transform duration-200 group-hover:translate-x-0.5" />
                      </button>

                    </div>
                  </div>
                </MarkerPopup>
              </MapMarker>
            )
          })}
        </Map>
      </div>

      {/* Barra de capas climáticas */}
      <div ref={layerBarRef} className="biopunk-card p-3" style={{ opacity: 0 }}>
        <div className="flex flex-wrap items-center gap-2 justify-center">
          {WEATHER_LAYERS.map(layer => {
            const active = activeLayer === layer.id
            const disabled = !hasOwmKey()
            return (
              <button
                key={layer.id}
                disabled={disabled}
                aria-pressed={active}
                onClick={() => setActiveLayer(prev => prev === layer.id ? 'none' : layer.id)}
                className="px-3 py-1.5 rounded-full text-xs font-semibold border transition-all"
                style={{
                  background:  active ? 'rgba(74,222,128,0.15)' : 'rgba(255,255,255,0.05)',
                  borderColor: active ? 'rgba(74,222,128,0.5)'  : 'rgba(255,255,255,0.1)',
                  color:       active ? '#4ade80'                : 'rgba(255,255,255,0.5)',
                  opacity:     disabled ? 0.4 : 1,
                  cursor:      disabled ? 'not-allowed' : 'pointer',
                }}
              >
                {layer.icon} {layer.label}
              </button>
            )
          })}
          <button
            aria-pressed={activeLayer === 'none'}
            onClick={() => setActiveLayer('none')}
            className="px-3 py-1.5 rounded-full text-xs font-semibold border transition-all"
            style={{
              background:  activeLayer === 'none' ? 'rgba(74,222,128,0.15)' : 'rgba(255,255,255,0.05)',
              borderColor: activeLayer === 'none' ? 'rgba(74,222,128,0.5)'  : 'rgba(255,255,255,0.1)',
              color:       activeLayer === 'none' ? '#4ade80'                : 'rgba(255,255,255,0.5)',
            }}
          >
            ✕ Sin capa
          </button>
        </div>
        {!hasOwmKey() && (
          <p className="text-center mt-2" style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)' }}>
            Agrega <code style={{ color: 'rgba(74,222,128,0.6)' }}>VITE_OPENWEATHER_KEY</code> en Vercel para activar las capas climáticas
          </p>
        )}
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
