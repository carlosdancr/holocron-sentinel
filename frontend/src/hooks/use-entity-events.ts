'use client'

import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { EventListResponse } from '@/lib/types'

interface UseEntityEventsOptions {
  entityId: string
  page?: number
  limit?: number
}

export function useEntityEvents({ entityId, page = 1, limit = 12 }: UseEntityEventsOptions) {
  return useQuery({
    queryKey: ['entity-events', entityId, page, limit],
    queryFn: async () => {
      const { data } = await api.get<EventListResponse>(`/entities/${entityId}/events`, {
        params: { page, limit },
      })
      return data
    },
    enabled: !!entityId,
  })
}
