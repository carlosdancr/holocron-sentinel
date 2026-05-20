import { FastifyInstance } from 'fastify'
import { ZodTypeProvider } from 'fastify-type-provider-zod'
import { EntityService } from '../services/entity.service.js'
import {
  createEntitySchema,
  entityParamsSchema,
  listEntitiesSchema,
  updateEntityStatusSchema,
} from '../schemas/entity.schemas.js'

const entityService = new EntityService()

export async function entityRoutes(app: FastifyInstance) {
  const typedApp = app.withTypeProvider<ZodTypeProvider>()

  /**
   * POST /entities — Cria uma nova entidade monitorada
   */
  typedApp.post('/entities', { schema: { body: createEntitySchema } }, async (request, reply) => {
    // request.body já é tipado como { name: string } automaticamente!
    const entity = await entityService.create(request.body)

    return reply.status(201).send(entity)
  })

  /**
   * GET /entities — Lista entidades com agregações
   */
  typedApp.get('/entities', { schema: { querystring: listEntitiesSchema } }, async (request) => {
    // request.query já é tipado como { page: number, limit: number, status?: string }
    const result = await entityService.list(request.query)

    return result
  })

  // GET /entities/:id — detalhe de uma entidade
  typedApp.get(
    '/entities/:id',
    {
      schema: {
        params: entityParamsSchema,
      },
    },
    async (request, reply) => {
      const { id } = request.params
      const entity = await entityService.findById(id)

      if (!entity) {
        return reply.status(404).send({ error: 'Entidade não encontrada.' })
      }

      return reply.send(entity)
    },
  )

  // PATCH /entities/:id — alterar status da entidade (suspender/reativar)
  typedApp.patch(
    '/entities/:id',
    {
      schema: {
        params: entityParamsSchema,
        body: updateEntityStatusSchema,
      },
    },
    async (request, reply) => {
      const { id } = request.params
      const { status } = request.body

      const entity = await entityService.updateStatus(id, status)

      if (!entity) {
        return reply.status(404).send({ error: 'Entidade não encontrada.' })
      }

      return reply.send(entity)
    },
  )
}
