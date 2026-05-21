import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest'
import type { FastifyInstance } from 'fastify'
import { buildApp, cleanDatabase, createEntity, createEvent } from './helpers.js'
import { CRITICAL_EVENTS_LIMIT } from '../config/constants.js'

let app: FastifyInstance

beforeAll(async () => {
  app = await buildApp()
})

beforeEach(async () => {
  await cleanDatabase()
})

afterAll(async () => {
  await cleanDatabase()
  await app.close()
})

// ================================================================
// POST /events — Registro de eventos
// ================================================================

describe('POST /events — registro básico', () => {
  it('registra um evento info com sucesso (201)', async () => {
    const entity = await createEntity(app)

    const { statusCode, body } = await createEvent(app, {
      entityId: entity.id,
      externalId: 'ext_abc123',
      type: 'info',
      payload: { signal: 42 },
    })

    expect(statusCode).toBe(201)
    expect(body.status).toBe('created')
    expect(body.event.type).toBe('info')
    expect(body.event.externalId).toBe('ext_abc123')
    expect(body.entitySuspended).toBe(false)
  })

  it('rejeita evento para entidade inexistente (404)', async () => {
    const { statusCode } = await createEvent(app, {
      entityId: '00000000-0000-0000-0000-000000000000',
      externalId: 'ext_ghost',
      type: 'info',
    })

    expect(statusCode).toBe(404)
  })

  it('rejeita evento para entidade suspensa (422)', async () => {
    const entity = await createEntity(app)

    // Suspende a entidade via suspensão automática (10 eventos críticos)
    for (let i = 0; i < CRITICAL_EVENTS_LIMIT; i++) {
      await createEvent(app, {
        entityId: entity.id,
        externalId: `crit_suspend_${i}`,
        type: 'critical',
      })
    }

    const { statusCode } = await createEvent(app, {
      entityId: entity.id,
      externalId: 'ext_rejected',
      type: 'info',
    })

    expect(statusCode).toBe(422)
  })
})

// ================================================================
// Idempotência
// ================================================================

describe('POST /events — idempotência', () => {
  it('retorna o evento original ao reenviar o mesmo external_id (200)', async () => {
    const entity = await createEntity(app)

    const first = await createEvent(app, {
      entityId: entity.id,
      externalId: 'ext_idem_01',
      type: 'warning',
    })

    const second = await createEvent(app, {
      entityId: entity.id,
      externalId: 'ext_idem_01',
      type: 'warning',
    })

    expect(first.statusCode).toBe(201)
    expect(second.statusCode).toBe(200)
    expect(second.body.status).toBe('duplicate')
    // Mesmo ID interno
    expect(second.body.event.id).toBe(first.body.event.id)
  })

  it('não incrementa o contador ao reenviar evento crítico duplicado', async () => {
    const entity = await createEntity(app)

    await createEvent(app, {
      entityId: entity.id,
      externalId: 'ext_crit_dup',
      type: 'critical',
    })

    // Reenvio — não deve incrementar o contador
    await createEvent(app, {
      entityId: entity.id,
      externalId: 'ext_crit_dup',
      type: 'critical',
    })

    // Verifica que o contador é 1, não 2
    const res = await app.inject({ method: 'GET', url: `/entities/${entity.id}` })
    const body = JSON.parse(res.payload)
    expect(body.criticalEventsCount).toBe(1)
  })
})

// ================================================================
// Suspensão automática
// ================================================================

describe('POST /events — suspensão automática', () => {
  it(`suspende a entidade ao atingir ${CRITICAL_EVENTS_LIMIT} eventos críticos`, async () => {
    const entity = await createEntity(app)

    // Registra eventos críticos até o limite
    for (let i = 0; i < CRITICAL_EVENTS_LIMIT; i++) {
      const { statusCode, body } = await createEvent(app, {
        entityId: entity.id,
        externalId: `ext_auto_${i}`,
        type: 'critical',
      })

      expect(statusCode).toBe(201)

      if (i < CRITICAL_EVENTS_LIMIT - 1) {
        // Antes do limite: entidade continua ativa
        expect(body.entitySuspended).toBe(false)
      } else {
        // No limite: entidade é suspensa na mesma transação
        expect(body.entitySuspended).toBe(true)
      }
    }

    // Confirma que a entidade está suspensa no banco
    const res = await app.inject({ method: 'GET', url: `/entities/${entity.id}` })
    const body = JSON.parse(res.payload)
    expect(body.status).toBe('suspended')
    expect(body.criticalEventsCount).toBe(CRITICAL_EVENTS_LIMIT)
  })

  it('rejeita novos eventos após suspensão automática', async () => {
    const entity = await createEntity(app)

    // Leva ao limite
    for (let i = 0; i < CRITICAL_EVENTS_LIMIT; i++) {
      await createEvent(app, {
        entityId: entity.id,
        externalId: `ext_fill_${i}`,
        type: 'critical',
      })
    }

    // Tenta registrar mais um — deve ser rejeitado
    const { statusCode } = await createEvent(app, {
      entityId: entity.id,
      externalId: 'ext_after_suspend',
      type: 'info',
    })

    expect(statusCode).toBe(422)
  })

  it('eventos info e warning NÃO incrementam o contador crítico', async () => {
    const entity = await createEntity(app)

    await createEvent(app, { entityId: entity.id, externalId: 'ext_info_1', type: 'info' })
    await createEvent(app, { entityId: entity.id, externalId: 'ext_warn_1', type: 'warning' })
    await createEvent(app, { entityId: entity.id, externalId: 'ext_info_2', type: 'info' })

    const res = await app.inject({ method: 'GET', url: `/entities/${entity.id}` })
    const body = JSON.parse(res.payload)

    expect(body.criticalEventsCount).toBe(0)
    expect(body.status).toBe('active')
    expect(body.totalEvents).toBe(3)
  })
})

// ================================================================
// GET /entities/:entityId/events — Histórico paginado
// ================================================================

describe('GET /entities/:entityId/events', () => {
  it('retorna eventos paginados da entidade', async () => {
    const entity = await createEntity(app)

    for (let i = 0; i < 5; i++) {
      await createEvent(app, {
        entityId: entity.id,
        externalId: `ext_hist_${i}`,
        type: 'info',
      })
    }

    const res = await app.inject({
      method: 'GET',
      url: `/entities/${entity.id}/events?page=1&limit=3`,
    })
    const body = JSON.parse(res.payload)

    expect(res.statusCode).toBe(200)
    expect(body.data).toHaveLength(3)
    expect(body.pagination).toMatchObject({
      page: 1,
      limit: 3,
      total: 5,
      totalPages: 2,
    })
  })

  it('retorna eventos ordenados do mais recente ao mais antigo', async () => {
    const entity = await createEntity(app)

    await createEvent(app, { entityId: entity.id, externalId: 'first', type: 'info' })
    await createEvent(app, { entityId: entity.id, externalId: 'second', type: 'warning' })
    await createEvent(app, { entityId: entity.id, externalId: 'third', type: 'critical' })

    const res = await app.inject({
      method: 'GET',
      url: `/entities/${entity.id}/events?page=1&limit=10`,
    })
    const body = JSON.parse(res.payload)

    // O mais recente (third/critical) vem primeiro
    expect(body.data[0].externalId).toBe('third')
    expect(body.data[2].externalId).toBe('first')
  })
})
