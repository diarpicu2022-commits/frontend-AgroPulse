import { useState } from 'react'
import { Cpu } from 'lucide-react'
import { callAI } from '../services/ai-service'

export default function MLPage() {
  const [prediction, setPrediction] = useState(null)
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState(null)

  const predict = async () => {
    setLoading(true); setPrediction(null); setError(null)
    const prompt = `Basándote en el historial reciente de sensores del invernadero, predice los valores de cada sensor para las próximas 6 horas (en intervalos de 1 hora).

Presenta los resultados en un formato claro con:
- Hora estimada
- Valores predichos para cada sensor
- Tendencia (subiendo, bajando, estable)
- Acciones recomendadas si algún valor saldrá de rango

Sé conciso y práctico.`
    try {
      const result = await callAI(prompt, '')
      setPrediction(result)
    } catch (err) {
      setError(err.message)
    }
    setLoading(false)
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-gray-800">📈 ML — Predicciones</h2>
      <div className="text-xs px-3 py-2 rounded-xl bg-green-50 text-green-700">
        <Cpu size={14} className="inline mr-1" /> Predicciones de Machine Learning
      </div>
      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">⚠️ {error}</div>}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
        <p className="text-sm text-gray-600 mb-3">Utiliza inteligencia artificial para predecir los valores futuros de los sensores.</p>
        <button onClick={predict} disabled={loading} className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-xl text-sm font-medium disabled:opacity-50">
          {loading ? 'Calculando...' : '🔮 Predecir próximas 6 horas'}
        </button>
      </div>
      {prediction && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-gray-700">📊 Predicción</span>
            {prediction.provider && <span className="text-xs bg-blue-100 text-blue-700 px-2.5 py-1 rounded-full font-medium">✨ {prediction.provider}</span>}
          </div>
          <p className="text-sm text-gray-700 whitespace-pre-wrap">{prediction.text}</p>
        </div>
      )}
    </div>
  )
}
