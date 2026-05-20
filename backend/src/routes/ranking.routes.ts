import { FastifyInstance } from 'fastify'
import { ZodTypeProvider } from 'fastify-type-provider-zod'
import { EntityService } from '../services/entity.service.js'
import { rankingSchema } from '../schemas/ranking.schemas.js'

const entityService = new EntityService()

export async function rankingRoutes(app: FastifyInstance) {
  const typedApp = app.withTypeProvider<ZodTypeProvider>()

  /**
   * GET /entities/ranking — Ranking de entidades mais críticas (últimos 7 dias)
   */
  typedApp.get('/entities/ranking', { schema: { querystring: rankingSchema } }, async (request) => {
    const result = await entityService.ranking(request.query)

    return result
  })
}
