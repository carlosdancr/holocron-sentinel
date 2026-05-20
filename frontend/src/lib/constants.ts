// URL base da API — usa variavel de ambiente ou fallback para localhost
export const API_BASE_URL = process.env['NEXT_PUBLIC_API_URL'] || 'http://localhost:3333'

// Limite de eventos criticos antes da suspensao automatica (alinhado com o backend)
export const CRITICAL_EVENTS_LIMIT = 10

// Limite maximo de eventos no buffer do feed em tempo real
export const SSE_BUFFER_LIMIT = 100

// Intervalo de revalidacao automatica das queries (30s)
export const REFETCH_INTERVAL = 30_000
