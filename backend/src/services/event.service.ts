import { prisma } from '../lib/prisma.js'
import { CRITICAL_EVENTS_LIMIT } from '../config/constants.js'
import type { CreateEventInput } from '../schemas/event.schemas.js'
import { eventBus } from '../lib/event-bus.js'

// Tipo para o resultado — pode ser "created" (novo) ou "duplicate" (já existia)
interface EventResult {
  event: {
    id: string
    entityId: string
    externalId: string
    type: string
    payload: unknown
    createdAt: Date
  }
  status: 'created' | 'duplicate'
  entitySuspended: boolean
}

export class EventService {
  /**
   * Registra um evento associado a uma entidade.
   *
   * Este método resolve 3 problemas de concorrência:
   *
   * 1. IDEMPOTÊNCIA: se o external_id já existe, retorna o evento existente
   *    sem duplicar (via constraint UNIQUE + tratamento do erro).
   *
   * 2. RACE CONDITION: usa SELECT FOR UPDATE para travar a linha da entidade
   *    durante a transação, impedindo leituras simultâneas do contador.
   *
   * 3. SUSPENSÃO AUTOMÁTICA: verifica e atualiza o status dentro da mesma
   *    transação, garantindo consistência.
   */
  async create(input: CreateEventInput): Promise<EventResult> {
    const { entityId, externalId, type, payload } = input

    // ─── PASSO 1: Verificar idempotência ANTES da transação ───
    // Se o evento já foi processado, retorna imediatamente sem abrir transação
    // Isso é mais eficiente: evita locks desnecessários para duplicatas
    const existingEvent = await prisma.event.findUnique({
      where: { externalId },
    })

    if (existingEvent) {
      return {
        event: existingEvent,
        status: 'duplicate',
        entitySuspended: false,
      }
    }

    // ─── PASSO 2: Transação com lock pessimista ───
    // Tudo dentro do $transaction é atômico: ou tudo acontece, ou nada acontece
    const result = await prisma.$transaction(async (tx) => {
      // 2a. Trava a linha da entidade com SELECT FOR UPDATE
      // Enquanto essa transação não terminar, nenhuma outra consegue ler essa linha
      const [entity] = await tx.$queryRawUnsafe<
        Array<{
          id: string
          status: string
          critical_events_count: number
        }>
      >(
        `SELECT id, status, critical_events_count
         FROM entities
         WHERE id = $1
         FOR UPDATE`,
        entityId,
      )

      // 2b. Validações dentro do lock (ninguém mais pode alterar a entidade agora)
      if (!entity) {
        throw new EntityNotFoundError(entityId)
      }

      if (entity.status === 'suspended') {
        throw new EntitySuspendedError(entityId)
      }

      // 2c. Cria o evento
      // Se outra requisição com o mesmo external_id passou pela verificação do PASSO 1
      // ao mesmo tempo, a constraint UNIQUE do banco vai rejeitar aqui
      let event
      try {
        event = await tx.event.create({
          data: {
            entityId,
            externalId,
            type,
            payload: (payload ?? {}) as object,
          },
        })
      } catch (error: unknown) {
        // Trata erro de duplicidade (constraint UNIQUE violada)
        // Código P2002 é o erro do Prisma para unique constraint violation
        if (
          typeof error === 'object' &&
          error !== null &&
          'code' in error &&
          error.code === 'P2002'
        ) {
          const duplicate = await tx.event.findUnique({
            where: { externalId },
          })
          return {
            event: duplicate!,
            status: 'duplicate' as const,
            entitySuspended: false,
          }
        }
        throw error
      }

      // 2d. Se o evento é crítico, incrementa o contador e verifica suspensão
      let entitySuspended = false

      if (type === 'critical') {
        const newCount = entity.critical_events_count + 1
        const shouldSuspend = newCount >= CRITICAL_EVENTS_LIMIT

        await tx.entity.update({
          where: { id: entityId },
          data: {
            criticalEventsCount: newCount,
            ...(shouldSuspend && { status: 'suspended' }),
          },
        })

        entitySuspended = shouldSuspend
      }

      return {
        event,
        status: 'created' as const,
        entitySuspended,
      }
    })

    // ─── PASSO 3: Emitir no barramento para clientes SSE ───
    // Só emite se o evento foi realmente criado (não para duplicatas)
    if (result.status === 'created') {
      eventBus.emit('new-event', {
        event: result.event,
        entitySuspended: result.entitySuspended,
      })
    }

    return result
  }

  async listByEntity(entityId: string, page: number, limit: number) {
    const offset = (page - 1) * limit

    // Conta o total de eventos da entidade (para paginacao)
    const total = await prisma.event.count({
      where: { entityId },
    })

    // Busca os eventos ordenados do mais recente para o mais antigo
    const events = await prisma.event.findMany({
      where: { entityId },
      orderBy: { createdAt: 'desc' },
      skip: offset,
      take: limit,
    })

    return {
      data: events,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    }
  }
}

// ─── Erros customizados ───
// Erros com nome específico facilitam o tratamento na rota

export class EntityNotFoundError extends Error {
  constructor(entityId: string) {
    super(`Entidade ${entityId} não encontrada`)
    this.name = 'EntityNotFoundError'
  }
}

export class EntitySuspendedError extends Error {
  constructor(entityId: string) {
    super(`Entidade ${entityId} está suspensa e não aceita novos eventos`)
    this.name = 'EntitySuspendedError'
  }
}
