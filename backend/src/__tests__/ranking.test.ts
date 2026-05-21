import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest'
import type { FastifyInstance } from 'fastify'
import { buildApp, cleanDatabase, createEntity, createEvent } from './helpers.js'

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
// GET /entities/ranking — Ranking de entidades críticas
// ================================================================

describe('GET /entities/ranking', () => {
  it('retorna ranking vazio quando não há eventos críticos', async () => {
    await createEntity(app, 'Entidade Sem Eventos')

    const res = await app.inject({ method: 'GET', url: '/entities/ranking' })
    const body = JSON.parse(res.payload)

    expect(res.statusCode).toBe(200)
    expect(body.data).toEqual([])
  })

  it('ordena entidades do mais crítico para o menos', async () => {
    const entity1 = await createEntity(app, 'Menos Crítica')
    const entity2 = await createEntity(app, 'Mais Crítica')

    // entity1 recebe 1 evento crítico
    await createEvent(app, { entityId: entity1.id, externalId: 'e1_crit_1', type: 'critical' })

    // entity2 recebe 3 eventos críticos
    await createEvent(app, { entityId: entity2.id, externalId: 'e2_crit_1', type: 'critical' })
    await createEvent(app, { entityId: entity2.id, externalId: 'e2_crit_2', type: 'critical' })
    await createEvent(app, { entityId: entity2.id, externalId: 'e2_crit_3', type: 'critical' })

    const res = await app.inject({ method: 'GET', url: '/entities/ranking' })
    const body = JSON.parse(res.payload)

    expect(body.data).toHaveLength(2)
    // A mais crítica vem primeiro
    expect(body.data[0].name).toBe('Mais Crítica')
    expect(body.data[0].recentCriticalCount).toBe(3)
    expect(body.data[1].name).toBe('Menos Crítica')
    expect(body.data[1].recentCriticalCount).toBe(1)
  })

  it('não inclui entidades que só têm eventos info/warning', async () => {
    const entity = await createEntity(app, 'Só Info')

    await createEvent(app, { entityId: entity.id, externalId: 'e_info', type: 'info' })
    await createEvent(app, { entityId: entity.id, externalId: 'e_warn', type: 'warning' })

    const res = await app.inject({ method: 'GET', url: '/entities/ranking' })
    const body = JSON.parse(res.payload)

    expect(body.data).toHaveLength(0)
  })

  it('respeita o parâmetro limit', async () => {
    // Cria 3 entidades com eventos críticos
    for (let i = 0; i < 3; i++) {
      const entity = await createEntity(app, `Entidade ${i}`)
      await createEvent(app, {
        entityId: entity.id,
        externalId: `rank_${i}`,
        type: 'critical',
      })
    }

    const res = await app.inject({ method: 'GET', url: '/entities/ranking?limit=2' })
    const body = JSON.parse(res.payload)

    expect(body.data).toHaveLength(2)
  })
})
