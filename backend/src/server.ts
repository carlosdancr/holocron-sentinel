import 'dotenv/config'
import Fastify from 'fastify'
import cors from '@fastify/cors'
import { entityRoutes } from './routes/entity.routes.js'

const app = Fastify({ logger: true })

await app.register(cors, { origin: true })

// Registra as rotas
await app.register(entityRoutes)

// Rota de saúde
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
