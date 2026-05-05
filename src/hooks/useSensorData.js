import { useState, useEffect } from 'react'
import api from '../services/api'

export function useSensorData(intervalMs = 5000) {
  const [readings, setReadings] = useState([])
  const [error, setError]       = useState(null)
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    let cancelled = false

    async function fetchReadings() {
      try {
        const data = await api.readings.list(null, 200)
        if (!cancelled) {
          setReadings(data.readings || [])
          setError(null)
        }
      } catch (e) {
        if (!cancelled) setError(e.message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchReadings()
    const id = setInterval(fetchReadings, intervalMs)
    return () => { cancelled = true; clearInterval(id) }
  }, [intervalMs])

  return { readings, error, loading }
}
