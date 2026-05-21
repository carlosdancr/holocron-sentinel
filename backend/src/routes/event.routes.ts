import { FastifyInstance } from 'fastify'
import { ZodTypeProvider } from 'fastify-type-provider-zod'
import {
  eventService,
  EntityNotFoundError,
  EntitySuspendedError,
} from '../services/event.service.js'
import {
  createEventSchema,
  listEntityEventsParamsSchema,
  listEntityEventsQuerySchema,
} from '../schemas/event.schemas.js'

export async function eventRoutes(app: FastifyInstance) {
  const typedApp = app.withTypeProvider<ZodTypeProvider>()

  /**
   * POST /events — Registra um evento associado a uma entidade
   *
   * Respostas possíveis:
   * - 201: evento criado com sucesso
   * - 200: evento duplicado (idempotência — já foi processado)
   * - 404: entidade não encontrada
   * - 422: entidade suspensa (não aceita novos eventos)
   */
  typedApp.post('/events', { schema: { body: createEventSchema } }, async (request, reply) => {
    try {
      const result = await eventService.create(request.body)

      // 200 para duplicado, 201 para criado
      const statusCode = result.status === 'created' ? 201 : 200

      return reply.status(statusCode).send({
        event: result.event,
        status: result.status,
        entitySuspended: result.entitySuspended,
      })
    } catch (error) {
      if (error instanceof EntityNotFoundError) {
        return reply.status(404).send({ error: error.message })
      }

      if (error instanceof EntitySuspendedError) {
        return reply.status(422).send({ error: error.message })
      }

      // Erro inesperado — deixa o Fastify tratar (retorna 500)
      throw error
    }
  })

  // GET /entities/:entityId/events — historico de eventos de uma entidade
  typedApp.get(
    '/entities/:entityId/events',
    {
      schema: {
        params: listEntityEventsParamsSchema,
        querystring: listEntityEventsQuerySchema,
      },
    },
    async (request, reply) => {
      const { entityId } = request.params
      const { page, limit, type } = request.query

      const result = await eventService.listByEntity(entityId, page, limit, type)
      return reply.send(result)
    },
  )
}
