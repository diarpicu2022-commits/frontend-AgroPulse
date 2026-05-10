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

export interface AIResult {
  text: string
  provider: string
}

export async function callAI(prompt: string, sensorContext = ''): Promise<AIResult> {
  const systemPrompt = `Eres un experto agrónomo e ingeniero de invernaderos. Tu nombre es AgroPulse IA.
Respondes en español, de forma concisa y práctica.
Siempre das recomendaciones basadas en datos reales de sensores cuando están disponibles.
${sensorContext ? `\nDatos actuales del invernadero:\n${sensorContext}` : ''}`

  const groqKey = getGroqKey()
  if (groqKey) {
    try {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${groqKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'llama-3.1-8b-instant',
          messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: prompt }],
          max_tokens: 600,
        }),
      })
      const data = await res.json() as { choices?: { message: { content: string } }[] }
      if (data.choices?.[0]) return { text: data.choices[0].message.content, provider: 'Groq · LLaMA 3.1' }
    } catch (err) { console.error('Groq error:', err) }
  }

  const githubToken = getGitHubToken()
  if (githubToken) {
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
          model: 'openai/gpt-4o-mini',
          messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: prompt }],
          max_tokens: 600,
        }),
      })
      const data = await res.json() as { choices?: { message: { content: string } }[] }
      if (data.choices?.[0]) return { text: data.choices[0].message.content, provider: 'GitHub · GPT-4o mini' }
    } catch (err) { console.error('GitHub error:', err) }
  }

  const gemmaKey = getGemmaKey()
  if (gemmaKey) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/openai/chat/completions?key=${gemmaKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'gemma-4-31b-it',
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
      if (data.choices?.[0]) return { text: data.choices[0].message.content, provider: 'Google · Gemma 4' }
      if (data.error) console.error('Gemma error:', data.error.message)
    } catch (err) { console.error('Gemma error:', err) }
  }

  return {
    text: '⚠️ No hay servicio de IA disponible. Configura Groq, GitHub o Gemma en Configuración.',
    provider: '',
  }
}
