// ── API Client (converted from api-client.ts) ────────────────────────────────
const API_URL = import.meta.env.VITE_API_URL || 'https://agropulse-versions-production.up.railway.app'

// User context store for custom headers (updated from AuthContext)
let _userCtx = {}
export const setUserContext = (ctx) => {
  _userCtx = ctx
}

async function request(endpoint, options = {}) {
  const url = `${API_URL}${endpoint}`
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...(_userCtx.id         ? { 'X-User-Id': String(_userCtx.id) }       : {}),
      ...(_userCtx.role       ? { 'X-User-Role': _userCtx.role }            : {}),
      ...(_userCtx.adminEmail ? { 'X-Admin-Email': _userCtx.adminEmail }    : {}),
      ...options.headers,
    },
    ...options,
  }

  try {
    const res  = await fetch(url, config)
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Error en la petición')
    return data
  } catch (error) {
    console.error('API Error:', error)
    throw error
  }
}

// Auth
const auth = {
  login: (username, password) =>
    request('/api/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) }),

  googleLogin: (email, name, googleId) =>
    request('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, name, googleId }) }),

  register: (username, password, fullName) =>
    request('/api/auth/register', { method: 'POST', body: JSON.stringify({ username, password, fullName }) }),

  me: () => request('/api/auth/me'),
}

// Sensors
const sensors = {
  list:   ()         => request('/api/sensors'),
  get:    (id)       => request(`/api/sensors/${id}`),
  create: (data)     => request('/api/sensors',         { method: 'POST',   body: JSON.stringify(data) }),
  update: (id, data) => request(`/api/sensors/${id}`,   { method: 'PUT',    body: JSON.stringify(data) }),
  delete: (id)       => request(`/api/sensors/${id}`,   { method: 'DELETE' }),
}

// Crops
const crops = {
  list:   ()         => request('/api/crops'),
  get:    (id)       => request(`/api/crops/${id}`),
  create: (data)     => request('/api/crops',           { method: 'POST',   body: JSON.stringify(data) }),
  update: (id, data) => request(`/api/crops/${id}`,     { method: 'PUT',    body: JSON.stringify(data) }),
  delete: (id)       => request(`/api/crops/${id}`,     { method: 'DELETE' }),
}

// Greenhouses
const greenhouses = {
  list:       ()           => request('/api/greenhouses'),
  get:        (id)         => request(`/api/greenhouses/${id}`),
  create:     (data)       => request('/api/greenhouses',                   { method: 'POST',   body: JSON.stringify(data) }),
  update:     (id, data)   => request(`/api/greenhouses/${id}`,             { method: 'PUT',    body: JSON.stringify(data) }),
  delete:     (id)         => request(`/api/greenhouses/${id}`,             { method: 'DELETE' }),
  listUsers:  (id)         => request(`/api/greenhouses/${id}/users`),
  assignUser: (id, userId) => request(`/api/greenhouses/${id}/users`,       { method: 'POST',   body: JSON.stringify({ userId }) }),
  removeUser: (id, userId) => request(`/api/greenhouses/${id}/users/${userId}`, { method: 'DELETE' }),
}

// Actuators
const actuators = {
  list:   ()         => request('/api/actuators'),
  get:    (id)       => request(`/api/actuators/${id}`),
  create: (data)     => request('/api/actuators',       { method: 'POST',   body: JSON.stringify(data) }),
  update: (id, data) => request(`/api/actuators/${id}`, { method: 'PUT',    body: JSON.stringify(data) }),
  delete: (id)       => request(`/api/actuators/${id}`, { method: 'DELETE' }),
}

// Users (admin)
const users = {
  list:   ()         => request('/api/users'),
  create: (data)     => request('/api/users',           { method: 'POST',   body: JSON.stringify(data) }),
  update: (id, data) => request(`/api/users/${id}`,     { method: 'PUT',    body: JSON.stringify(data) }),
  delete: (id)       => request(`/api/users/${id}`,     { method: 'DELETE' }),
}

// Readings
const readings = {
  list: (sensorId = null, limit = 100) => {
    if (!sensorId) return request(`/api/readings?limit=${limit}`)
    return request(`/api/readings?sensor=${sensorId}&limit=${limit}`)
  },
  create: (data) => request('/api/readings', { method: 'POST', body: JSON.stringify(data) }),
}

// Alerts
const alerts = {
  list:     ()     => request('/api/alerts'),
  create:   (data) => request('/api/alerts',             { method: 'POST',   body: JSON.stringify(data) }),
  markRead: (id)   => request(`/api/alerts/${id}/read`,  { method: 'PUT' }),
  delete:   (id)   => request(`/api/alerts/${id}`,       { method: 'DELETE' }),
}

// Logs
const logs = {
  list: (limit = 100) => request(`/api/logs?limit=${limit}`),
}

// Automation Rules
const rules = {
  list:   ()         => request('/api/rules'),
  create: (data)     => request('/api/rules',            { method: 'POST',   body: JSON.stringify(data) }),
  update: (id, data) => request(`/api/rules/${id}`,      { method: 'PUT',    body: JSON.stringify(data) }),
  delete: (id)       => request(`/api/rules/${id}`,      { method: 'DELETE' }),
}

// Reports
const reports = {
  dailyCsv:    ()           => request('/api/reports/daily-csv'),
  weeklyStats: ()           => request('/api/reports/weekly-stats'),
  sendEmail:   (data)       => request('/api/reports/send-email', { method: 'POST', body: JSON.stringify(data) }),
  schedule:    (data)       => request('/api/reports/schedule',   { method: 'POST', body: JSON.stringify(data) }),
  history:     (limit = 10) => request(`/api/reports/history?limit=${limit}`),
}

// Support Tickets
const tickets = {
  list:   ()         => request('/api/tickets'),
  get:    (id)       => request(`/api/tickets/${id}`),
  create: (data)     => request('/api/tickets',          { method: 'POST',   body: JSON.stringify(data) }),
  update: (id, data) => request(`/api/tickets/${id}`,    { method: 'PUT',    body: JSON.stringify(data) }),
  delete: (id)       => request(`/api/tickets/${id}`,    { method: 'DELETE' }),
}

const api = { auth, sensors, crops, greenhouses, actuators, users, readings, alerts, logs, rules, reports, tickets }
export default api
