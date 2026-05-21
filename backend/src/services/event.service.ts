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
    //
    // NOTA sobre P2002 (unique constraint):
    // No PostgreSQL, quando um erro ocorre dentro de uma transação, ela entra
    // em estado "aborted" e qualquer query subsequente falha. Por isso o
    // tratamento de duplicata por race condition é feito FORA da transação —
    // se o INSERT falhar com P2002, a transação faz rollback e buscamos o
    // evento existente em uma query separada.
    let result: EventResult
    try {
      result = await prisma.$transaction(async (tx) => {
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
        const event = await tx.event.create({
          data: {
            entityId,
            externalId,
            type,
            payload: (payload ?? {}) as object,
          },
        })

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
    } catch (error: unknown) {
      // Trata erro de duplicidade (constraint UNIQUE violada por race condition)
      // Código P2002 é o erro do Prisma para unique constraint violation.
      // Busca o evento existente FORA da transação (que já fez rollback).
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        error.code === 'P2002'
      ) {
        const duplicate = await prisma.event.findUnique({
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

  async listByEntity(
    entityId: string,
    page: number,
    limit: number,
    type?: 'info' | 'warning' | 'critical',
  ) {
    const offset = (page - 1) * limit

    // Monta WHERE com filtro de tipo opcional
    const where: { entityId: string; type?: string } = { entityId }
    if (type) where.type = type

    // Conta o total filtrado (para paginação)
    const total = await prisma.event.count({ where })

    // Busca os eventos ordenados do mais recente para o mais antigo
    const events = await prisma.event.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: offset,
      take: limit,
    })

    // Summary das últimas 24h (sem filtro de tipo — global da entidade)
    const summaryResult = await prisma.$queryRaw<
      Array<{
        total_24h: bigint
        info_24h: bigint
        warning_24h: bigint
        critical_24h: bigint
      }>
    >`
      SELECT
        COUNT(*) AS total_24h,
        COUNT(*) FILTER (WHERE type = 'info') AS info_24h,
        COUNT(*) FILTER (WHERE type = 'warning') AS warning_24h,
        COUNT(*) FILTER (WHERE type = 'critical') AS critical_24h
      FROM events
      WHERE entity_id = ${entityId}
        AND created_at >= NOW() - INTERVAL '24 hours'
    `

    const s = summaryResult[0]

    // Atividade horária (últimas 24h) — 24 buckets para o gráfico
    const hourlyResult = await prisma.$queryRaw<
      Array<{
        hours_ago: number
        info: bigint
        warning: bigint
        critical: bigint
        total: bigint
      }>
    >`
      SELECT
        EXTRACT(EPOCH FROM (NOW() - created_at))::int / 3600 AS hours_ago,
        COUNT(*) FILTER (WHERE type = 'info') AS info,
        COUNT(*) FILTER (WHERE type = 'warning') AS warning,
        COUNT(*) FILTER (WHERE type = 'critical') AS critical,
        COUNT(*) AS total
      FROM events
      WHERE entity_id = ${entityId}
        AND created_at >= NOW() - INTERVAL '24 hours'
      GROUP BY hours_ago
      ORDER BY hours_ago DESC
    `

    // Monta array de 24 buckets (0 = agora, 23 = -23h)
    const hourlyActivity = Array.from({ length: 24 }, (_, i) => {
      const hoursAgo = 23 - i
      const label = hoursAgo === 0 ? 'agora' : `-${hoursAgo}h`
      const bucket = hourlyResult.find((r) => Number(r.hours_ago) === hoursAgo)
      return {
        label,
        info: bucket ? Number(bucket.info) : 0,
        warning: bucket ? Number(bucket.warning) : 0,
        critical: bucket ? Number(bucket.critical) : 0,
        total: bucket ? Number(bucket.total) : 0,
      }
    })

    return {
      data: events,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      summary: {
        last24h: {
          total: Number(s.total_24h),
          info: Number(s.info_24h),
          warning: Number(s.warning_24h),
          critical: Number(s.critical_24h),
        },
      },
      hourlyActivity,
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
