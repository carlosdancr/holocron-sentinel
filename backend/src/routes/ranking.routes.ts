import { FastifyInstance } from 'fastify'
import { ZodTypeProvider } from 'fastify-type-provider-zod'
import { entityService } from '../services/entity.service.js'
import { rankingSchema, rankingResponseSchema } from '../schemas/ranking.schemas.js'

export async function rankingRoutes(app: FastifyInstance) {
  const typedApp = app.withTypeProvider<ZodTypeProvider>()

  /**
   * GET /entities/ranking — Ranking de entidades mais críticas (últimos 7 dias)
   */
  typedApp.get(
    '/entities/ranking',
    {
      schema: {
        tags: ['Ranking'],
        summary: 'Ranking de entidades críticas',
        querystring: rankingSchema,
        response: {
          200: rankingResponseSchema,
        },
      },
    },
    async (request) => {
      const result = await entityService.ranking(request.query)

      return result
    },
  )
}
