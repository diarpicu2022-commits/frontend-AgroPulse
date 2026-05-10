import { useState, useRef, useEffect } from 'react'
import { Cpu, TrendingUp, Sparkles } from 'lucide-react'
import anime from 'animejs'
import { callAI } from '../services/ai-service'
import type { AIResult } from '../services/ai-service'

export default function MLPage() {
  const [prediction, setPrediction] = useState<AIResult | null>(null)
  const [loading,    setLoading]    = useState(false)
  const [error,      setError]      = useState<string | null>(null)
  const resultRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!resultRef.current || !prediction) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced) return
    anime({ targets: resultRef.current, opacity: [0, 1], translateY: [12, 0], duration: 340, easing: 'easeOutCubic' })
  }, [prediction])

  const predict = async () => {
    setLoading(true); setPrediction(null); setError(null)
    const prompt = `Basándote en el historial reciente de sensores del invernadero, predice los valores de cada sensor para las próximas 6 horas (en intervalos de 1 hora).

Presenta los resultados con:
- Hora estimada
- Valores predichos para cada sensor
- Tendencia (subiendo, bajando, estable)
- Acciones recomendadas si algún valor saldrá de rango

Sé conciso y práctico.`
    try {
      const result = await callAI(prompt, '')
      setPrediction(result)
    } catch (err) { setError((err as Error).message) }
    setLoading(false)
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h2 className="section-title">Machine Learning</h2>
        <p className="section-subtitle">Predicciones de sensores con inteligencia artificial</p>
      </div>

      {/* Info chip */}
      <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-2xl px-4 py-2.5 w-fit">
        <Cpu size={14} className="text-green-600" />
        <span className="text-sm font-medium text-green-700">Predicción basada en histórico de sensores</span>
      </div>

      {error && <div className="alert-danger text-sm">{error}</div>}

      {/* Action card */}
      <div className="card p-5">
        <div className="flex items-start gap-4 mb-5">
          <div className="p-3 bg-green-100 rounded-2xl shrink-0">
            <TrendingUp size={20} className="text-green-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-800">Predicción a 6 horas</h3>
            <p className="text-sm text-gray-500 mt-0.5">
              Analiza las tendencias actuales de los sensores y predice los valores futuros con recomendaciones de acción.
            </p>
          </div>
        </div>
        <button onClick={predict} disabled={loading} className="w-full btn-primary py-3 text-sm">
          {loading
            ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Calculando predicción...</>
            : <><TrendingUp size={15} /> Predecir próximas 6 horas</>
          }
        </button>
      </div>

      {/* Result */}
      {prediction && (
        <div ref={resultRef} className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-blue-100 rounded-xl">
                <Cpu size={15} className="text-blue-600" />
              </div>
              <span className="text-sm font-semibold text-gray-800">Predicción generada</span>
            </div>
            {prediction.provider && <span className="badge-blue"><Sparkles size={10} />{prediction.provider}</span>}
          </div>
          <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
            <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{prediction.text}</p>
          </div>
        </div>
      )}
    </div>
  )
}
