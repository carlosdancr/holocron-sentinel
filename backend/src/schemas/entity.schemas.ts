// Schema de validação para criação de entidade
// O Fastify usa JSON Schema para validar automaticamente o body da requisição
export const createEntitySchema = {
  body: {
    type: 'object' as const,
    required: ['name'],
    properties: {
      name: { type: 'string', minLength: 1 },
    },
    additionalProperties: false,
  },
}

// Schema de validação para query params da listagem
export const listEntitiesSchema = {
  querystring: {
    type: 'object' as const,
    properties: {
      page: { type: 'integer', minimum: 1, default: 1 },
      limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
      status: { type: 'string', enum: ['active', 'suspended'] },
    },
    additionalProperties: false,
  },
}
