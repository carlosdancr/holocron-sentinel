import { describe, it, expect, beforeEach, beforeAll, afterAll } from 'vitest'
import type { FastifyInstance } from 'fastify'
import { buildApp, cleanDatabase, createEntity, createEvent } from './helpers.js'
import { prisma } from '../lib/prisma.js'
import { CRITICAL_EVENTS_LIMIT } from '../config/constants.js'

let app: FastifyInstance

beforeAll(async () => {
  app = await buildApp()
})

afterAll(async () => {
  await cleanDatabase()
  await app.close()
})

beforeEach(async () => {
  await cleanDatabase()
})

/**
 * Dispara N requisições simultâneas de criação de evento.
 * Retorna todas as respostas (statusCode + body) para análise.
 */
function fireParallel(
  app: FastifyInstance,
  count: number,
  makePayload: (i: number) => {
    entityId: string
    externalId: string
    type: 'info' | 'warning' | 'critical'
    payload?: Record<string, unknown>
  },
) {
  return Promise.all(Array.from({ length: count }, (_, i) => createEvent(app, makePayload(i))))
}

// ─────────────────────────────────────────────────────────
// 1. Idempotência: mesmo external_id, N requests simultâneas
// ─────────────────────────────────────────────────────────

describe('Concorrência — Idempotência por external_id', () => {
  it('20 requests simultâneas com mesmo external_id criam apenas 1 evento', async () => {
    const entity = await createEntity(app, 'Base Echo')
    const CONCURRENCY = 20

    const results = await fireParallel(app, CONCURRENCY, () => ({
      entityId: entity.id,
      externalId: 'ext_duplicado',
      type: 'info',
    }))

    // Todas devem retornar sucesso (201 ou 200)
    const statuses = results.map((r) => r.statusCode)
    expect(statuses.every((s) => s === 200 || s === 201)).toBe(true)

    // Exatamente 1 "created", o resto "duplicate"
    const created = results.filter((r) => r.body.status === 'created')
    const duplicates = results.filter((r) => r.body.status === 'duplicate')

    expect(created).toHaveLength(1)
    expect(duplicates).toHaveLength(CONCURRENCY - 1)

    // Todas retornam o mesmo event.id
    const ids = new Set(results.map((r) => r.body.event.id))
    expect(ids.size).toBe(1)

    // Apenas 1 evento no banco
    const count = await prisma.event.count({ where: { entityId: entity.id } })
    expect(count).toBe(1)
  })
})

// ─────────────────────────────────────────────────────────
// 2. Contador crítico: N events simultâneos, contador exato
// ─────────────────────────────────────────────────────────

describe('Concorrência — Contador de eventos críticos', () => {
  it('5 eventos críticos simultâneos resultam em criticalEventsCount === 5', async () => {
    const entity = await createEntity(app, 'Estação Orbital')
    const CONCURRENCY = 5

    const results = await fireParallel(app, CONCURRENCY, (i) => ({
      entityId: entity.id,
      externalId: `ext_crit_${i}`,
      type: 'critical',
    }))

    // Todos devem ser criados com sucesso
    expect(results.every((r) => r.statusCode === 201)).toBe(true)
    expect(results.every((r) => r.body.status === 'created')).toBe(true)

    // O contador deve ser exatamente CONCURRENCY (sem double-count nem perda)
    const updated = await prisma.entity.findUniqueOrThrow({
      where: { id: entity.id },
    })
    expect(updated.criticalEventsCount).toBe(CONCURRENCY)
    expect(updated.status).toBe('active') // 5 < 10, ainda ativa
  })

  it('eventos info/warning simultâneos não incrementam o contador', async () => {
    const entity = await createEntity(app, 'Fragata Nebulon')
    const CONCURRENCY = 10

    const results = await fireParallel(app, CONCURRENCY, (i) => ({
      entityId: entity.id,
      externalId: `ext_mix_${i}`,
      type: i % 2 === 0 ? 'info' : 'warning',
    }))

    expect(results.every((r) => r.statusCode === 201)).toBe(true)

    const updated = await prisma.entity.findUniqueOrThrow({
      where: { id: entity.id },
    })
    expect(updated.criticalEventsCount).toBe(0)
    expect(updated.status).toBe('active')
  })
})

