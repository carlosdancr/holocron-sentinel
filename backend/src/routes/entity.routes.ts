import { FastifyInstance } from 'fastify'
import { EntityService } from '../services/entity.service.js'
import { createEntitySchema, listEntitiesSchema } from '../schemas/entity.schemas.js'

const entityService = new EntityService()

export async function entityRoutes(app: FastifyInstance) {
  /**
   * POST /entities — Cria uma nova entidade monitorada
   */
  app.post('/entities', { schema: createEntitySchema }, async (request, reply) => {
    const { name } = request.body as { name: string }

    const entity = await entityService.create({ name })

    // 201 = Created (recurso foi criado com sucesso)
    return reply.status(201).send(entity)
  })

  /**
   * GET /entities — Lista entidades com agregações
   */
  app.get('/entities', { schema: listEntitiesSchema }, async (request) => {
    const { page, limit, status } = request.query as {
      page: number
      limit: number
      status?: string
    }

    const result = await entityService.list({ page, limit, status })

    return result
  })
}
