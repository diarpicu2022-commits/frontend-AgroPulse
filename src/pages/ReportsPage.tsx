import { useState, useEffect } from 'react'
import { Mail } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { reportRepository } from '../repositories'

type Frequency = 'daily' | 'weekly' | 'monthly'

interface ScheduleItem {
  id: number
  email: string
  frequency: Frequency
}

interface ReportForm {
  email: string
  frequency: Frequency
}

interface DailyCsvResponse {
  success?: boolean
  csv_content?: string
}

interface HistoryResponse {
  history?: ScheduleItem[]
}

export default function ReportsPage() {
  const { user } = useAuth()
  const [schedules, setSchedules] = useState<ScheduleItem[]>([])
  const [loading, setLoading]     = useState(true)
  const [showForm, setShowForm]   = useState(false)
  const [error, setError]         = useState<string | null>(null)
  const [form, setForm]           = useState<ReportForm>({
    email:     user?.email || '',
    frequency: 'daily',
  })

  useEffect(() => {
    loadSchedules()
  }, [])

  const loadSchedules = async () => {
    try {
      const data = await reportRepository.history() as HistoryResponse
      setSchedules(data.history || [])
      setError(null)
    } catch (err) {
      setError((err as Error).message)
    }
    setLoading(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await reportRepository.schedule(form as unknown as Record<string, unknown>)
      setShowForm(false)
      setForm({ email: user?.email || '', frequency: 'daily' })
      loadSchedules()
    } catch (err) { alert('Error: ' + (err as Error).message) }
  }

  const generateDailyReport = async () => {
    try {
      const data = await reportRepository.dailyCsv() as DailyCsvResponse
      if (data.success) {
        const link = document.createElement('a')
        const blob = new Blob([data.csv_content || ''], { type: 'text/csv' })
        link.href = URL.createObjectURL(blob)
        link.download = `agropulse-report-${new Date().toISOString().split('T')[0]}.csv`
        link.click()
      }
    } catch (err) {
      alert('Error: ' + (err as Error).message)
    }
  }

  const sendReport = async (email: string, frequency: Frequency) => {
    try {
      await reportRepository.sendEmail({ email, type: frequency })
      alert('✅ Reporte enviado correctamente')
      loadSchedules()
    } catch (err) {
      alert('Error: ' + (err as Error).message)
    }
  }

  const deleteSchedule = async (id: number) => {
    try {
      setSchedules(schedules.filter(s => s.id !== id))
    } catch (err) {
      alert('Error: ' + (err as Error).message)
    }
  }

  const frequencyLabels: Record<Frequency, string> = {
    daily:   '📅 Diariamente',
    weekly:  '📆 Semanalmente',
    monthly: '📊 Mensualmente',
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-800">📧 Reportes Automáticos</h2>
          <p className="text-sm text-gray-600 mt-1">Genera y recibe reportes por email automáticamente</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={generateDailyReport}
            className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white px-5 py-2.5 rounded-xl text-sm font-medium shadow-md hover:shadow-lg transition-all duration-200 transform hover:scale-105 flex items-center gap-2">
            📥 Generar Ahora
          </button>
          {!showForm && (
            <button
              onClick={() => setShowForm(true)}
              className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white px-5 py-2.5 rounded-xl text-sm font-medium shadow-md hover:shadow-lg transition-all duration-200 transform hover:scale-105 flex items-center gap-2">
              ➕ Agendar
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl">
          ⚠️ Error: {error}
        </div>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-md border-2 border-green-200 p-6 space-y-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-800">📧 Agendar Nuevo Reporte</h3>
            <button type="button" onClick={() => setShowForm(false)} className="text-gray-500 hover:text-gray-700 text-2xl">✕</button>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Correo electrónico</label>
            <input
              type="email"
              value={form.email}
              onChange={e => setForm({...form, email: e.target.value})}
              className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:border-green-500 focus:outline-none transition-colors"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Frecuencia</label>
            <select
              value={form.frequency}
              onChange={e => setForm({...form, frequency: e.target.value as Frequency})}
              className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:border-green-500 focus:outline-none transition-colors">
              <option value="daily">📅 Diariamente (8 AM)</option>
              <option value="weekly">📆 Semanalmente (Lunes 8 AM)</option>
              <option value="monthly">📊 Mensualmente (1º 8 AM)</option>
            </select>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white py-2.5 rounded-xl font-semibold transition-all duration-200 transform hover:scale-105">
              ✨ Agendar
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="flex-1 border-2 border-gray-300 text-gray-700 hover:bg-gray-50 py-2.5 rounded-xl font-semibold transition-colors">
              Cancelar
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-40"><div className="animate-spin text-4xl">📧</div></div>
      ) : schedules.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Mail size={48} className="mx-auto mb-3 opacity-40" />
          <p className="text-lg font-medium">No hay reportes agendados</p>
          <button
            onClick={() => setShowForm(true)}
            className="text-green-600 text-sm mt-3 hover:text-green-700 font-semibold">
            ➕ Agendar el primer reporte
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {schedules.map(schedule => (
            <div key={schedule.id}
              className="bg-white rounded-2xl shadow-sm border-2 border-gray-200 p-4 transition-all">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <p className="text-base font-bold text-gray-800">📧 {schedule.email}</p>
                  <p className="text-sm text-gray-600 mt-1">Frecuencia: {frequencyLabels[schedule.frequency] || schedule.frequency}</p>
                </div>
              </div>

              <div className="flex gap-2 pt-3 border-t border-gray-200">
                <button
                  onClick={() => sendReport(schedule.email, schedule.frequency)}
                  className="flex-1 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white py-2 rounded-lg text-sm font-semibold transition-colors">
                  📤 Enviar Ahora
                </button>
                <button
                  onClick={() => deleteSchedule(schedule.id)}
                  className="flex-1 border-2 border-red-300 text-red-600 hover:bg-red-50 py-2 rounded-lg text-sm font-semibold transition-colors">
                  🗑️ Eliminar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
