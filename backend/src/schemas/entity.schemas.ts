import { z } from 'zod'

// Schema de validação para criação de entidade
export const createEntitySchema = z.object({
  name: z.string().min(1, 'O nome é obrigatório'),
})

// Schema de validação para query params da listagem
export const listEntitiesSchema = z.object({
  page: z.coerce.number().int().min(1).max(9999).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(['active', 'suspended']).optional(),
  search: z.string().optional(),
  sort: z.enum(['threat', 'events', 'recent', 'name']).default('threat'),
})

// Schema para params de rota que recebem :id
export const entityParamsSchema = z.object({
  id: z.uuid(),
})

// Schema para o body do PATCH /entities/:id (toggle de status)
export const updateEntityStatusSchema = z.object({
  status: z.enum(['active', 'suspended']),
})

// ===== Response schemas (para documentação OpenAPI) =====

export const entityResponseSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  status: z.string(),
  criticalEventsCount: z.number().int().min(0),
  createdAt: z.date(),
  updatedAt: z.date(),
})

export const entityDetailResponseSchema = entityResponseSchema.extend({
  totalEvents: z.number().int().min(0),
  totalCriticalEvents: z.number().int().min(0),
  lastEventAt: z.date().nullable(),
})

const paginationSchema = z.object({
  page: z.number().int().min(1),
  limit: z.number().int().min(1),
  total: z.number().int().min(0),
  totalPages: z.number().int().min(0),
})

export const listEntitiesResponseSchema = z.object({
  data: z.array(entityDetailResponseSchema),
  pagination: paginationSchema,
  summary: z.object({
    total: z.number().int().min(0),
    active: z.number().int().min(0),
    suspended: z.number().int().min(0),
    totalCriticalEvents: z.number().int().min(0),
    totalEvents: z.number().int().min(0),
    nearLimit: z.number().int().min(0),
  }),
})

export const errorResponseSchema = z.object({
  error: z.string(),
})

// Tipos inferidos automaticamente — não precisa escrever interfaces na mão!
export type CreateEntityInput = z.infer<typeof createEntitySchema>
export type ListEntitiesInput = z.infer<typeof listEntitiesSchema>
export type EntityParams = z.infer<typeof entityParamsSchema>
export type UpdateEntityStatusInput = z.infer<typeof updateEntityStatusSchema>
