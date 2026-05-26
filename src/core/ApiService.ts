// ── Base HTTP service with generic typed methods ──────────────────────────────
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080'

const TOKEN_KEY = 'agropulse_jwt'

export function saveToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token)
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY)
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY)
}

interface RequestOptions extends RequestInit {
  headers?: Record<string, string>
}

interface UserContext {
  id?: number
  role?: string
}

let _userCtx: UserContext = {}

export function setUserContext(ctx: UserContext): void {
  _userCtx = ctx
}

export function getUserContext(): UserContext {
  return _userCtx
}

async function request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const url = `${API_URL}${endpoint}`
  const { headers: optHeaders, ...restOptions } = options
  const token = getToken()
  const config: RequestOptions = {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      ...(optHeaders ?? {}),
    },
    ...restOptions,
  }

  let res: Response
  try {
    res = await fetch(url, config as RequestInit)
  } catch {
    throw new Error(
      `No se pudo conectar con el servidor (${API_URL}). Verifica que el backend esté activo.`
    )
  }

  // Try to parse JSON body; silently ignore empty body (204, or 200 with no body)
  let data: unknown = null
  if (res.status !== 204) {
    try { data = await res.json() } catch { /* empty/non-JSON body — ok for void endpoints */ }
  }

  if (!res.ok) {
    const err = (data ?? {}) as Record<string, string>
    throw new Error(err.error || err.message || `Error ${res.status} en ${endpoint}`)
  }
  return data as T
}

// ── Base Repository ───────────────────────────────────────────────────────────
export abstract class BaseRepository {
  protected get<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    return request<T>(endpoint, { method: 'GET', ...options })
  }

  protected post<T>(endpoint: string, body: unknown, options?: RequestOptions): Promise<T> {
    return request<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(body),
      ...options,
    })
  }

  protected put<T>(endpoint: string, body: unknown, options?: RequestOptions): Promise<T> {
    return request<T>(endpoint, {
      method: 'PUT',
      body: JSON.stringify(body),
      ...options,
    })
  }

  protected patch<T>(endpoint: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return request<T>(endpoint, {
      method: 'PATCH',
      body: body !== undefined ? JSON.stringify(body) : undefined,
      ...options,
    })
  }

  protected delete<T>(endpoint: string, options?: RequestOptions): Promise<T> {
    return request<T>(endpoint, { method: 'DELETE', ...options })
  }
}
