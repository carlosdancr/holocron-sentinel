import { FastifyInstance } from 'fastify'
import { eventBus } from '../lib/event-bus.js'

export async function streamRoutes(app: FastifyInstance) {
  /**
   * GET /events/stream — Streaming de eventos em tempo real via SSE
   *
   * Como funciona o SSE:
   * 1. O cliente abre a conexão (EventSource no browser)
   * 2. O servidor mantém a conexão aberta
   * 3. Quando um evento novo é criado, o servidor envia pelo stream
   * 4. O cliente recebe em tempo real sem recarregar a página
   * 5. Se a conexão cair, o browser reconecta automaticamente
   *
   * Formato do SSE (obrigatório pelo protocolo):
   *   data: {"json":"aqui"}\n\n
   *
   * Cada mensagem começa com "data: " e termina com duas quebras de linha.
   */
  app.get(
    '/events/stream',
    {
      schema: {
        tags: ['Stream'],
        summary: 'Stream de eventos em tempo real (SSE)',
      },
    },
    async (request, reply) => {
    // Diz ao Fastify que assumimos o controle do response
    reply.hijack()

    // ─── Headers SSE ───
    // Esses headers dizem ao browser: "isso é um stream, não feche a conexão"
    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream', // Tipo SSE
      'Cache-Control': 'no-cache', // Não cachear (dados em tempo real)
      Connection: 'keep-alive', // Manter conexão aberta
      'Access-Control-Allow-Origin': '*', // Permitir acesso do frontend
    })

    // Flush inicial — força o envio dos headers para o browser
    reply.raw.write(':ok\n\n')

    // ─── Heartbeat ───
    // Envia um "ping" a cada 30 segundos para manter a conexão viva
    // Sem isso, proxies e load balancers podem fechar conexões "ociosas"
    const heartbeat = setInterval(() => {
      reply.raw.write(':heartbeat\n\n')
    }, 30_000)

    // ─── Listener de novos eventos ───
    // Quando o EventService emitir 'new-event', essa função é chamada
    const onNewEvent = (data: unknown) => {
      // Formato obrigatório do SSE: "data: " + JSON + "\n\n"
      reply.raw.write(`data: ${JSON.stringify(data)}\n\n`)
    }

    // Registra o listener no barramento
    eventBus.on('new-event', onNewEvent)

    // ─── Limpeza na desconexão ───
    // Quando o cliente fecha a aba ou perde conexão, limpamos tudo
    // para evitar memory leak (listeners acumulando sem necessidade)
    request.raw.on('close', () => {
      clearInterval(heartbeat)
      eventBus.off('new-event', onNewEvent)
      reply.raw.end()
    })
  },
  )
}
