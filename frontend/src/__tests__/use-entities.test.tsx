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

const mockSummary = {
  total: 50,
  active: 40,
  suspended: 10,
  totalCriticalEvents: 120,
  totalEvents: 1200,
  nearLimit: 3,
}

describe('useEntities', () => {
  it('busca entidades com paginacao server-side (page=1, limit=20)', async () => {
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
        pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
        summary: mockSummary,
      },
    }
    vi.mocked(api.get).mockResolvedValue(mockResponse)

    const { result } = renderHook(() => useEntities(), { wrapper: createWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(api.get).toHaveBeenCalledWith('/entities', {
      params: { page: 1, limit: 20, sort: 'threat' },
    })
    expect(result.current.data?.data).toHaveLength(1)
    expect(result.current.data?.data[0].name).toBe('Hoth')
    expect(result.current.data?.summary.total).toBe(50)
  })

  it('passa filtro de status quando fornecido', async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: {
        data: [],
        pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
        summary: mockSummary,
      },
    })

    const { result } = renderHook(() => useEntities({ status: 'suspended' }), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(api.get).toHaveBeenCalledWith('/entities', {
      params: { page: 1, limit: 20, status: 'suspended', sort: 'threat' },
    })
  })

  it('passa search e sort quando fornecidos', async () => {
    vi.mocked(api.get).mockResolvedValue({
      data: {
        data: [],
        pagination: { page: 2, limit: 20, total: 25, totalPages: 2 },
        summary: mockSummary,
      },
    })

    const { result } = renderHook(
      () => useEntities({ page: 2, search: 'Hoth', sort: 'name' }),
      { wrapper: createWrapper() },
    )

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(api.get).toHaveBeenCalledWith('/entities', {
      params: { page: 2, limit: 20, search: 'Hoth', sort: 'name' },
    })
  })
})
