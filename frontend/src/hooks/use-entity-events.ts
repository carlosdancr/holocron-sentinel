'use client'

import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { REFETCH_INTERVAL } from '@/lib/constants'
import type { EventListResponse } from '@/lib/types'

interface UseEntityEventsOptions {
  entityId: string
  page?: number
  limit?: number
  type?: 'info' | 'warning' | 'critical'
}

export function useEntityEvents({ entityId, page = 1, limit = 8, type }: UseEntityEventsOptions) {
  return useQuery({
    queryKey: ['entity-events', entityId, { page, limit, type }],
    queryFn: async () => {
      const params: Record<string, string | number> = { page, limit }
      if (type) params.type = type

      const { data } = await api.get<EventListResponse>(`/entities/${entityId}/events`, {
        params,
      })
      return data
    },
    enabled: !!entityId,
    placeholderData: keepPreviousData,
    refetchInterval: REFETCH_INTERVAL,
    refetchOnWindowFocus: true,
  })
}
