import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest'
import type { FastifyInstance } from 'fastify'
import { buildApp, cleanDatabase, createEntity } from './helpers.js'

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
// POST /entities — Criação de entidade
// ================================================================

describe('POST /entities', () => {
  it('cria uma entidade com status "active" e contador zerado', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/entities',
      payload: { name: 'Base Echo' },
    })

    expect(res.statusCode).toBe(201)

    const body = JSON.parse(res.payload)
    expect(body).toMatchObject({
      name: 'Base Echo',
      status: 'active',
      criticalEventsCount: 0,
    })
    expect(body.id).toBeDefined()
    expect(body.createdAt).toBeDefined()
  })

  it('rejeita criação sem nome', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/entities',
      payload: { name: '' },
    })

    expect(res.statusCode).toBe(400)
  })
})

// ================================================================
// GET /entities — Listagem com agregações
// ================================================================

describe('GET /entities', () => {
  it('retorna lista vazia quando não há entidades', async () => {
    const res = await app.inject({ method: 'GET', url: '/entities' })
    const body = JSON.parse(res.payload)

    expect(res.statusCode).toBe(200)
    expect(body.data).toEqual([])
    expect(body.pagination.total).toBe(0)
  })

  it('retorna entidades com total de eventos e último evento', async () => {
    const entity = await createEntity(app, 'Nave Millennium')

    // Registra 2 eventos
    await app.inject({
      method: 'POST',
      url: '/events',
      payload: { entityId: entity.id, externalId: 'evt_1', type: 'info', payload: {} },
    })
    await app.inject({
      method: 'POST',
      url: '/events',
      payload: { entityId: entity.id, externalId: 'evt_2', type: 'critical', payload: {} },
    })

    const res = await app.inject({ method: 'GET', url: '/entities' })
    const body = JSON.parse(res.payload)

    expect(body.data).toHaveLength(1)
    expect(body.data[0].totalEvents).toBe(2)
    expect(body.data[0].lastEventAt).toBeTruthy()
  })

  it('filtra por status', async () => {
    await createEntity(app, 'Ativa 1')
    await createEntity(app, 'Ativa 2')

    const res = await app.inject({
      method: 'GET',
      url: '/entities?status=active',
    })
    const body = JSON.parse(res.payload)

    expect(body.data.length).toBeGreaterThanOrEqual(2)
    expect(body.data.every((e: { status: string }) => e.status === 'active')).toBe(true)
  })

  it('respeita paginação (page + limit)', async () => {
    // Cria 5 entidades
    for (let i = 0; i < 5; i++) {
      await createEntity(app, `Entidade ${i}`)
    }

    const page1 = await app.inject({ method: 'GET', url: '/entities?page=1&limit=2' })
    const body1 = JSON.parse(page1.payload)

    expect(body1.data).toHaveLength(2)
    expect(body1.pagination).toMatchObject({
      page: 1,
      limit: 2,
      total: 5,
      totalPages: 3,
    })

    const page3 = await app.inject({ method: 'GET', url: '/entities?page=3&limit=2' })
    const body3 = JSON.parse(page3.payload)

    expect(body3.data).toHaveLength(1) // Sobra 1 na última página
  })
})

// ================================================================
// GET /entities/:id — Detalhe
// ================================================================

describe('GET /entities/:id', () => {
  it('retorna a entidade com agregações', async () => {
    const entity = await createEntity(app, 'Planeta Hoth')

    const res = await app.inject({ method: 'GET', url: `/entities/${entity.id}` })
    const body = JSON.parse(res.payload)

    expect(res.statusCode).toBe(200)
    expect(body.name).toBe('Planeta Hoth')
    expect(body.totalEvents).toBe(0)
  })

  it('retorna 404 para ID inexistente', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/entities/00000000-0000-0000-0000-000000000000',
    })

    expect(res.statusCode).toBe(404)
  })
})

// ================================================================
// PATCH /entities/:id — Toggle status
// ================================================================

describe('PATCH /entities/:id', () => {
  it('suspende uma entidade ativa', async () => {
    const entity = await createEntity(app)

    const res = await app.inject({
      method: 'PATCH',
      url: `/entities/${entity.id}`,
      payload: { status: 'suspended' },
    })

    expect(res.statusCode).toBe(200)
    expect(JSON.parse(res.payload).status).toBe('suspended')
  })

  it('ao reativar, zera o contador de eventos críticos', async () => {
    const entity = await createEntity(app)

    // Registra um evento crítico para incrementar o contador
    await app.inject({
      method: 'POST',
      url: '/events',
      payload: { entityId: entity.id, externalId: 'crit_1', type: 'critical', payload: {} },
    })

    // Suspende
    await app.inject({
      method: 'PATCH',
      url: `/entities/${entity.id}`,
      payload: { status: 'suspended' },
    })

    // Reativa
    const res = await app.inject({
      method: 'PATCH',
      url: `/entities/${entity.id}`,
      payload: { status: 'active' },
    })

    const body = JSON.parse(res.payload)
    expect(body.status).toBe('active')
    expect(body.criticalEventsCount).toBe(0)
  })
})
