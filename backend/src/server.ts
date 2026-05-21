import 'dotenv/config'
import Fastify from 'fastify'
import cors from '@fastify/cors'
import fastifySwagger from '@fastify/swagger'
import scalarAPIReference from '@scalar/fastify-api-reference'
import {
  jsonSchemaTransform,
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from 'fastify-type-provider-zod'
import { entityRoutes } from './routes/entity.routes.js'
import { eventRoutes } from './routes/event.routes.js'
import { rankingRoutes } from './routes/ranking.routes.js'
import { streamRoutes } from './routes/stream.routes.js'

const app = Fastify({ logger: true }).withTypeProvider<ZodTypeProvider>()

app.setValidatorCompiler(validatorCompiler)
app.setSerializerCompiler(serializerCompiler)

await app.register(fastifySwagger, {
  openapi: {
    info: {
      title: 'Holocron Sentinel API',
      description:
        'API de monitoramento operacional. Registra eventos associados a entidades estratégicas, aplica regras de suspensão automática por limite crítico e transmite dados em tempo real via SSE.',
      version: '1.0.0',
    },
    tags: [
      { name: 'Entity', description: 'Gerenciamento de entidades monitoradas' },
      { name: 'Event', description: 'Registro e consulta de eventos' },
      { name: 'Ranking', description: 'Ranking de entidades por incidência crítica' },
      { name: 'Stream', description: 'Streaming de eventos em tempo real (SSE)' },
    ],
  },
  transform: jsonSchemaTransform,
})

await app.register(scalarAPIReference, {
  routePrefix: '/docs',
  configuration: {
    theme: 'elysiajs',
    defaultHttpClient: { targetKey: 'js', clientKey: 'fetch' },
  },
})

await app.register(cors, { origin: true })

// Registra as rotas
await app.register(entityRoutes)
await app.register(eventRoutes)
await app.register(rankingRoutes)
await app.register(streamRoutes)

app.get('/health', async () => {
  return { status: 'ok', timestamp: new Date().toISOString() }
})

app.listen({ port: 3333, host: '0.0.0.0' }, (err, address) => {
  if (err) {
    app.log.error(err)
    process.exit(1)
  }
  app.log.info(`Holocron Sentinel rodando em ${address}`)
})
