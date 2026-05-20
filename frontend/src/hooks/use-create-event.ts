'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { EventCreatePayload, EventCreateResponse } from '@/lib/types'

export function useCreateEvent() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: EventCreatePayload) => {
      const { data } = await api.post<EventCreateResponse>('/events', input)
      return data
    },
    onSuccess: () => {
      // Invalida entidades (o contador critico pode ter mudado)
      queryClient.invalidateQueries({ queryKey: ['entities'] })
      queryClient.invalidateQueries({ queryKey: ['ranking'] })
    },
  })
}
