import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'

import { useCreateEntity } from '@/hooks/use-create-entity'
import { api } from '@/lib/api'
import { createWrapper } from './helpers'

vi.mock('@/lib/api', () => ({
  api: { get: vi.fn(), post: vi.fn(), patch: vi.fn() },
}))

beforeEach(() => {
  vi.clearAllMocks()
})

describe('useCreateEntity', () => {
  it('cria entidade e invalida cache', async () => {
    const newEntity = {
      id: 'abc-123',
      name: 'Yavin IV',
      status: 'active',
      criticalEventsCount: 0,
    }
    vi.mocked(api.post).mockResolvedValue({ data: newEntity })

    const { result } = renderHook(() => useCreateEntity(), { wrapper: createWrapper() })

    act(() => {
      result.current.mutate({ name: 'Yavin IV' })
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(api.post).toHaveBeenCalledWith('/entities', { name: 'Yavin IV' })
    expect(result.current.data?.name).toBe('Yavin IV')
  })

  it('propaga erro de validacao', async () => {
    vi.mocked(api.post).mockRejectedValue(new Error('Validation failed'))

    const { result } = renderHook(() => useCreateEntity(), { wrapper: createWrapper() })

    act(() => {
      result.current.mutate({ name: '' })
    })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error?.message).toBe('Validation failed')
  })
})
