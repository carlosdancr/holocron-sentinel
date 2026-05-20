'use client'

import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { REFETCH_INTERVAL } from '@/lib/constants'
import type { EntityListResponse } from '@/lib/types'

interface UseEntitiesOptions {
  page?: number
  limit?: number
  status?: 'active' | 'suspended'
}

export function useEntities(options: UseEntitiesOptions = {}) {
  const { page = 1, limit = 100, status } = options

  return useQuery({
    queryKey: ['entities', { page, limit, status }],
    queryFn: async () => {
      const params: Record<string, string | number> = { page, limit }
      if (status) params.status = status

      const { data } = await api.get<EntityListResponse>('/entities', { params })
      return data
    },
    refetchInterval: REFETCH_INTERVAL,
    refetchOnWindowFocus: true,
  })
}
