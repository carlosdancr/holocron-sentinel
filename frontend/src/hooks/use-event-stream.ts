'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { API_BASE_URL, SSE_BUFFER_LIMIT } from '@/lib/constants'
import type { StreamEventData } from '@/lib/types'

export type StreamStatus = 'connected' | 'paused' | 'reconnecting' | 'disconnected'

interface StreamEvent extends StreamEventData {
  /** Flag temporaria para animacao de "novo evento" */
  __new?: boolean
}

export function useEventStream() {
  const [events, setEvents] = useState<StreamEvent[]>([])
  const [status, setStatus] = useState<StreamStatus>('disconnected')
  const [paused, setPaused] = useState(false)

  const esRef = useRef<EventSource | null>(null)
  const retryRef = useRef(1000) // backoff inicial: 1s
  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const connect = useCallback(() => {
    // Limpa conexao anterior se existir
    if (esRef.current) {
      esRef.current.close()
      esRef.current = null
    }

    const es = new EventSource(`${API_BASE_URL}/events/stream`)
    esRef.current = es

    es.onopen = () => {
      setStatus('connected')
      retryRef.current = 1000 // Reset backoff ao conectar
    }

    es.onmessage = (msg) => {
      try {
        const data: StreamEventData = JSON.parse(msg.data)

        setEvents((prev) => {
          // Deduplicacao por event.id
          if (prev.some((e) => e.event.id === data.event.id)) return prev

          // Marca como novo para animacao
          const newEvent: StreamEvent = { ...data, __new: true }

          // Prepend + cap no limite do buffer
          const updated = [newEvent, ...prev].slice(0, SSE_BUFFER_LIMIT)
          return updated
        })

        // Remove a flag __new apos a animacao (1.7s)
        setTimeout(() => {
          setEvents((prev) =>
            prev.map((e) =>
              e.event.id === data.event.id ? { ...e, __new: false } : e,
            ),
          )
        }, 1700)
      } catch {
        // Ignora mensagens que nao sao JSON (heartbeats etc)
      }
    }

    es.onerror = () => {
      es.close()
      esRef.current = null
      setStatus('reconnecting')

      // Backoff exponencial: 1s → 2s → 4s → 8s → ... max 30s
      const delay = retryRef.current
      retryRef.current = Math.min(delay * 2, 30_000)

      retryTimeoutRef.current = setTimeout(() => {
        connect()
      }, delay)
    }
  }, [])

  const disconnect = useCallback(() => {
    if (esRef.current) {
      esRef.current.close()
      esRef.current = null
    }
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current)
      retryTimeoutRef.current = null
    }
    setStatus('disconnected')
  }, [])

  // Conectar ao montar, desconectar ao desmontar
  useEffect(() => {
    if (!paused) {
      connect()
    }

    return () => {
      disconnect()
    }
  }, [paused, connect, disconnect])

  const pause = useCallback(() => {
    setPaused(true)
    disconnect()
    setStatus('paused')
  }, [disconnect])

  const resume = useCallback(() => {
    setPaused(false)
    // O useEffect reagira a mudanca do paused e reconectara
  }, [])

  const clear = useCallback(() => {
    setEvents([])
  }, [])

  return {
    events,
    status,
    paused,
    pause,
    resume,
    clear,
  }
}
