'use client'

import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { Entity } from '@/lib/types'

export function useEntity(id: string) {
  return useQuery({
    queryKey: ['entity', id],
    queryFn: async () => {
      const { data } = await api.get<Entity>(`/entities/${id}`)
      return data
    },
    enabled: !!id,
  })
}
