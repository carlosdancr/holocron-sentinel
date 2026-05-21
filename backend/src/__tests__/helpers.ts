import 'dotenv/config'
import Fastify, { type FastifyInstance } from 'fastify'
import cors from '@fastify/cors'
import { serializerCompiler, validatorCompiler } from 'fastify-type-provider-zod'
import { entityRoutes } from '../routes/entity.routes.js'
import { eventRoutes } from '../routes/event.routes.js'
import { rankingRoutes } from '../routes/ranking.routes.js'
import { streamRoutes } from '../routes/stream.routes.js'
import { prisma } from '../lib/prisma.js'

/**
 * Cria uma instância Fastify configurada identicamente ao server.ts,
 * mas sem fazer listen() — útil para testes com inject().
 */
export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({ logger: false })

  app.setValidatorCompiler(validatorCompiler)
  app.setSerializerCompiler(serializerCompiler)

  await app.register(cors, { origin: true })
  await app.register(entityRoutes)
  await app.register(eventRoutes)
  await app.register(rankingRoutes)
  await app.register(streamRoutes)

  await app.ready()
  return app
}

/**
 * Limpa todas as tabelas do banco para garantir isolamento entre testes.
 * Usa TRUNCATE CASCADE para resolver dependências de FK em uma única operação.
 */
export async function cleanDatabase(): Promise<void> {
  await prisma.$executeRawUnsafe('TRUNCATE TABLE events, entities CASCADE')
}

/**
 * Cria uma entidade via API e retorna o JSON da resposta.
 */
export async function createEntity(app: FastifyInstance, name: string = 'Planeta Alderaan') {
  const res = await app.inject({
    method: 'POST',
    url: '/entities',
    payload: { name },
  })
  return JSON.parse(res.payload)
}

/**
 * Registra um evento via API e retorna { statusCode, body }.
 */
export async function createEvent(
  app: FastifyInstance,
  payload: {
    entityId: string
    externalId: string
    type: 'info' | 'warning' | 'critical'
    payload?: Record<string, unknown>
  },
) {
  const res = await app.inject({
    method: 'POST',
    url: '/events',
    payload: {
      payload: {},
      ...payload,
    },
  })
  return { statusCode: res.statusCode, body: JSON.parse(res.payload) }
}
