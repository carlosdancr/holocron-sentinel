/* Mock data for Holocron Sentinel prototype
 *
 * Schema (estrito, conforme backend):
 *   Entity: id, name, status, critical_events_count, created_at, updated_at
 *   Event : id, entity_id, external_id, type, payload, created_at
 *
 * Campos derivados retornados pelos endpoints (não armazenados na entidade):
 *   - total_events     (GET /entities — agregação)
 *   - last_event_at    (GET /entities — agregação)
 *   - crit_7d          (GET /entities/ranking — agregação janela 7d)
 *
 * Campos derivados puramente no frontend:
 *   - entity_name no evento (join por entity_id para exibição)
 */

;(function () {
  const ENTITIES_SEED = [
    'Estação Vexa-7',
    'Aeroposto Kessandar',
    'Planeta Lumira',
    'Cruzador Norvell',
    'Base Hidden Ember',
    'Planeta Asha-Mor',
    'Posto Avante-Drell',
    'Nave Aurora-VI',
    'Base Sólvet',
    'Planeta Cerrithon',
    'Posto Frigida',
    'Corveta Pyrra',
    'Base Korren Hollow',
    'Planeta Veshti',
    'Estação Mareth',
    'Nave Halcyon',
    'Posto Brennix-2',
    'Planeta Solharra',
    'Cruzador Velmar',
    'Base Inferno-Rift',
    'Posto Echo-Alpha',
    'Planeta Trondheim',
    'Nave Spectra',
    'Base Quietude',
    'Posto Marquise',
  ]

  const CRITICAL_LIMIT = 10

  function fmtId(i) {
    return 'ENT-' + String(7000 + i).padStart(4, '0')
  }

  // Deterministic pseudo-random (mulberry32)
  function mulberry32(seed) {
    return function () {
      let t = (seed += 0x6d2b79f5)
      t = Math.imul(t ^ (t >>> 15), t | 1)
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296
    }
  }
  const rand = mulberry32(42)

  const now = Date.now()
  const DAY = 24 * 60 * 60 * 1000

  const entities = ENTITIES_SEED.map((name, i) => {
    const totalEvents = Math.floor(rand() * 1800 + 30)
    let criticalCount = Math.floor(rand() * 12)
    if (i === 0) criticalCount = 11
    if (i === 1) criticalCount = 9
    if (i === 2) criticalCount = 8
    if (i === 3) criticalCount = 7
    if (i === 4) criticalCount = 2

    const status = criticalCount >= CRITICAL_LIMIT ? 'suspended' : 'active'
    const lastEventOffset = Math.floor(rand() * 6 * 60 * 60 * 1000)
    const createdOffset = Math.floor(rand() * 90 * DAY) + 7 * DAY

    return {
      // schema fields
      id: fmtId(i),
      name,
      status,
      critical_events_count: criticalCount,
      created_at: new Date(now - createdOffset).toISOString(),
      updated_at: new Date(now - lastEventOffset).toISOString(),
      // aggregations returned by listing endpoint
      total_events: totalEvents,
      last_event_at: new Date(now - lastEventOffset).toISOString(),
      // aggregation returned by ranking endpoint
      crit_7d: Math.min(criticalCount, Math.floor(rand() * 10 + 1)),
    }
  })

  const TYPES = ['info', 'warning', 'critical']

  // Payload templates per severity — backend doesn't store title/reason,
  // so we keep that flavor inside the payload (JSON livre).
  const PAYLOAD_TEMPLATES = {
    info: [
      { event: 'heartbeat', note: 'ping de status periódico' },
      { event: 'telemetry_sync', note: 'telemetria atualizada' },
      { event: 'channel_open', note: 'novo canal seguro estabelecido' },
      { event: 'patrol_route_completed', note: 'rota concluída sem ocorrências' },
      { event: 'firmware_update', version: '3.12.4' },
    ],
    warning: [
      { event: 'latency_spike', note: 'RTT acima do baseline' },
      { event: 'signal_degraded', drop_pct: 18 },
      { event: 'external_scan', source_unknown: true },
      { event: 'gravitational_anomaly', note: 'leitura instável' },
      { event: 'low_resource', resource: 'power', level_pct: 22 },
    ],
    critical: [
      { event: 'imperial_incursion', note: 'TIE fighters confirmados' },
      { event: 'perimeter_breach', silenced_sensors: [4, 7] },
      { event: 'comms_lost', note: 'perda total de telemetria' },
      { event: 'intrusion_attempt', target: 'auth_service' },
      { event: 'distress_signal', triggered_by: 'operator' },
    ],
  }

  function pickType(r) {
    const x = r()
    if (x < 0.7) return 'info'
    if (x < 0.92) return 'warning'
    return 'critical'
  }

  const events = []
  let evIdx = 0
  const evRand = mulberry32(101)
  for (let i = 0; i < 220; i++) {
    const ent = entities[Math.floor(evRand() * entities.length)]
    if (ent.status === 'suspended' && evRand() > 0.05) continue
    const type = pickType(evRand)
    const tpl = PAYLOAD_TEMPLATES[type][Math.floor(evRand() * PAYLOAD_TEMPLATES[type].length)]
    const offset = Math.floor(evRand() * 24 * 60 * 60 * 1000)
    events.push({
      // schema fields
      id: 'EVT-' + String(810000 + evIdx).padStart(7, '0'),
      entity_id: ent.id,
      external_id: 'ext_' + Math.floor(evRand() * 9e9).toString(36),
      type,
      payload: {
        ...tpl,
        signal_strength: Math.round(evRand() * 100),
        source: 'sensor_grid_' + (Math.floor(evRand() * 12) + 1),
        priority: type === 'critical' ? 'P1' : type === 'warning' ? 'P2' : 'P3',
      },
      created_at: new Date(now - offset).toISOString(),
      // frontend-only join for display
      entity_name: ent.name,
    })
    evIdx++
  }
  events.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))

  // Streaming generator for the live feed (mock)
  function generateLiveEvent() {
    const r = Math.random
    const candidates = entities.filter((e) => e.status === 'active')
    const ent = candidates[Math.floor(r() * candidates.length)]
    const type = pickType(r)
    const tpl = PAYLOAD_TEMPLATES[type][Math.floor(r() * PAYLOAD_TEMPLATES[type].length)]
    return {
      id: 'EVT-' + String(820000 + Math.floor(r() * 999)).padStart(7, '0'),
      entity_id: ent.id,
      external_id: 'ext_live_' + Math.floor(r() * 9e9).toString(36),
      type,
      payload: {
        ...tpl,
        signal_strength: Math.round(r() * 100),
        source: 'sensor_grid_' + (Math.floor(r() * 12) + 1),
        priority: type === 'critical' ? 'P1' : type === 'warning' ? 'P2' : 'P3',
      },
      created_at: new Date().toISOString(),
      entity_name: ent.name,
    }
  }

  window.HolocronData = {
    entities,
    events,
    CRITICAL_LIMIT,
    generateLiveEvent,
    TYPES,
  }
})()
