import { useState } from 'react'
import { Bot } from 'lucide-react'
import { callAI, getGroqKey, getGitHubToken, getGemmaKey } from '../services/ai-service'

export default function AIPage() {
  const [prompt, setPrompt]     = useState('')
  const [response, setResponse] = useState(null)
  const [loading, setLoading]   = useState(false)

  const sendToAI = async (type) => {
    setLoading(true); setResponse(null)
    let promptText = ''
    switch(type) {
      case 'recommendation': promptText = 'Eres un agrónomo experto. Basándote en las condiciones actuales del invernadero, proporciona recomendaciones específicas para optimizar el cultivo. Considera temperatura, humedad y luminosidad.'; break
      case 'prediction':     promptText = 'Eres experto en invernaderos. Predice qué actuadores será necesario activar en las próximas horas y por qué. Considera las tendencias actuales de los sensores.'; break
      case 'analysis':       promptText = 'Analiza el estado completo del invernadero. Proporciona: 1) Estado general, 2) Problemas detectados, 3) Acciones recomendadas. Sé conciso y práctico.'; break
      default:               promptText = prompt
    }
    try {
      const result = await callAI(promptText, '')
      setResponse(result)
    } catch (err) {
      setResponse({ text: 'Error: ' + err.message, provider: '' })
    }
    setLoading(false)
  }

  const sendCustom = async () => {
    if (!prompt.trim()) return
    setLoading(true)
    try {
      const result = await callAI(prompt, '')
      setResponse(result)
    } catch (err) {
      setResponse({ text: 'Error: ' + err.message, provider: '' })
    }
    setLoading(false)
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-gray-800">🤖 AgroPulse IA</h2>
      <div className="flex gap-2 text-xs">
        {getGroqKey() && <span className="bg-green-100 text-green-700 px-2 py-1 rounded-full">⚡ Groq</span>}
        {getGitHubToken() && <span className="bg-green-100 text-green-700 px-2 py-1 rounded-full">🐙 GitHub</span>}
        {getGemmaKey() && <span className="bg-green-100 text-green-700 px-2 py-1 rounded-full">🧠 Gemma</span>}
        {!getGroqKey() && !getGitHubToken() && !getGemmaKey() && (
          <span className="bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full">⚠️ Sin IA configurada</span>
        )}
      </div>
      <div className="grid grid-cols-3 gap-2">
        <button onClick={() => sendToAI('recommendation')} disabled={loading} className="bg-white border border-gray-200 hover:border-green-400 hover:bg-green-50 rounded-xl p-3 text-sm font-medium text-gray-700 transition-all disabled:opacity-50">💡 Recomendación</button>
        <button onClick={() => sendToAI('prediction')} disabled={loading} className="bg-white border border-gray-200 hover:border-green-400 hover:bg-green-50 rounded-xl p-3 text-sm font-medium text-gray-700 transition-all disabled:opacity-50">🔮 Predicción</button>
        <button onClick={() => sendToAI('analysis')} disabled={loading} className="bg-white border border-gray-200 hover:border-green-400 hover:bg-green-50 rounded-xl p-3 text-sm font-medium text-gray-700 transition-all disabled:opacity-50">🔍 Análisis</button>
      </div>
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
        <textarea value={prompt} onChange={e => setPrompt(e.target.value)} placeholder="Escribe tu pregunta..." className="w-full border rounded-xl px-3 py-2 text-sm" rows={3} />
        <button onClick={sendCustom} disabled={loading || !prompt.trim()} className="mt-2 w-full bg-green-600 text-white py-2 rounded-xl font-medium disabled:opacity-50">
          {loading ? 'Consultando...' : '🤖 Enviar'}
        </button>
      </div>
      {response && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Bot size={16} className="text-green-600" />
              <span className="text-sm font-semibold text-gray-700">Respuesta</span>
            </div>
            {response.provider && <span className="text-xs bg-green-100 text-green-700 px-2.5 py-1 rounded-full font-medium">✨ {response.provider}</span>}
          </div>
          <p className="text-sm text-gray-700 whitespace-pre-wrap">{response.text}</p>
        </div>
      )}
    </div>
  )
}
