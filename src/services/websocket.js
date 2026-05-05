// ── WebSocket & EventSource Service (converted from websocket.ts) ───────────

class WebSocketService {
  constructor() {
    this.ws = null
    this.listeners = {}
    this.reconnectAttempts = 0
    this.maxReconnectAttempts = 5
    this.reconnectDelay = 1000
  }

  connect(url) {
    try {
      this.ws = new WebSocket(url)

      this.ws.onopen = () => {
        this.reconnectAttempts = 0
        this.emit('connected', {})
      }

      this.ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data)
          this.emit(message.type, message.data)
        } catch (err) {
          console.error('WebSocket message parse error:', err)
        }
      }

      this.ws.onclose = () => {
        this.emit('disconnected', {})
        this._attemptReconnect(url)
      }

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error)
        this.emit('error', error)
      }
    } catch (err) {
      console.error('WebSocket connection error:', err)
      this.emit('fallback_to_polling', {})
    }
  }

  _attemptReconnect(url) {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.emit('fallback_to_polling', {})
      return
    }
    this.reconnectAttempts++
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1)
    setTimeout(() => this.connect(url), delay)
  }

  send(type, data) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type, data, timestamp: new Date().toISOString() }))
    }
  }

  on(event, handler) {
    if (!this.listeners[event]) this.listeners[event] = []
    this.listeners[event].push(handler)
  }

  off(event, handler) {
    if (!this.listeners[event]) return
    this.listeners[event] = this.listeners[event].filter(h => h !== handler)
  }

  emit(event, data) {
    if (!this.listeners[event]) return
    this.listeners[event].forEach(handler => {
      try { handler(data) } catch (err) { console.error('WebSocket handler error:', err) }
    })
  }

  isConnected() {
    return this.ws && this.ws.readyState === WebSocket.OPEN
  }

  disconnect() {
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
  }
}

class EventSourceService {
  constructor() {
    this.es = null
    this.listeners = {}
  }

  connect(url) {
    try {
      this.es = new EventSource(url)

      this.es.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data)
          this.emit(message.type, message.data)
        } catch (err) {
          console.error('EventSource message parse error:', err)
        }
      }

      this.es.onerror = (error) => {
        console.error('EventSource error:', error)
        this.emit('error', error)
      }
    } catch (err) {
      console.error('EventSource connection error:', err)
    }
  }

  on(event, handler) {
    if (!this.listeners[event]) this.listeners[event] = []
    this.listeners[event].push(handler)
  }

  off(event, handler) {
    if (!this.listeners[event]) return
    this.listeners[event] = this.listeners[event].filter(h => h !== handler)
  }

  emit(event, data) {
    if (!this.listeners[event]) return
    this.listeners[event].forEach(handler => {
      try { handler(data) } catch (err) { console.error('EventSource handler error:', err) }
    })
  }

  isConnected() {
    return this.es && this.es.readyState === EventSource.OPEN
  }

  disconnect() {
    if (this.es) {
      this.es.close()
      this.es = null
    }
  }
}

export const websocket = new WebSocketService()
export const eventSource = new EventSourceService()
