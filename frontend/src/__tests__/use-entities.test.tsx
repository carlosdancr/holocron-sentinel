import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'

import { useEntities } from '@/hooks/use-entities'
import { api } from '@/lib/api'
import { createWrapper } from './helpers'

vi.mock('@/lib/api', () => ({
  api: { get: vi.fn(), post: vi.fn(), patch: vi.fn() },
}))

beforeEach(() => {
  vi.clearAllMocks()
})

describe('useEntities', () => {
  it('busca entidades com paginacao padrao', async () => {
    const mockResponse = {
      data: {
        data: [
          {
            id: '1',
            name: 'Hoth',
            status: 'active',
            criticalEventsCount: 3,
            totalEvents: 15,
            totalCriticalEvents: 3,
            lastEventAt: '2026-05-20T10:00:00Z',
          },
        ],
        pagination: { page: 1, limit: 100, total: 1, totalPages: 1 },
      },
    }
    vi.mocked(api.get).mockResolvedValue(mockResponse)

    const { result } = renderHook(() => useEntities(), { wrapper: createWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(api.get).toHaveBeenCalledWith('/entities', {
      params: { page: 1, limit: 100 },
    })
    expect(result.current.data?.data).toHaveLength(1)
    expect(result.current.data?.data[0].name).toBe('Hoth')
  })

  it('passa filtro de status quando fornecido', async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: { data: [], pagination: { page: 1, limit: 100, total: 0, totalPages: 0 } },
    })

    const { result } = renderHook(() => useEntities({ status: 'suspended' }), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(api.get).toHaveBeenCalledWith('/entities', {
      params: { page: 1, limit: 100, status: 'suspended' },
    })
  })
})
