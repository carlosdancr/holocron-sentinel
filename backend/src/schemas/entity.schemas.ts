import { z } from 'zod'

// Schema de validação para criação de entidade
export const createEntitySchema = z.object({
  name: z.string().min(1, 'O nome é obrigatório'),
})

// Schema de validação para query params da listagem
export const listEntitiesSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(['active', 'suspended']).optional(),
})

// Tipos inferidos automaticamente — não precisa escrever interfaces na mão!
export type CreateEntityInput = z.infer<typeof createEntitySchema>
export type ListEntitiesInput = z.infer<typeof listEntitiesSchema>
