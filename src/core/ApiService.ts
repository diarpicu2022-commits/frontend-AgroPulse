// ── Base HTTP service with generic typed methods ──────────────────────────────
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080'

interface RequestOptions extends RequestInit {
  headers?: Record<string, string>
}

interface UserContext {
  id?: number
  role?: string
  adminEmail?: string
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
  const config: RequestOptions = {
    headers: {
      'Content-Type': 'application/json',
      ...(_userCtx.adminEmail ? { 'X-Admin-Email': _userCtx.adminEmail } : {}),
      ...(options.headers ?? {}),
    },
    ...options,
  }

  let res: Response
  try {
    res = await fetch(url, config as RequestInit)
  } catch {
    throw new Error(
      `No se pudo conectar con el servidor (${API_URL}). Verifica que el backend esté activo.`
    )
  }

  let data: unknown
  try {
    data = await res.json()
  } catch {
    throw new Error(`El servidor (${res.status}) devolvió una respuesta inválida en ${endpoint}`)
  }

  if (!res.ok) {
    const err = data as Record<string, string>
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
