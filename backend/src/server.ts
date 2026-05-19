import Fastify from 'fastify'
import cors from '@fastify/cors'

const app = Fastify({ logger: true })

// Permite requisições do frontend
await app.register(cors, { origin: true })

// Rota de saúde — para verificar se o servidor está no ar
app.get('/health', async () => {
  return { status: 'ok', timestamp: new Date().toISOString() }
})

// Inicia o servidor
app.listen({ port: 3333, host: '0.0.0.0' }, (err, address) => {
  if (err) {
    app.log.error(err)
    process.exit(1)
  }
  app.log.info(`Holocron Sentinel rodando em ${address}`)
})