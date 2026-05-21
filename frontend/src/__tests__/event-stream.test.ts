import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useEventStream } from '@/hooks/use-event-stream'

// ===== Mock do EventSource =====

type Listener = (event: { data: string }) => void

class MockEventSource {
  static instances: MockEventSource[] = []

  url: string
  onopen: (() => void) | null = null
  onmessage: Listener | null = null
  onerror: (() => void) | null = null
  readyState = 0

  constructor(url: string) {
    this.url = url
    MockEventSource.instances.push(this)
    // Simula conexao com sucesso no proximo tick
    setTimeout(() => {
      this.readyState = 1
      this.onopen?.()
    }, 0)
  }

  close() {
    this.readyState = 2
  }

  // Helper para simular recebimento de mensagem
  simulateMessage(data: unknown) {
    this.onmessage?.({ data: JSON.stringify(data) })
  }

  // Helper para simular erro
  simulateError() {
    this.onerror?.()
  }

  static reset() {
    MockEventSource.instances = []
  }

  static latest() {
    return MockEventSource.instances[MockEventSource.instances.length - 1]
  }
}

beforeEach(() => {
  vi.useFakeTimers()
  MockEventSource.reset()
  vi.stubGlobal('EventSource', MockEventSource)
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('useEventStream', () => {
  it('conecta automaticamente e reporta status "connected"', async () => {
    const { result } = renderHook(() => useEventStream())

    // Avanca o tick para que o onopen dispare
    await act(async () => {
      vi.advanceTimersByTime(10)
    })

    expect(result.current.status).toBe('connected')
    expect(MockEventSource.instances).toHaveLength(1)
    expect(MockEventSource.latest().url).toContain('/events/stream')
  })

  it('recebe eventos e os adiciona ao buffer', async () => {
    const { result } = renderHook(() => useEventStream())

    await act(async () => {
      vi.advanceTimersByTime(10)
    })

    const eventData = {
      event: {
        id: 'evt-1',
        entityId: 'ent-1',
        externalId: 'ext_001',
        type: 'info',
        payload: {},
        createdAt: '2026-05-21T12:00:00Z',
      },
      entitySuspended: false,
    }

    act(() => {
      MockEventSource.latest().simulateMessage(eventData)
    })

    expect(result.current.events).toHaveLength(1)
    expect(result.current.events[0].event.id).toBe('evt-1')
    expect(result.current.events[0].__new).toBe(true)
  })

  it('deduplica eventos com mesmo id', async () => {
    const { result } = renderHook(() => useEventStream())

    await act(async () => {
      vi.advanceTimersByTime(10)
    })

    const eventData = {
      event: {
        id: 'evt-dup',
        entityId: 'ent-1',
        externalId: 'ext_dup',
        type: 'critical',
        payload: {},
        createdAt: '2026-05-21T12:00:00Z',
      },
      entitySuspended: false,
    }

    act(() => {
      MockEventSource.latest().simulateMessage(eventData)
      MockEventSource.latest().simulateMessage(eventData)
      MockEventSource.latest().simulateMessage(eventData)
    })

    expect(result.current.events).toHaveLength(1)
  })

  it('limita o buffer a SSE_BUFFER_LIMIT (100)', async () => {
    const { result } = renderHook(() => useEventStream())

    await act(async () => {
      vi.advanceTimersByTime(10)
    })

    act(() => {
      for (let i = 0; i < 120; i++) {
        MockEventSource.latest().simulateMessage({
          event: {
            id: `evt-${i}`,
            entityId: 'ent-1',
            externalId: `ext_${i}`,
            type: 'info',
            payload: {},
            createdAt: '2026-05-21T12:00:00Z',
          },
          entitySuspended: false,
        })
      }
    })

    expect(result.current.events.length).toBeLessThanOrEqual(100)
  })

  it('pausa fecha a conexao e altera status para "paused"', async () => {
    const { result } = renderHook(() => useEventStream())

    await act(async () => {
      vi.advanceTimersByTime(10)
    })

    expect(result.current.status).toBe('connected')

    act(() => {
      result.current.pause()
    })

    expect(result.current.status).toBe('paused')
    expect(result.current.paused).toBe(true)
    expect(MockEventSource.latest().readyState).toBe(2) // closed
  })

  it('resume reconecta apos pausa', async () => {
    const { result } = renderHook(() => useEventStream())

    await act(async () => {
      vi.advanceTimersByTime(10)
    })

    act(() => {
      result.current.pause()
    })

    const instancesBeforeResume = MockEventSource.instances.length

    act(() => {
      result.current.resume()
    })

    // Avanca para que o novo useEffect execute e o onopen dispare
    await act(async () => {
      vi.advanceTimersByTime(10)
    })

    expect(MockEventSource.instances.length).toBeGreaterThan(instancesBeforeResume)
    expect(result.current.status).toBe('connected')
  })

  it('clear limpa o buffer de eventos', async () => {
    const { result } = renderHook(() => useEventStream())

    await act(async () => {
      vi.advanceTimersByTime(10)
    })

    act(() => {
      MockEventSource.latest().simulateMessage({
        event: {
          id: 'evt-clr',
          entityId: 'ent-1',
          externalId: 'ext_clr',
          type: 'warning',
          payload: {},
          createdAt: '2026-05-21T12:00:00Z',
        },
        entitySuspended: false,
      })
    })

    expect(result.current.events).toHaveLength(1)

    act(() => {
      result.current.clear()
    })

    expect(result.current.events).toHaveLength(0)
  })

  it('reconecta com backoff exponencial apos erros consecutivos', async () => {
    // Desabilita auto-connect no construtor para controlar manualmente
    const OriginalMock = MockEventSource
    class FailingEventSource extends OriginalMock {
      constructor(url: string) {
        super(url)
        // Nao chama onopen automaticamente — simula falha imediata
      }
    }
    vi.stubGlobal('EventSource', FailingEventSource)

    const { result } = renderHook(() => useEventStream())

    // Primeiro connect acontece — simula erro imediato (sem onopen)
    await act(async () => {
      vi.advanceTimersByTime(1)
    })

    act(() => {
      MockEventSource.latest().simulateError()
    })

    expect(result.current.status).toBe('reconnecting')
    const instancesAfterFirstError = MockEventSource.instances.length

    // Retry 1: 1000ms
    await act(async () => {
      vi.advanceTimersByTime(999)
    })
    expect(MockEventSource.instances.length).toBe(instancesAfterFirstError)

    await act(async () => {
      vi.advanceTimersByTime(1)
    })
    expect(MockEventSource.instances.length).toBe(instancesAfterFirstError + 1)

    // Simula segundo erro — backoff deve ser 2000ms
    act(() => {
      MockEventSource.latest().simulateError()
    })

    const instancesAfterSecondError = MockEventSource.instances.length

    await act(async () => {
      vi.advanceTimersByTime(1999)
    })
    expect(MockEventSource.instances.length).toBe(instancesAfterSecondError)

    await act(async () => {
      vi.advanceTimersByTime(1)
    })
    expect(MockEventSource.instances.length).toBe(instancesAfterSecondError + 1)
  })

  it('remove flag __new apos 1700ms', async () => {
    const { result } = renderHook(() => useEventStream())

    await act(async () => {
      vi.advanceTimersByTime(10)
    })

    act(() => {
      MockEventSource.latest().simulateMessage({
        event: {
          id: 'evt-anim',
          entityId: 'ent-1',
          externalId: 'ext_anim',
          type: 'info',
          payload: {},
          createdAt: '2026-05-21T12:00:00Z',
        },
        entitySuspended: false,
      })
    })

    expect(result.current.events[0].__new).toBe(true)

    // Avanca 1700ms para a flag ser removida
    act(() => {
      vi.advanceTimersByTime(1700)
    })

    expect(result.current.events[0].__new).toBe(false)
  })
})
