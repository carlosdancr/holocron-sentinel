import { z } from 'zod'

// Schema de validação para registro de evento
export const createEventSchema = z.object({
  entityId: z.uuid('ID da entidade deve ser um UUID válido'),
  externalId: z.string().min(1, 'O external_id é obrigatório'),
  type: z.enum(['info', 'warning', 'critical'], {
    error: 'Tipo deve ser info, warning ou critical',
  }),
  payload: z.record(z.string(), z.unknown()).default({}),
})

// Schema para params de rota /entities/:entityId/events
export const listEntityEventsParamsSchema = z.object({
  entityId: z.string().uuid(),
})

// Schema para query params da listagem de eventos
export const listEntityEventsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(8),
  type: z.enum(['info', 'warning', 'critical']).optional(),
})

export type CreateEventInput = z.infer<typeof createEventSchema>
export type ListEntityEventsParams = z.infer<typeof listEntityEventsParamsSchema>
export type ListEntityEventsQuery = z.infer<typeof listEntityEventsQuerySchema>
