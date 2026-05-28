import { useState, useEffect, useRef } from 'react'
import { Building2, UserPlus, Cpu, Zap, ChevronDown, ChevronUp, Wifi, Loader2, Camera, Plus, X, Bell, MapPin, Check } from 'lucide-react'
import anime from 'animejs'
import PageHeader from '../components/ui/PageHeader'
import { useAuth, saveAccess, readAccess, saveAccessByEmail, readAccessByEmail, supabase } from '../context/AuthContext'
import { greenhouseRepository, sensorRepository, actuatorRepository, deviceRepository } from '../repositories'
import { userRepository } from '../repositories'
import type {
  GreenhouseDto, UserDto, DeviceConfigDto, GpioOptionsDto,
  SensorType, Protocol, ActuatorType, AlertRecipient,
} from '../types'

const SENSOR_TYPES: SensorType[]    = ['TEMPERATURE', 'TEMPERATURE_INTERNAL', 'TEMPERATURE_EXTERNAL', 'HUMIDITY', 'SOIL_MOISTURE', 'LIGHT', 'CO2', 'PRESSURE']
const PROTOCOLS: Protocol[]         = ['DHT22', 'DHT11', 'ADC', 'ANALOG', 'I2C', 'DIGITAL', 'ONE_WIRE']
const ACTUATOR_TYPES: ActuatorType[] = ['PUMP', 'FAN', 'LED', 'SERVO', 'RELAY', 'MOTOR']

interface SensorForm  { name: string; type: string; protocol: string; gpioPin: string }
interface ActuatorForm { name: string; type: string; gpioPin: string; activeLow: boolean }

type GhTab = 'users' | 'device' | 'alerts'

// ── GPIO map constants (matches DeviceController) ─────────────────────────────
const GPIO_RESERVED  = [0, 1, 2, 3, 6, 7, 8, 9, 10, 11, 21, 22]
const GPIO_INPUT     = [4, 5, 12, 13, 14, 15, 16, 17, 18, 19, 23, 25, 26, 27, 32, 33, 34, 35, 36, 39]
const GPIO_OUTPUT    = [4, 5, 12, 13, 14, 15, 16, 17, 18, 19, 23, 25, 26, 27, 32, 33]
const ALL_GPIOS      = Array.from({ length: 40 }, (_, i) => i)

const GH_USERS_KEY = (ghId: number) => `agropulse_gh_users_${ghId}`

