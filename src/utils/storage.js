export function safeGet(key, fallback = null) {
  try {
    const v = localStorage.getItem(key)
    return v !== null ? JSON.parse(v) : fallback
  } catch {
    return fallback
  }
}

export function safeSet(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {}
}

export function safeRemove(key) {
  try {
    localStorage.removeItem(key)
  } catch {}
}