// ─────────────────────────────────────────────────────────
// 3. Suspensão atômica: atingir o limite exato sob concorrência
// ─────────────────────────────────────────────────────────

describe('Concorrência — Suspensão automática no limite', () => {
  it(`${CRITICAL_EVENTS_LIMIT} eventos críticos simultâneos suspendem a entidade exatamente no limite`, async () => {
    const entity = await createEntity(app, 'Base Starkiller')

    const results = await fireParallel(app, CRITICAL_EVENTS_LIMIT, (i) => ({
      entityId: entity.id,
      externalId: `ext_limit_${i}`,
      type: 'critical',
    }))

    // Todos criados
    expect(results.every((r) => r.statusCode === 201)).toBe(true)

    // Exatamente 1 response deve ter entitySuspended: true (a que atingiu o limite)
    const suspendedResponses = results.filter((r) => r.body.entitySuspended === true)
    expect(suspendedResponses).toHaveLength(1)

    // Entidade deve estar suspensa com contador == CRITICAL_EVENTS_LIMIT
    const updated = await prisma.entity.findUniqueOrThrow({
      where: { id: entity.id },
    })
    expect(updated.status).toBe('suspended')
    expect(updated.criticalEventsCount).toBe(CRITICAL_EVENTS_LIMIT)

    // Total de eventos no banco deve ser exatamente CRITICAL_EVENTS_LIMIT
    const eventCount = await prisma.event.count({ where: { entityId: entity.id } })
    expect(eventCount).toBe(CRITICAL_EVENTS_LIMIT)
  })

  it('eventos além do limite são rejeitados mesmo disparados simultaneamente', async () => {
    const entity = await createEntity(app, 'Posto Avançado')
    const TOTAL = CRITICAL_EVENTS_LIMIT + 5

    const results = await fireParallel(app, TOTAL, (i) => ({
      entityId: entity.id,
      externalId: `ext_over_${i}`,
      type: 'critical',
    }))

    // Separar por resultado
    const created = results.filter((r) => r.statusCode === 201)
    const rejected = results.filter((r) => r.statusCode === 422)

    // Exatamente CRITICAL_EVENTS_LIMIT criados, o resto rejeitado
    expect(created).toHaveLength(CRITICAL_EVENTS_LIMIT)
    expect(rejected).toHaveLength(5)

    // Entidade suspensa
    const updated = await prisma.entity.findUniqueOrThrow({
      where: { id: entity.id },
    })
    expect(updated.status).toBe('suspended')
    expect(updated.criticalEventsCount).toBe(CRITICAL_EVENTS_LIMIT)
  })
})

// ─────────────────────────────────────────────────────────
// 4. Rejeição pós-suspensão: todas as requests simultâneas rejeitadas
// ─────────────────────────────────────────────────────────

describe('Concorrência — Rejeição em entidade suspensa', () => {
  it('requests simultâneas em entidade já suspensa são todas rejeitadas', async () => {
    const entity = await createEntity(app, 'Cruzador Imperial')

    // Suspende a entidade preenchendo o limite
    for (let i = 0; i < CRITICAL_EVENTS_LIMIT; i++) {
      await createEvent(app, {
        entityId: entity.id,
        externalId: `ext_pre_${i}`,
        type: 'critical',
      })
    }

    // Confirma que está suspensa
    const suspended = await prisma.entity.findUniqueOrThrow({
      where: { id: entity.id },
    })
    expect(suspended.status).toBe('suspended')

    // Dispara 15 requests simultâneas contra a entidade suspensa
    const CONCURRENCY = 15
    const results = await fireParallel(app, CONCURRENCY, (i) => ({
      entityId: entity.id,
      externalId: `ext_after_${i}`,
      type: 'info',
    }))

    // Todas devem ser rejeitadas com 422
    expect(results.every((r) => r.statusCode === 422)).toBe(true)

    // Nenhum evento novo no banco
    const newEvents = await prisma.event.count({
      where: {
        entityId: entity.id,
        externalId: { startsWith: 'ext_after_' },
      },
    })
    expect(newEvents).toBe(0)
  })
})