export default function GreenhousePage() {
  const { user } = useAuth()
  const isAdmin = user?.role === 'admin' || user?.role === 'ADMIN'

  const [greenhouses,       setGreenhouses]       = useState<GreenhouseDto[]>([])
  const [loading,           setLoading]           = useState(true)
  const [showForm,          setShowForm]          = useState(false)
  const [form,              setForm]              = useState({ name: '', location: '', description: '' })
  const [expandedId,        setExpandedId]        = useState<number | null>(null)
  const [ghTab,             setGhTab]             = useState<Record<number, GhTab>>({})
  const [ghUsers,           setGhUsers]           = useState<Record<number, UserDto[]>>({})
  const [allUsers,          setAllUsers]          = useState<UserDto[]>([])
  const [assignUserId,      setAssignUserId]      = useState('')
  const [assigning,         setAssigning]         = useState(false)
  const [deviceConfig,      setDeviceConfig]      = useState<Record<number, DeviceConfigDto>>({})
  const [gpioOpts,          setGpioOpts]          = useState<Record<number, GpioOptionsDto>>({})
  const [sensorForm,        setSensorForm]        = useState<SensorForm>({ name: '', type: 'TEMPERATURE', protocol: 'DHT22', gpioPin: '' })
  const [actuatorForm,      setActuatorForm]      = useState<ActuatorForm>({ name: '', type: 'PUMP', gpioPin: '', activeLow: true })
  const [showSensorForm,    setShowSensorForm]    = useState<Record<number, boolean>>({})
  const [showActuatorForm,  setShowActuatorForm]  = useState<Record<number, boolean>>({})
  const [showGpioMap,       setShowGpioMap]       = useState<Record<number, boolean>>({})
  const [error,             setError]             = useState<string | null>(null)
  const [photoUploading,    setPhotoUploading]    = useState<Record<number, boolean>>({})
  const [ghRecipients,    setGhRecipients]    = useState<Record<number, AlertRecipient[]>>({})
  const [recipientForm,   setRecipientForm]   = useState({ name: '', email: '', phone: '+57', callmebotApikey: '' })
  const [recipientError,  setRecipientError]  = useState<string | null>(null)
  const [savingRecipient, setSavingRecipient] = useState(false)
  const [locationEdit,    setLocationEdit]    = useState<Record<number, { lat: string; lng: string; show: boolean; saving: boolean }>>({})
  const [lightbox,        setLightbox]        = useState<{ url: string; name: string } | null>(null)

  const cardsRef = useRef<HTMLDivElement>(null)
  const formRef  = useRef<HTMLFormElement>(null)

  useEffect(() => {
    loadGreenhouses()
    if (isAdmin) userRepository.listAll().then(d => {
      const list = Array.isArray(d) ? (d as UserDto[]) : (d.users ?? [])
      setAllUsers(list)
    }).catch(() => {})
  }, [])

  // Animate cards when greenhouses load
  useEffect(() => {
    if (!loading && greenhouses.length > 0 && cardsRef.current) {
      anime({
        targets: Array.from(cardsRef.current.children) as Element[],
        opacity: [0, 1],
        translateY: [24, 0],
        delay: anime.stagger(80),
        duration: 450,
        easing: 'easeOutCubic',
      })
    }
  }, [loading, greenhouses.length])

  // Animate form in when shown
  useEffect(() => {
    if (showForm && formRef.current) {
      anime({
        targets: formRef.current,
        opacity: [0, 1],
        scaleY: [0.92, 1],
        duration: 320,
        easing: 'easeOutBack',
      })
    }
  }, [showForm])

  const loadGreenhouses = async () => {
    try {
      const data = await greenhouseRepository.list()
      setGreenhouses(data.greenhouses ?? [])
      setError(null)
    } catch (err) { setError((err as Error).message) }
    setLoading(false)
  }

  const loadGhUsers = async (id: number) => {
    // Show cached list immediately
    try {
      const raw = localStorage.getItem(GH_USERS_KEY(id))
      if (raw) setGhUsers(prev => ({ ...prev, [id]: JSON.parse(raw) as UserDto[] }))
    } catch {}
    try {
      const data = await greenhouseRepository.listUsers(id)
      const list = Array.isArray(data) ? (data as UserDto[]) : (data.users ?? [])
      if (list.length > 0) {
        setGhUsers(prev => ({ ...prev, [id]: list }))
        try { localStorage.setItem(GH_USERS_KEY(id), JSON.stringify(list)) } catch {}
      }
    } catch (err) { setError((err as Error).message) }
  }

  const loadDeviceConfig = async (id: number) => {
    const empty: DeviceConfigDto         = { sensors: [], actuators: [] }
    const emptyGpios: GpioOptionsDto     = { usedGpios: [], availableForSensors: [], availableForActuators: [] }
    try {
      const [cfg, gpios] = await Promise.all([
        deviceRepository.getConfig(id).catch((): DeviceConfigDto => empty),
        deviceRepository.getGpios(id).catch((): GpioOptionsDto => emptyGpios),
      ])
      setDeviceConfig(prev => ({ ...prev, [id]: cfg }))
      setGpioOpts(prev => ({ ...prev, [id]: gpios }))
    } catch {
      setDeviceConfig(prev => ({ ...prev, [id]: empty }))
      setGpioOpts(prev => ({ ...prev, [id]: emptyGpios }))
    }
  }

  const loadRecipients = async (id: number) => {
    try {
      const data = await greenhouseRepository.listRecipients(id)
      setGhRecipients(prev => ({ ...prev, [id]: data.recipients ?? [] }))
    } catch { setGhRecipients(prev => ({ ...prev, [id]: [] })) }
  }

  const toggleTab = (id: number, tab: GhTab) => {
    if (expandedId === id && ghTab[id] === tab) { setExpandedId(null); return }
    setExpandedId(id)
    setGhTab(prev => ({ ...prev, [id]: tab }))
    if (tab === 'users')  loadGhUsers(id)
    if (tab === 'device') loadDeviceConfig(id)
    if (tab === 'alerts') loadRecipients(id)

    // Animate expanded panel
    setTimeout(() => {
      const el = document.getElementById(`gh-panel-${id}`)
      if (el) anime({ targets: el, opacity: [0, 1], translateY: [-10, 0], duration: 280, easing: 'easeOutCubic' })
    }, 10)
  }

  const openLocationEdit = (g: GreenhouseDto) => {
    setLocationEdit(prev => ({
      ...prev,
      [g.id]: { lat: g.latitude?.toString() ?? '', lng: g.longitude?.toString() ?? '', show: true, saving: false },
    }))
  }

  const saveLocation = async (ghId: number) => {
    const ed = locationEdit[ghId]
    if (!ed) return
    const lat = parseFloat(ed.lat)
    const lng = parseFloat(ed.lng)
    if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      alert('Coordenadas inválidas. Lat: -90 a 90, Lng: -180 a 180')
      return
    }
    setLocationEdit(prev => ({ ...prev, [ghId]: { ...prev[ghId], saving: true } }))
    try {
      await greenhouseRepository.update(ghId, { latitude: lat, longitude: lng })
      setGreenhouses(prev => prev.map(g => g.id === ghId ? { ...g, latitude: lat, longitude: lng } : g))
      setLocationEdit(prev => ({ ...prev, [ghId]: { ...prev[ghId], show: false, saving: false } }))
    } catch (err) {
      alert('Error guardando coordenadas: ' + (err as Error).message)
      setLocationEdit(prev => ({ ...prev, [ghId]: { ...prev[ghId], saving: false } }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await greenhouseRepository.create(form)
      setShowForm(false); setForm({ name: '', location: '', description: '' })
      loadGreenhouses()
    } catch (err) { alert('Error: ' + (err as Error).message) }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('¿Eliminar invernadero?')) return
    try { await greenhouseRepository.remove(id); loadGreenhouses() }
    catch (err) { alert('Error: ' + (err as Error).message) }
  }

  const handleAssign = async (ghId: number) => {
    if (!assignUserId || assigning) return
    const uid = parseInt(assignUserId)
    // Normalize IDs — backend may return id as string despite TS typing
    const targetUser = allUsers.find(u => Number(u.id) === uid)
    if (!targetUser) return
    setAssigning(true)
    try {
      await greenhouseRepository.assignUser(ghId, uid)
      // Optimistic update + cache
      setGhUsers(prev => {
        const current = prev[ghId] ?? []
        if (current.find(u => Number(u.id) === uid)) return prev
        const next = [...current, targetUser]
        try { localStorage.setItem(GH_USERS_KEY(ghId), JSON.stringify(next)) } catch {}
        return { ...prev, [ghId]: next }
      })
      // Save access by both ID and email for operator lookup
      const currentAccess = readAccess(uid)
      if (!currentAccess.includes(ghId)) saveAccess(uid, [...currentAccess, ghId])
      if (targetUser.email) {
        const currentByEmail = readAccessByEmail(targetUser.email, uid)
        if (!currentByEmail.includes(ghId)) saveAccessByEmail(targetUser.email, uid, [...currentByEmail, ghId])
      }
      // Belt-and-suspenders: push updated IDs to backend directly in case of cold-start race
      const finalIds = readAccess(uid)
      if (user?.email) {
        userRepository.setGreenhouses(uid, finalIds).catch(() => {})
      }
      setAssignUserId('')
    } catch (err) { alert('Error asignando usuario: ' + (err as Error).message) }
    finally { setAssigning(false) }
  }

  const handleRemoveUser = async (ghId: number, userId: number) => {
    const removedUser = (ghUsers[ghId] ?? []).find(u => Number(u.id) === userId)
    setGhUsers(prev => {
      const next = (prev[ghId] ?? []).filter(u => Number(u.id) !== userId)
      try { localStorage.setItem(GH_USERS_KEY(ghId), JSON.stringify(next)) } catch {}
      return { ...prev, [ghId]: next }
    })
    saveAccess(userId, readAccess(userId).filter(id => id !== ghId))
    if (removedUser?.email) saveAccessByEmail(removedUser.email, userId, readAccessByEmail(removedUser.email, userId).filter(id => id !== ghId))
    try {
      await greenhouseRepository.removeUser(ghId, userId)
    } catch (err) {
      await loadGhUsers(ghId)
      alert('Error removiendo usuario: ' + (err as Error).message)
    }
  }

  const handleAddRecipient = async (ghId: number) => {
    if (!recipientForm.name.trim() || savingRecipient) return
    setRecipientError(null)

    const emailVal = recipientForm.email.trim()
    if (emailVal && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailVal)) {
      setRecipientError('El email no tiene un formato válido.')
      return
    }
    const phoneVal = recipientForm.phone.trim()
    if (phoneVal && phoneVal !== '+57' && !/^\+\d{7,15}$/.test(phoneVal)) {
      setRecipientError('El teléfono debe tener formato internacional: +573001234567')
      return
    }

    setSavingRecipient(true)
    try {
      await greenhouseRepository.addRecipient(ghId, {
        name:            recipientForm.name.trim(),
        email:           emailVal || undefined,
        phone:           phoneVal !== '+57' ? phoneVal : undefined,
        callmebotApikey: recipientForm.callmebotApikey.trim() || undefined,
      })
      setRecipientForm({ name: '', email: '', phone: '+57', callmebotApikey: '' })
      loadRecipients(ghId)
    } catch (err) { alert('Error: ' + (err as Error).message) }
    setSavingRecipient(false)
  }

  const handleRemoveRecipient = async (ghId: number, recipientId: number) => {
    try {
      await greenhouseRepository.removeRecipient(ghId, recipientId)
      setGhRecipients(prev => ({
        ...prev,
        [ghId]: (prev[ghId] ?? []).filter(r => r.id !== recipientId),
      }))
    } catch (err) { alert('Error: ' + (err as Error).message) }
  }

  const handleAddSensor = async (ghId: number) => {
    try {
      await sensorRepository.create({
        name:         sensorForm.name,
        type:         sensorForm.type as SensorType,
        protocol:     sensorForm.protocol as Protocol,
        gpioPin:      sensorForm.gpioPin ? parseInt(sensorForm.gpioPin) : null,
        greenhouseId: ghId,
        active:       true,
      })
      setSensorForm({ name: '', type: 'TEMPERATURE', protocol: 'DHT22', gpioPin: '' })
      setShowSensorForm(prev => ({ ...prev, [ghId]: false }))
      loadDeviceConfig(ghId)
    } catch (err) { alert('Error: ' + (err as Error).message) }
  }

  const handleAddActuator = async (ghId: number) => {
    try {
      await actuatorRepository.create({
        name:         actuatorForm.name,
        type:         actuatorForm.type as ActuatorType,
        gpioPin:      actuatorForm.gpioPin ? parseInt(actuatorForm.gpioPin) : null,
        activeLow:    actuatorForm.activeLow,
        greenhouseId: ghId,
        active:       true,
      })
      setActuatorForm({ name: '', type: 'PUMP', gpioPin: '', activeLow: true })
      setShowActuatorForm(prev => ({ ...prev, [ghId]: false }))
      loadDeviceConfig(ghId)
    } catch (err) { alert('Error: ' + (err as Error).message) }
  }

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>, ghId: number) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!supabase) {
      setError('Supabase no está configurado (revisa VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY).')
      return
    }

    const ALLOWED_EXTS = ['jpg', 'jpeg', 'png', 'webp', 'gif']
    const rawExt = (file.name.split('.').pop() ?? '').toLowerCase()
    if (!ALLOWED_EXTS.includes(rawExt)) {
      setError(`Formato no soportado (.${rawExt}). Usa JPG, PNG, WebP o GIF. Los archivos .heic de iPhone deben convertirse primero.`)
      e.target.value = ''
      return
    }
    const ext = rawExt

    // Verificar sesión Supabase — necesaria para que la política RLS permita el INSERT
    const { data: { user: sbUser } } = await supabase.auth.getUser()
    if (!sbUser) {
      setError('Sesión de Supabase no activa. Cierra sesión, vuelve a iniciar con Google e intenta de nuevo.')
      e.target.value = ''
      return
    }
    const uid = sbUser.id
    const path = `${uid}/${ghId}.${ext}`

    setPhotoUploading(prev => ({ ...prev, [ghId]: true }))

    const spinnerEl = document.getElementById(`photo-spinner-${ghId}`)
    if (spinnerEl) {
      anime({ targets: spinnerEl, rotate: [0, 360], loop: true, duration: 800, easing: 'linear' })
    }

    try {
      const { error: uploadError } = await supabase.storage
        .from('greenhouse-photos')
        .upload(path, file, { upsert: true, contentType: file.type })

      if (uploadError) throw uploadError

      const { data: urlData } = supabase.storage
        .from('greenhouse-photos')
        .getPublicUrl(path)

      const publicUrl = urlData.publicUrl
      console.log('[Photo] URL generada:', publicUrl)

      await greenhouseRepository.update(ghId, { photoUrl: publicUrl })
      setGreenhouses(prev =>
        prev.map(g => g.id === ghId ? { ...g, photoUrl: publicUrl } : g)
      )
    } catch (err) {
      const msg = (err as { message?: string })?.message ?? String(err)
      console.error('Error subiendo foto:', err)
      const isRls = msg.toLowerCase().includes('row-level security') || msg.toLowerCase().includes('rls')
      setError(isRls
        ? '⚠️ Error de permisos en Supabase Storage. Ve a Supabase → Storage → greenhouse-photos → Policies y agrega una política INSERT para usuarios autenticados (WITH CHECK: bucket_id = \'greenhouse-photos\' AND auth.uid()::text = split_part(name, \'/\', 1)).'
        : `No se pudo subir la foto: ${msg}`)
    } finally {
      setPhotoUploading(prev => ({ ...prev, [ghId]: false }))
      e.target.value = ''
    }
  }

  // ── GPIO Map pin color helper ──────────────────────────────────────────────
  const getPinStyle = (pin: number, usedGpios: number[]) => {
    if (GPIO_RESERVED.includes(pin)) return 'bg-red-200 text-red-800 border-red-300'
    if (usedGpios.includes(pin))     return 'bg-amber-300 text-amber-900 border-amber-400'
    if (!GPIO_INPUT.includes(pin) && !GPIO_OUTPUT.includes(pin))
                                     return 'bg-gray-200 text-gray-500 border-gray-300'
    return 'bg-green-200 text-green-800 border-green-300'
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="Invernaderos"
        subtitle="Gestión de invernaderos y dispositivos ESP32"
        action={
          isAdmin ? (
            <button onClick={() => setShowForm(!showForm)}
                    className={showForm ? 'btn-secondary px-3 py-1.5 text-sm' : 'btn-primary px-3 py-1.5 text-sm'}>
              {showForm ? <><X size={13} />Cancelar</> : <><Plus size={13} />Nuevo</>}
            </button>
          ) : undefined
        }
      />

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">⚠️ {error}</div>
      )}

      {/* Create form */}
      {showForm && isAdmin && (
        <form ref={formRef} onSubmit={handleSubmit}
          className="biopunk-card border-2 border-green-200 p-5 space-y-3">
          <input type="text" placeholder="Nombre del invernadero *" value={form.name}
            onChange={e => setForm({ ...form, name: e.target.value })}
            className="input-field" required />
          <input type="text" placeholder="Ubicación / Región" value={form.location}
            onChange={e => setForm({ ...form, location: e.target.value })}
            className="input-field" />
          <textarea placeholder="Descripción" value={form.description}
            onChange={e => setForm({ ...form, description: e.target.value })}
            className="input-field resize-none" rows={2} />
          <button type="submit" className="w-full btn-primary py-2.5 text-sm font-bold">
            Guardar Invernadero
          </button>
        </form>
      )}

      {/* List */}
      {loading ? (
        <div className="text-center py-12">
          <div className="text-4xl animate-bounce">🏡</div>
          <p className="text-gray-500 mt-2">Cargando...</p>
        </div>
      ) : greenhouses.length === 0 ? (
        <div className="biopunk-card p-12 text-center">
          <Building2 size={48} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500 font-medium">No hay invernaderos</p>
          {isAdmin && (
            <button onClick={() => setShowForm(true)} className="mt-3 text-green-600 text-sm font-medium hover:underline">
              Crear el primero
            </button>
          )}
        </div>
      ) : (
        <div ref={cardsRef} className="space-y-3">
          {greenhouses.map(g => {
            const usedGpios = gpioOpts[g.id]?.usedGpios ?? []
            return (
              <div key={g.id} className="biopunk-card overflow-hidden">

                {/* Card header */}
                <div className="p-4 flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-lg">🌿</span>
                      <h3 className="font-bold" style={{ color: '#e2ffe9' }}>{g.name}</h3>
                      <span className={g.active ? 'badge-green' : 'badge-gray'}>
                        {g.active ? 'Activo' : 'Inactivo'}
                      </span>
                    </div>
                    {g.location && <p className="text-sm mt-0.5" style={{ color: 'rgba(255,255,255,0.5)' }}>📍 {g.location}</p>}
                    <p className="text-xs font-mono" style={{ color: 'rgba(255,255,255,0.35)' }}>
                      ID: <span className="font-bold" style={{ color: 'rgba(255,255,255,0.5)' }}>{g.id}</span>
                    </p>
                    {g.description && <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.35)' }}>{g.description}</p>}
                    {g.deviceId && (
                      <p className="text-xs mt-1 flex items-center gap-1 text-purple-600">
                        <Wifi size={11} /> ESP32: <span className="font-mono">{g.deviceId}</span>
                      </p>
                    )}

                    {/* Coordenadas GPS */}
                    {isAdmin && !locationEdit[g.id]?.show && (
                      <button
                        onClick={() => openLocationEdit(g)}
                        className="mt-1.5 flex items-center gap-1 text-xs transition-colors"
                        style={{ color: g.latitude != null ? 'rgba(74,222,128,0.7)' : 'rgba(255,200,0,0.6)' }}
                      >
                        <MapPin size={11} />
                        {g.latitude != null
                          ? `${g.latitude.toFixed(4)}, ${g.longitude?.toFixed(4)}`
                          : 'Sin GPS — click para fijar'}
                      </button>
                    )}
                    {isAdmin && locationEdit[g.id]?.show && (
                      <div className="mt-2 flex items-center gap-1.5">
                        <MapPin size={11} className="text-green-400 shrink-0" />
                        <input
                          type="number" step="0.0001" placeholder="Lat"
                          value={locationEdit[g.id].lat}
                          onChange={e => setLocationEdit(prev => ({ ...prev, [g.id]: { ...prev[g.id], lat: e.target.value } }))}
                          className="w-24 rounded px-2 py-1 text-xs"
                          style={{ background: '#0a1e0f', border: '1px solid rgba(74,222,128,0.3)', color: '#e2ffe9' }}
                        />
                        <input
                          type="number" step="0.0001" placeholder="Lng"
                          value={locationEdit[g.id].lng}
                          onChange={e => setLocationEdit(prev => ({ ...prev, [g.id]: { ...prev[g.id], lng: e.target.value } }))}
                          className="w-24 rounded px-2 py-1 text-xs"
                          style={{ background: '#0a1e0f', border: '1px solid rgba(74,222,128,0.3)', color: '#e2ffe9' }}
                        />
                        <button
                          onClick={() => saveLocation(g.id)}
                          disabled={locationEdit[g.id].saving}
                          className="p-1 rounded bg-green-600/20 hover:bg-green-600/40 transition-colors disabled:opacity-50"
                        >
                          {locationEdit[g.id].saving
                            ? <Loader2 size={12} className="text-green-400 animate-spin" />
                            : <Check size={12} className="text-green-400" />}
                        </button>
                        <button
                          onClick={() => setLocationEdit(prev => ({ ...prev, [g.id]: { ...prev[g.id], show: false } }))}
                          className="p-1 rounded hover:bg-red-500/10 transition-colors"
                        >
                          <X size={12} className="text-red-400" />
                        </button>
                      </div>
                    )}

                    {isAdmin && (
                      <div className="mt-2 flex items-center gap-2">
                        <input
                          type="file"
                          accept="image/*"
                          id={`photo-input-${g.id}`}
                          className="hidden"
                          onChange={(e) => handlePhotoUpload(e, g.id)}
                        />
                        <label htmlFor={`photo-input-${g.id}`} className="cursor-pointer">
                          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-green-900/20 hover:bg-green-900/30
                                          border border-green-500/20 rounded-lg transition-colors duration-200">
                            {photoUploading[g.id] ? (
                              <div id={`photo-spinner-${g.id}`} className="w-3.5 h-3.5 border border-green-400/50
                                                                            border-t-green-400 rounded-full" />
                            ) : (
                              <Camera size={13} className="text-green-400" />
                            )}
                            <span className="text-xs text-green-400 font-medium">
                              {g.photoUrl ? 'Cambiar foto' : 'Subir foto'}
                            </span>
                          </div>
                        </label>
                        {g.photoUrl && (
                          <button
                            onClick={() => setLightbox({ url: g.photoUrl!, name: g.name })}
                            title="Ver foto"
                            className="block shrink-0 w-8 h-8 rounded-lg overflow-hidden border border-green-500/20 hover:opacity-80 transition-opacity cursor-pointer"
                          >
                            <img
                              src={g.photoUrl}
                              alt="Foto"
                              loading="lazy"
                              className="w-full h-full object-cover"
                            />
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex gap-1.5 shrink-0 flex-wrap justify-end">
                    {isAdmin && (
                      <button onClick={() => toggleTab(g.id, 'users')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1 ${
                          expandedId === g.id && ghTab[g.id] === 'users'
                            ? 'bg-blue-600 text-white' : 'hover:bg-[rgba(34,211,238,0.08)] text-blue-400'
                        }`}>
                        <UserPlus size={12} /> Usuarios
                      </button>
                    )}
                    {isAdmin && (
                      <button onClick={() => toggleTab(g.id, 'device')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1 ${
                          expandedId === g.id && ghTab[g.id] === 'device'
                            ? 'bg-purple-600 text-white' : 'hover:bg-[rgba(167,139,250,0.08)] text-purple-400'
                        }`}>
                        <Cpu size={12} /> Dispositivo
                      </button>
                    )}
                    {isAdmin && (
                      <button onClick={() => toggleTab(g.id, 'alerts')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1 ${
                          expandedId === g.id && ghTab[g.id] === 'alerts'
                            ? 'bg-amber-600 text-white' : 'hover:bg-[rgba(245,158,11,0.08)] text-amber-400'
                        }`}>
                        <Bell size={12} /> Alertas
                      </button>
                    )}
                    {isAdmin && (
                      <button onClick={() => handleDelete(g.id)}
                        className="text-red-400 hover:text-red-600 text-xs px-2 py-1.5 rounded-lg hover:bg-[rgba(248,113,113,0.1)] transition-colors">
                        Eliminar
                      </button>
                    )}
                  </div>
                </div>

                {/* Expanded panel */}
                {isAdmin && expandedId === g.id && (
                  <div id={`gh-panel-${g.id}`} className="border-t border-[rgba(74,222,128,0.12)] p-4" style={{ background: '#051a0a' }}>

                    {/* ── Users tab ── */}
                    {ghTab[g.id] === 'users' && (
                      <div className="space-y-3">
                        <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'rgba(255,255,255,0.5)' }}>👥 Usuarios asignados</p>
                        <div className="flex gap-2">
                          <select value={assignUserId} onChange={e => setAssignUserId(e.target.value)}
                            className="flex-1 rounded-lg px-3 py-2 text-sm focus:border-green-400 focus:outline-none"
                            style={{ background: '#0a1e0f', border: '2px solid rgba(74,222,128,0.15)', color: '#e2ffe9' }}>
                            <option value="">Seleccionar usuario...</option>
                            {allUsers.filter(u => !(ghUsers[g.id] ?? []).find(gu => gu.id === u.id)).map(u => (
                              <option key={u.id} value={u.id}>{u.fullName || u.username} ({u.role})</option>
                            ))}
                          </select>
                          <button onClick={() => handleAssign(g.id)}
                            disabled={!assignUserId || assigning}
                            className="bg-blue-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed">
                            {assigning
                              ? <><Loader2 size={14} className="animate-spin" /> Asignando…</>
                              : <><UserPlus size={14} /> Asignar</>
                            }
                          </button>
                        </div>
                        {(ghUsers[g.id] === undefined)
                          ? <p className="text-xs py-2" style={{ color: 'rgba(255,255,255,0.35)' }}>Cargando usuarios…</p>
                          : (ghUsers[g.id] ?? []).length === 0
                          ? <p className="text-xs py-2" style={{ color: 'rgba(255,255,255,0.35)' }}>Sin usuarios asignados aún</p>
                          : (
                            <div className="space-y-2">
                              {(ghUsers[g.id] ?? []).map(u => (
                                <div key={u.id} className="flex items-center justify-between rounded-lg px-3 py-2" style={{ background: '#0a1e0f' }}>
                                  <div className="flex items-center gap-2">
                                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: 'rgba(74,222,128,0.1)', color: '#4ade80' }}>
                                      {(u.fullName || u.username || '?')[0].toUpperCase()}
                                    </div>
                                    <div>
                                      <p className="text-xs font-medium" style={{ color: '#e2ffe9' }}>{u.fullName || u.username}</p>
                                      <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.35)' }}>{u.role}</p>
                                    </div>
                                  </div>
                                  <button onClick={() => handleRemoveUser(g.id, u.id)}
                                    className="text-red-400 hover:text-red-600 text-xs px-2 py-1 rounded hover:bg-[rgba(248,113,113,0.1)] transition-colors">
                                    Quitar
                                  </button>
                                </div>
                              ))}
                            </div>
                          )
                        }
                      </div>
                    )}

                    {/* ── Device tab ── */}
                    {ghTab[g.id] === 'device' && (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'rgba(255,255,255,0.5)' }}>⚙️ Configuración ESP32</p>
                          {deviceConfig[g.id]?.deviceId && (
                            <span className="text-xs px-2 py-0.5 rounded-full font-mono" style={{ background: 'rgba(167,139,250,0.1)', color: '#a78bfa' }}>
                              {deviceConfig[g.id].deviceId}
                            </span>
                          )}
                        </div>

                        {/* GPIO visual map */}
                        <div className="rounded-xl p-3" style={{ background: '#0a1e0f', border: '1px solid rgba(74,222,128,0.12)' }}>
                          <button
                            onClick={() => setShowGpioMap(prev => ({ ...prev, [g.id]: !prev[g.id] }))}
                            className="w-full flex items-center justify-between text-xs font-semibold mb-1"
                            style={{ color: 'rgba(255,255,255,0.7)' }}
                          >
                            <span>🗺️ Mapa de pines GPIO ESP32</span>
                            {showGpioMap[g.id] ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                          </button>
                          {showGpioMap[g.id] && (
                            <div className="mt-2">
                              <div className="flex gap-3 text-[10px] mb-2 flex-wrap">
                                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-200 border border-green-300 inline-block" /> Libre</span>
                                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-amber-300 border border-amber-400 inline-block" /> En uso</span>
                                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-200 border border-red-300 inline-block" /> Reservado</span>
                                <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-gray-200 border border-gray-300 inline-block" /> No disponible</span>
                              </div>
                              <div className="grid grid-cols-8 sm:grid-cols-10 gap-1">
                                {ALL_GPIOS.map(pin => (
                                  <div key={pin}
                                    className={`text-[10px] font-mono px-1 py-1 rounded border text-center leading-tight ${getPinStyle(pin, usedGpios)}`}
                                    title={
                                      GPIO_RESERVED.includes(pin) ? `GPIO ${pin}: Sistema/Reservado` :
                                      usedGpios.includes(pin)     ? `GPIO ${pin}: En uso` :
                                      GPIO_INPUT.includes(pin)    ? `GPIO ${pin}: Disponible` :
                                      `GPIO ${pin}: No recomendado`
                                    }
                                  >
                                    {pin}
                                  </div>
                                ))}
                              </div>
                              <div className="mt-2 text-[10px] space-y-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>
                                <p>📥 Sensores: GPIOs {GPIO_INPUT.join(', ')}</p>
                                <p>📤 Actuadores: GPIOs {GPIO_OUTPUT.join(', ')}</p>
                                <p>🔒 Reservados (sistema): {GPIO_RESERVED.join(', ')}</p>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Sensors section */}
                        <div className="rounded-xl p-3 space-y-2" style={{ background: '#0a1e0f', border: '1px solid rgba(74,222,128,0.12)' }}>
                          <div className="flex items-center justify-between">
                            <p className="text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.7)' }}>
                              🌡 Sensores ({(deviceConfig[g.id]?.sensors ?? []).length})
                            </p>
                            <button
                              onClick={() => setShowSensorForm(prev => ({ ...prev, [g.id]: !prev[g.id] }))}
                              className="text-xs px-2 py-1 rounded-lg font-medium transition-colors hover:bg-[rgba(74,222,128,0.15)]"
                              style={{ background: 'rgba(74,222,128,0.1)', color: '#4ade80' }}>
                              {showSensorForm[g.id] ? 'Cancelar' : '+ Sensor'}
                            </button>
                          </div>

                          {(deviceConfig[g.id]?.sensors ?? []).map(s => (
                            <div key={s.id} className="flex items-center justify-between rounded-lg px-3 py-2 text-xs" style={{ background: 'rgba(74,222,128,0.06)' }}>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-medium" style={{ color: '#e2ffe9' }}>{s.name}</span>
                                <span className="badge-blue">{s.type}</span>
                                {s.protocol && <span className="badge-gray">{s.protocol}</span>}
                                {s.gpioPin != null && <span className="badge-yellow">GPIO {s.gpioPin}</span>}
                                {s.deviceSource && <span className="badge-purple font-mono">{s.deviceSource}</span>}
                              </div>
                              <button
                                onClick={() => sensorRepository.remove(s.id).then(() => loadDeviceConfig(g.id)).catch(e => alert(e.message))}
                                className="text-red-400 hover:text-red-600 transition-colors ml-2 shrink-0">✕</button>
                            </div>
                          ))}

                          {(deviceConfig[g.id]?.sensors ?? []).length === 0 && !showSensorForm[g.id] && (
                            <p className="text-xs py-1" style={{ color: 'rgba(255,255,255,0.35)' }}>Sin sensores configurados</p>
                          )}

                          {showSensorForm[g.id] && (
                            <div className="space-y-2 pt-2 border-t border-[rgba(74,222,128,0.12)]">
                              <input placeholder="Nombre del sensor *" value={sensorForm.name}
                                onChange={e => setSensorForm(f => ({ ...f, name: e.target.value }))}
                                className="w-full rounded-lg px-3 py-2 text-xs focus:border-green-400 focus:outline-none"
                                style={{ background: '#0a1e0f', border: '1px solid rgba(74,222,128,0.15)', color: '#e2ffe9' }} />
                              <div className="grid grid-cols-3 gap-2">
                                <select value={sensorForm.type} onChange={e => setSensorForm(f => ({ ...f, type: e.target.value }))}
                                  className="rounded-lg px-2 py-2 text-xs focus:border-green-400 focus:outline-none"
                                  style={{ background: '#0a1e0f', border: '1px solid rgba(74,222,128,0.15)', color: '#e2ffe9' }}>
                                  {SENSOR_TYPES.map(t => <option key={t}>{t}</option>)}
                                </select>
                                <select value={sensorForm.protocol} onChange={e => setSensorForm(f => ({ ...f, protocol: e.target.value }))}
                                  className="rounded-lg px-2 py-2 text-xs focus:border-green-400 focus:outline-none"
                                  style={{ background: '#0a1e0f', border: '1px solid rgba(74,222,128,0.15)', color: '#e2ffe9' }}>
                                  {PROTOCOLS.map(p => <option key={p}>{p}</option>)}
                                </select>
                                <select value={sensorForm.gpioPin} onChange={e => setSensorForm(f => ({ ...f, gpioPin: e.target.value }))}
                                  className="rounded-lg px-2 py-2 text-xs focus:border-green-400 focus:outline-none"
                                  style={{ background: '#0a1e0f', border: '1px solid rgba(74,222,128,0.15)', color: '#e2ffe9' }}>
                                  <option value="">GPIO</option>
                                  {(gpioOpts[g.id]?.availableForSensors ?? []).map(p => (
                                    <option key={p} value={p}>GPIO {p}</option>
                                  ))}
                                </select>
                              </div>
                              <button onClick={() => handleAddSensor(g.id)} disabled={!sensorForm.name}
                                className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white py-2 rounded-lg text-xs font-medium transition-colors">
                                Guardar sensor
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Actuators section */}
                        <div className="rounded-xl p-3 space-y-2" style={{ background: '#0a1e0f', border: '1px solid rgba(74,222,128,0.12)' }}>
                          <div className="flex items-center justify-between">
                            <p className="text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.7)' }}>
                              <Zap size={12} className="inline mr-1" />Actuadores ({(deviceConfig[g.id]?.actuators ?? []).length})
                            </p>
                            <button
                              onClick={() => setShowActuatorForm(prev => ({ ...prev, [g.id]: !prev[g.id] }))}
                              className="text-xs px-2 py-1 rounded-lg font-medium transition-colors hover:bg-[rgba(167,139,250,0.15)]"
                              style={{ background: 'rgba(167,139,250,0.1)', color: '#a78bfa' }}>
                              {showActuatorForm[g.id] ? 'Cancelar' : '+ Actuador'}
                            </button>
                          </div>

                          {(deviceConfig[g.id]?.actuators ?? []).map(a => (
                            <div key={a.id} className="flex items-center justify-between rounded-lg px-3 py-2 text-xs" style={{ background: 'rgba(74,222,128,0.05)', border: '1px solid rgba(74,222,128,0.10)' }}>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-medium" style={{ color: '#e2ffe9' }}>{a.name}</span>
                                {a.type && <span className="badge-purple">{a.type}</span>}
                                {a.gpioPin != null && <span className="badge-yellow">GPIO {a.gpioPin}</span>}
                                {a.activeLow && <span className="badge-yellow">ActiveLow</span>}
                                {a.deviceSource && <span className="badge-purple font-mono">{a.deviceSource}</span>}
                              </div>
                              <button
                                onClick={() => actuatorRepository.remove(a.id).then(() => loadDeviceConfig(g.id)).catch(e => alert((e as Error).message))}
                                className="text-red-400 hover:text-red-600 transition-colors ml-2 shrink-0">✕</button>
                            </div>
                          ))}

                          {(deviceConfig[g.id]?.actuators ?? []).length === 0 && !showActuatorForm[g.id] && (
                            <p className="text-xs py-1" style={{ color: 'rgba(255,255,255,0.35)' }}>Sin actuadores configurados</p>
                          )}

                          {showActuatorForm[g.id] && (
                            <div className="space-y-2 pt-2 border-t border-[rgba(74,222,128,0.12)]">
                              <input placeholder="Nombre del actuador *" value={actuatorForm.name}
                                onChange={e => setActuatorForm(f => ({ ...f, name: e.target.value }))}
                                className="w-full rounded-lg px-3 py-2 text-xs focus:border-green-400 focus:outline-none"
                                style={{ background: '#0a1e0f', border: '1px solid rgba(74,222,128,0.15)', color: '#e2ffe9' }} />
                              <div className="grid grid-cols-2 gap-2">
                                <select value={actuatorForm.type} onChange={e => setActuatorForm(f => ({ ...f, type: e.target.value }))}
                                  className="rounded-lg px-2 py-2 text-xs focus:border-green-400 focus:outline-none"
                                  style={{ background: '#0a1e0f', border: '1px solid rgba(74,222,128,0.15)', color: '#e2ffe9' }}>
                                  {ACTUATOR_TYPES.map(t => <option key={t}>{t}</option>)}
                                </select>
                                <select value={actuatorForm.gpioPin} onChange={e => setActuatorForm(f => ({ ...f, gpioPin: e.target.value }))}
                                  className="rounded-lg px-2 py-2 text-xs focus:border-green-400 focus:outline-none"
                                  style={{ background: '#0a1e0f', border: '1px solid rgba(74,222,128,0.15)', color: '#e2ffe9' }}>
                                  <option value="">GPIO</option>
                                  {(gpioOpts[g.id]?.availableForActuators ?? []).map(p => (
                                    <option key={p} value={p}>GPIO {p}</option>
                                  ))}
                                </select>
                              </div>
                              <label className="flex items-center gap-2 text-xs cursor-pointer" style={{ color: 'rgba(255,255,255,0.5)' }}>
                                <input type="checkbox" checked={actuatorForm.activeLow}
                                  onChange={e => setActuatorForm(f => ({ ...f, activeLow: e.target.checked }))} className="rounded" />
                                Active-Low (relés HW-383)
                              </label>
                              <button onClick={() => handleAddActuator(g.id)} disabled={!actuatorForm.name}
                                className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white py-2 rounded-lg text-xs font-medium transition-colors">
                                Guardar actuador
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* ── Alerts (recipients) tab ── */}
                    {ghTab[g.id] === 'alerts' && (
                      <div className="space-y-3">
                        <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'rgba(255,255,255,0.5)' }}>
                          🔔 Destinatarios de alertas
                        </p>

                        {/* Recipient list */}
                        {(ghRecipients[g.id] ?? []).length === 0 ? (
                          <p className="text-xs py-2" style={{ color: 'rgba(255,255,255,0.35)' }}>
                            Sin destinatarios configurados
                          </p>
                        ) : (
                          <div className="space-y-2">
                            {(ghRecipients[g.id] ?? []).map(r => (
                              <div key={r.id} className="flex items-center justify-between rounded-lg px-3 py-2"
                                   style={{ background: '#0a1e0f' }}>
                                <div className="flex items-center gap-2">
                                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                                       style={{ background: 'rgba(245,158,11,0.1)', color: '#f59e0b' }}>
                                    {r.name[0].toUpperCase()}
                                  </div>
                                  <div>
                                    <p className="text-xs font-medium" style={{ color: '#e2ffe9' }}>{r.name}</p>
                                    <div className="flex gap-1 mt-0.5">
                                      {r.email && <span className="badge-gray text-[9px]">📧 Email</span>}
                                      {r.phone && <span className="badge-gray text-[9px]">💬 WhatsApp</span>}
                                    </div>
                                  </div>
                                </div>
                                <button onClick={() => handleRemoveRecipient(g.id, r.id)}
                                  className="text-red-400 hover:text-red-300 text-xs px-2 py-1 rounded hover:bg-[rgba(248,113,113,0.1)] transition-colors">
                                  Quitar
                                </button>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Add recipient form */}
                        <div className="space-y-2 pt-2" style={{ borderTop: '1px solid rgba(74,222,128,0.08)' }}>
                          <p className="biopunk-label">Agregar destinatario</p>
                          {recipientError && (
                            <p className="text-[11px] text-red-400 bg-red-900/10 rounded-lg px-2 py-1.5">
                              {recipientError}
                            </p>
                          )}
                          <label className="sr-only" htmlFor={`rec-name-${g.id}`}>Nombre del destinatario</label>
                          <input id={`rec-name-${g.id}`} placeholder="Nombre *" value={recipientForm.name}
                            aria-required="true"
                            onChange={e => { setRecipientError(null); setRecipientForm(f => ({ ...f, name: e.target.value })) }}
                            className="w-full rounded-lg px-3 py-2 text-xs"
                            style={{ background: '#0a1e0f', border: '1px solid rgba(74,222,128,0.15)', color: '#e2ffe9' }} />
                          <label className="sr-only" htmlFor={`rec-email-${g.id}`}>Email del destinatario</label>
                          <input id={`rec-email-${g.id}`} type="email" placeholder="Email (opcional)" value={recipientForm.email}
                            aria-describedby={`rec-email-hint-${g.id}`}
                            onChange={e => { setRecipientError(null); setRecipientForm(f => ({ ...f, email: e.target.value })) }}
                            className="w-full rounded-lg px-3 py-2 text-xs"
                            style={{ background: '#0a1e0f', border: '1px solid rgba(74,222,128,0.15)', color: '#e2ffe9' }} />
                          <label className="sr-only" htmlFor={`rec-phone-${g.id}`}>Teléfono WhatsApp del destinatario</label>
                          <input id={`rec-phone-${g.id}`} type="tel" placeholder="+573001234567 (WhatsApp)" value={recipientForm.phone}
                            aria-describedby={`rec-phone-hint-${g.id}`}
                            onChange={e => { setRecipientError(null); setRecipientForm(f => ({ ...f, phone: e.target.value })) }}
                            className="w-full rounded-lg px-3 py-2 text-xs"
                            style={{ background: '#0a1e0f', border: '1px solid rgba(74,222,128,0.15)', color: '#e2ffe9' }} />
                          <label className="sr-only" htmlFor={`rec-apikey-${g.id}`}>CallMeBot API Key</label>
                          <input id={`rec-apikey-${g.id}`} placeholder="CallMeBot API Key (opcional)" value={recipientForm.callmebotApikey}
                            onChange={e => setRecipientForm(f => ({ ...f, callmebotApikey: e.target.value }))}
                            className="w-full rounded-lg px-3 py-2 text-xs"
                            style={{ background: '#0a1e0f', border: '1px solid rgba(74,222,128,0.15)', color: '#e2ffe9' }} />
                          <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.3)' }}>
                            ¿Cómo obtener mi API Key?{' '}
                            <a href="https://www.callmebot.com/blog/free-api-whatsapp-messages/"
                               target="_blank" rel="noreferrer"
                               style={{ color: '#4ade80' }}>
                              Ver instrucciones →
                            </a>
                          </p>
                          <button onClick={() => handleAddRecipient(g.id)}
                            disabled={!recipientForm.name.trim() || savingRecipient}
                            className="w-full py-2 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
                            style={{ background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.3)', color: '#f59e0b' }}>
                            {savingRecipient ? 'Guardando…' : '+ Agregar destinatario'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(6px)' }}
          onClick={() => setLightbox(null)}
        >
          <div
            className="relative max-w-3xl w-full"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-2 px-1">
              <p className="text-sm font-semibold text-white/80 truncate">{lightbox.name}</p>
              <button
                onClick={() => setLightbox(null)}
                className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
              >
                <X size={18} className="text-white/70" />
              </button>
            </div>
            <img
              src={lightbox.url}
              alt={lightbox.name}
              className="w-full rounded-xl object-contain shadow-2xl"
              style={{ maxHeight: '80vh' }}
            />
          </div>
        </div>
      )}
    </div>
  )
}
