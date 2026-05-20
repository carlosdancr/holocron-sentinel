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

export type CreateEventInput = z.infer<typeof createEventSchema>
