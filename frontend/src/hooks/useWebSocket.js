import { useState, useEffect, useRef, useCallback } from 'react'
import { useToast } from '../context/ToastContext.jsx'

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8000'

export function useWebSocket(greenhouseId) {
  const [sensorData, setSensorData] = useState(null)
  const [newAlerts, setNewAlerts] = useState([])
  const [connected, setConnected] = useState(false)
  const { addToast } = useToast()
  const wsRef = useRef(null)
  const reconnectTimerRef = useRef(null)
  const mountedRef = useRef(true)

  const clearAlerts = useCallback(() => {
    setNewAlerts([])
  }, [])

  const connect = useCallback(() => {
    if (!greenhouseId) return
    const token = localStorage.getItem('greenhouse_token')
    if (!token) return

    const url = `${WS_URL}/ws/greenhouse/${greenhouseId}?token=${token}`

    try {
      const ws = new WebSocket(url)
      wsRef.current = ws

      ws.onopen = () => {
        if (mountedRef.current) {
          setConnected(true)
        }
      }

      ws.onmessage = (event) => {
        if (!mountedRef.current) return
        try {
          const msg = JSON.parse(event.data)
          if (msg.event === 'sensor') {
            setSensorData(msg.data)
          } else if (msg.event === 'alert') {
            setNewAlerts(prev => [msg.data, ...prev])
            addToast(`Алерт: ${msg.data.message || 'Нове сповіщення'}`, 'warning')
          }
        } catch {
          // ignore parse errors
        }
      }

      ws.onerror = () => {
        if (mountedRef.current) {
          setConnected(false)
        }
      }

      ws.onclose = () => {
        if (mountedRef.current) {
          setConnected(false)
          reconnectTimerRef.current = setTimeout(() => {
            if (mountedRef.current) {
              connect()
            }
          }, 3000)
        }
      }
    } catch {
      // WebSocket construction failed
    }
  }, [greenhouseId, addToast])

  useEffect(() => {
    mountedRef.current = true
    connect()

    return () => {
      mountedRef.current = false
      clearTimeout(reconnectTimerRef.current)
      if (wsRef.current) {
        wsRef.current.onclose = null
        wsRef.current.close()
      }
    }
  }, [connect])

  return { sensorData, newAlerts, connected, clearAlerts }
}
