import { EventEmitter } from 'node:events'

// Barramento interno de eventos da aplicação
// Quando um evento é registrado, ele é emitido aqui
// Todos os clientes SSE escutam este barramento
//
// Por que EventEmitter e não uma fila (Redis, RabbitMQ)?
// Para este escopo, EventEmitter resolve bem — é simples, não precisa
// de infraestrutura extra, e funciona dentro de um único processo.
// Em produção com múltiplos servidores, usaríamos Redis Pub/Sub.
export const eventBus = new EventEmitter()

// Permite muitos clientes SSE conectados ao mesmo tempo
// O padrão do Node.js é 10 listeners — aumentamos para suportar mais
eventBus.setMaxListeners(100)
