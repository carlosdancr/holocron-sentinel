'use client'

import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { REFETCH_INTERVAL } from '@/lib/constants'
import type { RankingResponse } from '@/lib/types'

interface UseRankingOptions {
  limit?: number
}

export function useRanking({ limit = 12 }: UseRankingOptions = {}) {
  return useQuery({
    queryKey: ['ranking', limit],
    queryFn: async () => {
      const { data } = await api.get<RankingResponse>('/entities/ranking', {
        params: { limit },
      })
      return data
    },
    refetchInterval: REFETCH_INTERVAL,
    refetchOnWindowFocus: true,
  })
}
