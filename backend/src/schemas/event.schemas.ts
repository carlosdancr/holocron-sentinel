import { z } from 'zod'

// Schema de validação para registro de evento
export const createEventSchema = z.object({
  entityId: z.uuid('ID da entidade deve ser um UUID válido'),
  externalId: z
    .string()
    .min(1, 'O external_id é obrigatório')
    .regex(/^[a-zA-Z0-9_\-:.]+$/, 'O external_id deve conter apenas letras, números, _ - : .'),
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
  page: z.coerce.number().int().min(1).max(9999).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(8),
  type: z.enum(['info', 'warning', 'critical']).optional(),
})

// ===== Response schemas (para documentação OpenAPI) =====

const eventSchema = z.object({
  id: z.string().uuid(),
  entityId: z.string().uuid(),
  externalId: z.string(),
  type: z.string(),
  payload: z.unknown(),
  createdAt: z.date(),
})

export const createEventResponseSchema = z.object({
  event: eventSchema,
  status: z.string(),
  entitySuspended: z.boolean(),
})

const hourlyBucketSchema = z.object({
  label: z.string(),
  info: z.number().int().min(0),
  warning: z.number().int().min(0),
  critical: z.number().int().min(0),
  total: z.number().int().min(0),
})

export const listEntityEventsResponseSchema = z.object({
  data: z.array(eventSchema),
  pagination: z.object({
    page: z.number().int().min(1),
    limit: z.number().int().min(1),
    total: z.number().int().min(0),
    totalPages: z.number().int().min(0),
  }),
  summary: z.object({
    last24h: z.object({
      total: z.number().int().min(0),
      info: z.number().int().min(0),
      warning: z.number().int().min(0),
      critical: z.number().int().min(0),
    }),
  }),
  hourlyActivity: z.array(hourlyBucketSchema),
})

export type CreateEventInput = z.infer<typeof createEventSchema>
export type ListEntityEventsParams = z.infer<typeof listEntityEventsParamsSchema>
export type ListEntityEventsQuery = z.infer<typeof listEntityEventsQuerySchema>
