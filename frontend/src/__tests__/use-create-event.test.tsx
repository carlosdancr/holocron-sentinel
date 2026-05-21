import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'

import { useCreateEvent } from '@/hooks/use-create-event'
import { api } from '@/lib/api'
import { createWrapper } from './helpers'

vi.mock('@/lib/api', () => ({
  api: { get: vi.fn(), post: vi.fn(), patch: vi.fn() },
}))

beforeEach(() => {
  vi.clearAllMocks()
})

describe('useCreateEvent', () => {
  it('cria evento com sucesso (status: created)', async () => {
    const mockResponse = {
      event: {
        id: 'evt-1',
        entityId: 'ent-1',
        externalId: 'ext_abc',
        type: 'info',
        payload: {},
        createdAt: '2026-05-21T12:00:00Z',
      },
      status: 'created',
      entitySuspended: false,
    }
    vi.mocked(api.post).mockResolvedValue({ data: mockResponse })

    const { result } = renderHook(() => useCreateEvent(), { wrapper: createWrapper() })

    act(() => {
      result.current.mutate({
        entityId: 'ent-1',
        externalId: 'ext_abc',
        type: 'info',
        payload: {},
      })
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(api.post).toHaveBeenCalledWith('/events', {
      entityId: 'ent-1',
      externalId: 'ext_abc',
      type: 'info',
      payload: {},
    })
    expect(result.current.data?.status).toBe('created')
    expect(result.current.data?.entitySuspended).toBe(false)
  })

  it('retorna status duplicate para external_id repetido', async () => {
    const mockResponse = {
      event: {
        id: 'evt-1',
        entityId: 'ent-1',
        externalId: 'ext_abc',
        type: 'critical',
        payload: {},
        createdAt: '2026-05-21T12:00:00Z',
      },
      status: 'duplicate',
      entitySuspended: false,
    }
    vi.mocked(api.post).mockResolvedValue({ data: mockResponse })

    const { result } = renderHook(() => useCreateEvent(), { wrapper: createWrapper() })

    act(() => {
      result.current.mutate({
        entityId: 'ent-1',
        externalId: 'ext_abc',
        type: 'critical',
        payload: {},
      })
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.status).toBe('duplicate')
  })

  it('sinaliza entitySuspended quando limite e atingido', async () => {
    const mockResponse = {
      event: {
        id: 'evt-10',
        entityId: 'ent-1',
        externalId: 'ext_xyz',
        type: 'critical',
        payload: {},
        createdAt: '2026-05-21T12:00:00Z',
      },
      status: 'created',
      entitySuspended: true,
    }
    vi.mocked(api.post).mockResolvedValue({ data: mockResponse })

    const { result } = renderHook(() => useCreateEvent(), { wrapper: createWrapper() })

    act(() => {
      result.current.mutate({
        entityId: 'ent-1',
        externalId: 'ext_xyz',
        type: 'critical',
        payload: {},
      })
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.entitySuspended).toBe(true)
  })
})
