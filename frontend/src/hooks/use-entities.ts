'use client'

import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { REFETCH_INTERVAL } from '@/lib/constants'
import type { EntityListResponse } from '@/lib/types'

interface UseEntitiesOptions {
  page?: number
  limit?: number
  status?: 'active' | 'suspended'
  search?: string
  sort?: 'threat' | 'events' | 'recent' | 'name'
}

export function useEntities(options: UseEntitiesOptions = {}) {
  const { page = 1, limit = 20, status, search, sort = 'threat' } = options

  return useQuery({
    queryKey: ['entities', { page, limit, status, search, sort }],
    queryFn: async () => {
      const params: Record<string, string | number> = { page, limit, sort }
      if (status) params.status = status
      if (search) params.search = search

      const { data } = await api.get<EntityListResponse>('/entities', { params })
      return data
    },
    placeholderData: keepPreviousData,
    refetchInterval: REFETCH_INTERVAL,
    refetchOnWindowFocus: true,
  })
}
