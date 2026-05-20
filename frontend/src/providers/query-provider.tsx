'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState, type ReactNode } from 'react'

export function QueryProvider({ children }: { children: ReactNode }) {
  // Cria o QueryClient dentro de useState para evitar recriacao em re-renders
  // e garantir que cada sessao do usuario tenha sua propria instancia
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Nao refaz a query automaticamente ao trocar de aba (exceto onde habilitado)
            refetchOnWindowFocus: false,
            // Retry apenas 1 vez em caso de erro
            retry: 1,
            // Dados ficam "frescos" por 2 segundos (evita refetch duplicado)
            staleTime: 2_000,
          },
        },
      }),
  )

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}
