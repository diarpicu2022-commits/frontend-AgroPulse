import { useState, useRef, useEffect } from 'react'
import { Bot, Send, Sparkles, Lightbulb, TrendingUp, Search, Zap } from 'lucide-react'
import anime from 'animejs'
import { callAI, getGroqKey, getGitHubToken, getGemmaKey } from '../services/ai-service'
import type { AIResult } from '../services/ai-service'

type AIPromptType = 'recommendation' | 'prediction' | 'analysis' | 'custom'

const QUICK_ACTIONS: { type: AIPromptType; label: string; icon: typeof Lightbulb; prompt: string }[] = [
  { type: 'recommendation', label: 'Recomendación', icon: Lightbulb,   prompt: 'Eres un agrónomo experto. Basándote en las condiciones actuales del invernadero, proporciona recomendaciones específicas para optimizar el cultivo. Considera temperatura, humedad y luminosidad.' },
  { type: 'prediction',     label: 'Predicción',    icon: TrendingUp,  prompt: 'Eres experto en invernaderos. Predice qué actuadores será necesario activar en las próximas horas y por qué. Considera las tendencias actuales de los sensores.' },
  { type: 'analysis',       label: 'Análisis',      icon: Search,      prompt: 'Analiza el estado completo del invernadero. Proporciona: 1) Estado general, 2) Problemas detectados, 3) Acciones recomendadas. Sé conciso y práctico.' },
]

export default function AIPage() {
  const [prompt,    setPrompt]   = useState('')
  const [response,  setResponse] = useState<AIResult | null>(null)
  const [loading,   setLoading]  = useState(false)
  const responseRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!responseRef.current || !response) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced) return
    anime({ targets: responseRef.current, opacity: [0, 1], translateY: [10, 0], duration: 320, easing: 'easeOutCubic' })
  }, [response])

  const sendToAI = async (type: AIPromptType) => {
    const action = QUICK_ACTIONS.find(a => a.type === type)
    const text   = type === 'custom' ? prompt : (action?.prompt ?? prompt)
    if (!text.trim()) return
    setLoading(true); setResponse(null)
    try {
      const result = await callAI(text, '')
      setResponse(result)
    } catch (err) {
      setResponse({ text: 'Error: ' + (err as Error).message, provider: '' })
    }
    setLoading(false)
  }

  const groqActive   = getGroqKey()
  const githubActive = getGitHubToken()
  const gemmaActive  = getGemmaKey()
  const hasAI        = groqActive || githubActive || gemmaActive

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h2 className="section-title">IA Agronómica</h2>
        <p className="section-subtitle">Consulta inteligente para optimizar tu invernadero</p>
      </div>

      {/* AI status chips */}
      <div className="flex flex-wrap gap-2">
        {groqActive   && <span className="badge-green"><Zap size={10} />Groq activa</span>}
        {githubActive && <span className="badge-green"><Sparkles size={10} />GitHub AI activa</span>}
        {gemmaActive  && <span className="badge-green"><Bot size={10} />Gemma activa</span>}
        {!hasAI && <span className="badge-yellow">Sin IA configurada — ve a Configuración</span>}
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-3 gap-3">
        {QUICK_ACTIONS.map(({ type, label, icon: Icon }) => (
          <button key={type} onClick={() => sendToAI(type)} disabled={loading}
            className="card-hover p-4 flex flex-col items-center gap-2 text-sm font-medium text-gray-700 disabled:opacity-50 disabled:pointer-events-none">
            <div className="p-2.5 bg-green-100 rounded-2xl">
              <Icon size={16} className="text-green-600" />
            </div>
            <span>{label}</span>
          </button>
        ))}
      </div>

      {/* Custom prompt */}
      <div className="card p-5">
        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Pregunta personalizada</label>
        <textarea
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          placeholder="Escribe tu pregunta sobre el invernadero..."
          className="input-field resize-none"
          rows={3}
        />
        <button
          onClick={() => sendToAI('custom')}
          disabled={loading || !prompt.trim()}
          className="mt-3 w-full btn-primary py-2.5 text-sm">
          {loading
            ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Consultando...</>
            : <><Send size={14} /> Enviar a la IA</>
          }
        </button>
      </div>

      {/* Response */}
      {response && (
        <div ref={responseRef} className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-green-100 rounded-xl">
                <Bot size={15} className="text-green-600" />
              </div>
              <span className="text-sm font-semibold text-gray-800">Respuesta</span>
            </div>
            {response.provider && <span className="badge-green"><Sparkles size={10} />{response.provider}</span>}
          </div>
          <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
            <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{response.text}</p>
          </div>
        </div>
      )}
    </div>
  )
}
