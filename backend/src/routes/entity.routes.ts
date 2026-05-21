import { FastifyInstance } from 'fastify'
import { ZodTypeProvider } from 'fastify-type-provider-zod'
import { entityService } from '../services/entity.service.js'
import {
  createEntitySchema,
  entityParamsSchema,
  listEntitiesSchema,
  entityResponseSchema,
  entityDetailResponseSchema,
  listEntitiesResponseSchema,
  errorResponseSchema,
} from '../schemas/entity.schemas.js'

export async function entityRoutes(app: FastifyInstance) {
  const typedApp = app.withTypeProvider<ZodTypeProvider>()

  /**
   * POST /entities — Cria uma nova entidade monitorada
   */
  typedApp.post(
    '/entities',
    {
      schema: {
        tags: ['Entity'],
        summary: 'Criar entidade',
        body: createEntitySchema,
        response: {
          201: entityResponseSchema,
        },
      },
    },
    async (request, reply) => {
      // request.body já é tipado como { name: string } automaticamente!
      const entity = await entityService.create(request.body)

      return reply.status(201).send(entity)
    },
  )

  /**
   * GET /entities — Lista entidades com agregações
   */
  typedApp.get(
    '/entities',
    {
      schema: {
        tags: ['Entity'],
        summary: 'Listar entidades',
        querystring: listEntitiesSchema,
        response: {
          200: listEntitiesResponseSchema,
        },
      },
    },
    async (request) => {
      // request.query já é tipado como { page: number, limit: number, status?: string }
      const result = await entityService.list(request.query)

      return result
    },
  )

  // GET /entities/:id — detalhe de uma entidade
  typedApp.get(
    '/entities/:id',
    {
      schema: {
        tags: ['Entity'],
        summary: 'Detalhar entidade',
        params: entityParamsSchema,
        response: {
          200: entityDetailResponseSchema,
          404: errorResponseSchema,
        },
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
}
