// ── AI Service — Groq, GitHub Models, Google Gemma ───────────────────────────
const safeGet = (key: string): string => {
  try { return localStorage.getItem(key) ?? '' } catch { return '' }
}

export const getGroqKey = (): string =>
  safeGet('agropulse_groq_key') || (import.meta.env.VITE_GROQ_KEY as string) || ''

export const getGitHubToken = (): string =>
  safeGet('agropulse_github_token') || (import.meta.env.VITE_GITHUB_TOKEN as string) || ''

export const getGemmaKey = (): string =>
  safeGet('agropulse_gemma_key') || (import.meta.env.VITE_GEMMA_KEY as string) || ''

export const getPreferredProvider = (): string => safeGet('agropulse_ai_provider')
export const getPreferredModel    = (): string => safeGet('agropulse_ai_model')

export interface AIResult {
  text: string
  provider: string
}

// Map user-visible GitHub model names to their API identifiers
const GITHUB_MODEL_MAP: Record<string, string> = {
  'gpt-4o-mini':                 'openai/gpt-4o-mini',
  'gpt-4o':                      'openai/gpt-4o',
  'Phi-3.5-mini-instruct':       'microsoft/Phi-3.5-mini-instruct',
  'Meta-Llama-3.1-8B-Instruct':  'meta/Meta-Llama-3.1-8B-Instruct',
}

function resolveGithubModel(m: string): string {
  if (m.includes('/')) return m
  return GITHUB_MODEL_MAP[m] ?? `openai/${m}`
}

export async function callAI(prompt: string, sensorContext = ''): Promise<AIResult> {
  const systemPrompt = `Eres un experto agrónomo e ingeniero de invernaderos. Tu nombre es AgroPulse IA.
Respondes en español, de forma concisa y práctica.
Siempre das recomendaciones basadas en datos reales de sensores cuando están disponibles.
${sensorContext ? `\nDatos actuales del invernadero:\n${sensorContext}` : ''}`

  const preferredProvider = getPreferredProvider()
  const preferredModel    = getPreferredModel()

  const tryGroq = async (): Promise<AIResult | null> => {
    const groqKey = getGroqKey()
    if (!groqKey) return null
    const model = preferredProvider === 'groq' && preferredModel
      ? preferredModel
      : 'llama3-8b-8192'
    try {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${groqKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: prompt }],
          max_tokens: 600,
        }),
      })
      const data = await res.json() as { choices?: { message: { content: string } }[] }
      if (data.choices?.[0]) return { text: data.choices[0].message.content, provider: `Groq · ${model}` }
    } catch (err) { console.error('Groq error:', err) }
    return null
  }

  const tryGitHub = async (): Promise<AIResult | null> => {
    const githubToken = getGitHubToken()
    if (!githubToken) return null
    const rawModel = preferredProvider === 'github' && preferredModel
      ? preferredModel
      : 'gpt-4o-mini'
    const model = resolveGithubModel(rawModel)
    try {
      const res = await fetch('https://models.github.ai/inference/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${githubToken}`,
          'Content-Type': 'application/json',
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
        },
        body: JSON.stringify({
          model,
          messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: prompt }],
          max_tokens: 600,
        }),
      })
      const data = await res.json() as { choices?: { message: { content: string } }[] }
      if (data.choices?.[0]) return { text: data.choices[0].message.content, provider: `GitHub · ${rawModel}` }
    } catch (err) { console.error('GitHub error:', err) }
    return null
  }

  const tryGemma = async (): Promise<AIResult | null> => {
    const gemmaKey = getGemmaKey()
    if (!gemmaKey) return null
    const model = preferredProvider === 'gemma' && preferredModel ? preferredModel : 'gemma-4-31b-it'
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/openai/chat/completions?key=${gemmaKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model,
            messages: [{ role: 'user', content: `${systemPrompt}\n\nPregunta: ${prompt}` }],
            max_tokens: 600,
            temperature: 0.7,
          }),
        }
      )
      const data = await res.json() as {
        choices?: { message: { content: string } }[]
        error?: { message: string }
      }
      if (data.choices?.[0]) return { text: data.choices[0].message.content, provider: `Google · ${model}` }
      if (data.error) console.error('Gemma error:', data.error.message)
    } catch (err) { console.error('Gemma error:', err) }
    return null
  }

  // If a preferred provider is set, try it first
  if (preferredProvider === 'groq') {
    const r = await tryGroq(); if (r) return r
  } else if (preferredProvider === 'github') {
    const r = await tryGitHub(); if (r) return r
  } else if (preferredProvider === 'gemma') {
    const r = await tryGemma(); if (r) return r
  }

  // Fallback cascade: Groq → GitHub → Gemma
  const groqResult = await tryGroq()
  if (groqResult) return groqResult

  const githubResult = await tryGitHub()
  if (githubResult) return githubResult

  const gemmaResult = await tryGemma()
  if (gemmaResult) return gemmaResult

  return {
    text: '⚠️ No hay servicio de IA disponible. Configura Groq, GitHub o Gemma en Configuración.',
    provider: '',
  }
}
