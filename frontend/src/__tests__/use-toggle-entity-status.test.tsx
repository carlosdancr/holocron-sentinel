import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'

import { useToggleEntityStatus } from '@/hooks/use-toggle-entity-status'
import { api } from '@/lib/api'
import { createWrapper } from './helpers'

vi.mock('@/lib/api', () => ({
  api: { get: vi.fn(), post: vi.fn(), patch: vi.fn() },
}))

beforeEach(() => {
  vi.clearAllMocks()
})

describe('useToggleEntityStatus', () => {
  it('alterna status de active para suspended', async () => {
    const updatedEntity = {
      id: 'ent-1',
      name: 'Hoth',
      status: 'suspended',
      criticalEventsCount: 10,
    }
    vi.mocked(api.patch).mockResolvedValue({ data: updatedEntity })

    const { result } = renderHook(() => useToggleEntityStatus(), {
      wrapper: createWrapper(),
    })

    act(() => {
      result.current.mutate({ id: 'ent-1', status: 'suspended' })
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(api.patch).toHaveBeenCalledWith('/entities/ent-1', { status: 'suspended' })
    expect(result.current.data?.status).toBe('suspended')
  })

  it('alterna status de suspended para active', async () => {
    const updatedEntity = {
      id: 'ent-1',
      name: 'Hoth',
      status: 'active',
      criticalEventsCount: 0,
    }
    vi.mocked(api.patch).mockResolvedValue({ data: updatedEntity })

    const { result } = renderHook(() => useToggleEntityStatus(), {
      wrapper: createWrapper(),
    })

    act(() => {
      result.current.mutate({ id: 'ent-1', status: 'active' })
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(api.patch).toHaveBeenCalledWith('/entities/ent-1', { status: 'active' })
    expect(result.current.data?.status).toBe('active')
  })
})
