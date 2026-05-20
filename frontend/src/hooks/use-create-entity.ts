'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { Entity } from '@/lib/types'

export function useCreateEntity() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: { name: string }) => {
      const { data } = await api.post<Entity>('/entities', input)
      return data
    },
    onSuccess: () => {
      // Invalida o cache de entidades para refletir a nova entidade na listagem
      queryClient.invalidateQueries({ queryKey: ['entities'] })
    },
  })
}
