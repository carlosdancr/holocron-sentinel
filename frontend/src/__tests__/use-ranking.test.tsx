import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'

import { useRanking } from '@/hooks/use-ranking'
import { api } from '@/lib/api'
import { createWrapper } from './helpers'

vi.mock('@/lib/api', () => ({
  api: { get: vi.fn(), post: vi.fn(), patch: vi.fn() },
}))

beforeEach(() => {
  vi.clearAllMocks()
})

describe('useRanking', () => {
  it('busca ranking com limite padrao', async () => {
    const mockResponse = {
      data: {
        data: [
          {
            id: '1',
            name: 'Death Star',
            status: 'active',
            criticalEventsCount: 8,
            recentCriticalCount: 5,
            lastCriticalEventAt: '2026-05-20T10:00:00Z',
          },
        ],
      },
    }
    vi.mocked(api.get).mockResolvedValue(mockResponse)

    const { result } = renderHook(() => useRanking(), { wrapper: createWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(api.get).toHaveBeenCalledWith('/entities/ranking', {
      params: { limit: 12 },
    })
    expect(result.current.data?.data[0].recentCriticalCount).toBe(5)
  })
})
