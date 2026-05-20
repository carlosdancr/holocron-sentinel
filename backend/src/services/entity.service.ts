import { prisma } from '../lib/prisma.js'
import type { CreateEntityInput, ListEntitiesInput } from '../schemas/entity.schemas.js'
import type { RankingInput } from '../schemas/ranking.schemas.js'
export class EntityService {
  /**
   * Cria uma nova entidade monitorada.
   * Toda entidade começa com status "active" e zero eventos críticos.
   */
  async create(input: CreateEntityInput) {
    const entity = await prisma.entity.create({
      data: {
        name: input.name,
      },
    })

    return entity
  }

  /**
   * Lista entidades com agregações de eventos.
   *
   * Em vez de fazer N+1 queries (1 para listar + N para contar eventos de cada),
   * usamos uma única query com subqueries agregadas.
   *
   * O Prisma não suporta agregações complexas em relações diretamente,
   * então usamos raw SQL para ter controle total da performance.
   */
  async list(input: ListEntitiesInput) {
    const { page, limit, status } = input
    const offset = (page - 1) * limit

    // Monta a cláusula WHERE dinamicamente
    const whereClause = status ? `WHERE e.status = '${status}'` : ''
    // Versão segura com parâmetro para a contagem
    const whereClauseParam = status ? `WHERE e.status = $1` : ''

    // Query principal com agregações via subqueries
    // Cada subquery é resolvida pelo índice (entityId, createdAt)
    const entities = await prisma.$queryRawUnsafe<
      Array<{
        id: string
        name: string
        status: string
        critical_events_count: number
        created_at: Date
        updated_at: Date
        total_events: bigint
        total_critical_events: bigint
        last_event_at: Date | null
      }>
    >(
      `
      SELECT
        e.id,
        e.name,
        e.status,
        e.critical_events_count,
        e.created_at,
        e.updated_at,
        (SELECT COUNT(*) FROM events ev WHERE ev.entity_id = e.id) AS total_events,
        (SELECT COUNT(*) FROM events ev WHERE ev.entity_id = e.id AND ev.type = 'critical') AS total_critical_events,
        (SELECT MAX(ev.created_at) FROM events ev WHERE ev.entity_id = e.id) AS last_event_at
      FROM entities e
      ${whereClause}
      ORDER BY e.created_at DESC
      LIMIT ${limit}
      OFFSET ${offset}
      `,
    )

    // Conta o total para paginação
    const countResult = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
      `SELECT COUNT(*) as count FROM entities e ${whereClauseParam}`,
      ...(status ? [status] : []),
    )

    const total = Number(countResult[0].count)

    return {
      data: entities.map((entity) => ({
        id: entity.id,
        name: entity.name,
        status: entity.status,
        criticalEventsCount: Number(entity.critical_events_count),
        createdAt: entity.created_at,
        updatedAt: entity.updated_at,
        totalEvents: Number(entity.total_events),
        totalCriticalEvents: Number(entity.total_critical_events),
        lastEventAt: entity.last_event_at,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    }
  }

  /**
   * Retorna as entidades com mais eventos críticos nos últimos 7 dias.
   *
   * Por que não usar o critical_events_count da tabela entities?
   * Porque ele é o total de TODOS os tempos. O ranking precisa dos últimos 7 dias.
   *
   * A query faz:
   * 1. Filtra eventos do tipo 'critical' dos últimos 7 dias
   * 2. Agrupa por entidade (GROUP BY)
   * 3. Conta quantos eventos cada entidade teve
   * 4. Ordena do mais crítico para o menos (ORDER BY DESC)
   *
   * O índice (type, created_at) criado na Fase 2 é usado aqui — o PostgreSQL
   * primeiro filtra pelo type = 'critical' e depois pelo range de datas,
   * tudo via índice, sem full table scan.
   */
  async ranking(input: RankingInput) {
    const { limit } = input

    const result = await prisma.$queryRawUnsafe<
      Array<{
        id: string
        name: string
        status: string
        critical_events_count: number
        recent_critical_count: bigint
        last_critical_event_at: Date | null
      }>
    >(
      `
      SELECT
        e.id,
        e.name,
        e.status,
        e.critical_events_count,
        COUNT(ev.id) AS recent_critical_count,
        MAX(ev.created_at) AS last_critical_event_at
      FROM entities e
      INNER JOIN events ev ON ev.entity_id = e.id
        AND ev.type = 'critical'
        AND ev.created_at >= NOW() - INTERVAL '7 days'
      GROUP BY e.id, e.name, e.status, e.critical_events_count
      ORDER BY recent_critical_count DESC
      LIMIT $1
      `,
      limit,
    )

    return {
      data: result.map((entity) => ({
        id: entity.id,
        name: entity.name,
        status: entity.status,
        criticalEventsCount: Number(entity.critical_events_count),
        recentCriticalCount: Number(entity.recent_critical_count),
        lastCriticalEventAt: entity.last_critical_event_at,
      })),
    }
  }

  async findById(id: string) {
    const result = await prisma.$queryRaw<
      Array<{
        id: string
        name: string
        status: string
        critical_events_count: number
        created_at: Date
        updated_at: Date
        total_events: bigint
        total_critical_events: bigint
        last_event_at: Date | null
      }>
    >`
    SELECT
      e.id,
      e.name,
      e.status,
      e.critical_events_count,
      e.created_at,
      e.updated_at,
      (SELECT COUNT(*) FROM events ev WHERE ev.entity_id = e.id) AS total_events,
      (SELECT COUNT(*) FROM events ev WHERE ev.entity_id = e.id AND ev.type = 'critical') AS total_critical_events,
      (SELECT MAX(ev.created_at) FROM events ev WHERE ev.entity_id = e.id) AS last_event_at
    FROM entities e
    WHERE e.id = ${id}
  `

    if (result.length === 0) return null

    const row = result[0]
    return {
      id: row.id,
      name: row.name,
      status: row.status,
      criticalEventsCount: row.critical_events_count,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      totalEvents: Number(row.total_events),
      totalCriticalEvents: Number(row.total_critical_events),
      lastEventAt: row.last_event_at,
    }
  }
}
