/**
 * 🛰️ Simulador de eventos em tempo real — Holocron Sentinel
 *
 * Envia eventos via POST /events em intervalos aleatórios,
 * permitindo acompanhar o feed SSE e o processamento no dashboard.
 *
 * Uso:
 *   npx tsx scripts/simulate.ts                  # padrão: 1-3s entre eventos
 *   npx tsx scripts/simulate.ts --fast           # 0.3-1s (rajada)
 *   npx tsx scripts/simulate.ts --slow           # 3-8s (monitoramento calmo)
 *   npx tsx scripts/simulate.ts --critical-bias  # ~40% dos eventos são critical
 */

const API_BASE = process.env['API_URL'] ?? 'http://localhost:3333'

// ═══════════════════════════════════════════════
// CLI flags
// ═══════════════════════════════════════════════

const args = process.argv.slice(2)
const fast = args.includes('--fast')
const slow = args.includes('--slow')
const criticalBias = args.includes('--critical-bias')

const INTERVAL_MIN = fast ? 300 : slow ? 3000 : 1000
const INTERVAL_MAX = fast ? 1000 : slow ? 8000 : 3000

// ═══════════════════════════════════════════════
// Payloads temáticos
// ═══════════════════════════════════════════════

const INFO_PAYLOADS = [
  {
    signal_strength: 92,
    source: 'sensor_grid_7',
    notes: 'Leitura de rotina confirmada pelo operador.',
  },
  { frequency: '138.2 MHz', bandwidth: 'nominal', operator: 'K-2SO' },
  { scan_type: 'perimetro', sectors_clear: 12, sectors_total: 12 },
  { crew_count: 47, morale: 'estável', supplies_days: 18 },
  { hyperspace_route: 'Kessel Run', status: 'verificada', parsecs: 12 },
  { patrol_route: 'Outer Rim — setor 7G', duration_hours: 6 },
  { comms_test: true, latency_ms: 42, relay_station: 'Echo Base Relay' },
  { docking_bay: 'B-7', clearance_level: 3, ship: 'GR-75 Transport' },
  { maintenance_cycle: 14, systems_ok: true, technician: 'Sabine Wren' },
]

const WARNING_PAYLOADS = [
  { anomaly: 'oscilação no campo deflector', severity: 'P3', sector: 'Norte' },
  { probe_detected: true, origin: 'desconhecida', distance_km: 340 },
  { shield_power_pct: 43, recommended_action: 'diagnóstico imediato', priority: 'P2' },
  { fuel_remaining_pct: 15, estimated_range_parsecs: 2.3, alert: 'reabastecimento urgente' },
  { encrypted_transmission: true, source: 'frequência Imperial', decryption_status: 'parcial' },
  { hull_integrity_pct: 72, damage_source: 'detritos asteroidais', repair_eta_hours: 8 },
  { unidentified_vessel: true, trajectory: 'em aproximação', eta_minutes: 45 },
]

const CRITICAL_PAYLOADS = [
  { threat: 'Star Destroyer detectado', distance_parsecs: 0.3, alert_level: 'VERMELHO' },
  { imperial_troops: 'desembarque confirmado', estimated_count: 500, sector: 'perímetro Sul' },
  { system_failure: 'reator principal', cascade_risk: true, evacuation_recommended: true },
  { breach_detected: true, compromised_area: 'hangar principal', intruders: 'Stormtroopers' },
  { sabotage: true, system: 'gerador de escudos', suspect: 'agente infiltrado' },
  { ion_cannon_hit: true, target: 'corveta de escolta', systems_offline: ['propulsão', 'escudos'] },
]

// ═══════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function randomType(): 'info' | 'warning' | 'critical' {
  const r = Math.random()
  if (criticalBias) {
    if (r < 0.4) return 'critical'
    if (r < 0.65) return 'warning'
    return 'info'
  }
  // Distribuição padrão: ~60% info, ~25% warning, ~15% critical
  if (r < 0.15) return 'critical'
  if (r < 0.4) return 'warning'
  return 'info'
}

function payloadFor(type: 'info' | 'warning' | 'critical'): Record<string, unknown> {
  if (type === 'critical') return pick(CRITICAL_PAYLOADS)
  if (type === 'warning') return pick(WARNING_PAYLOADS)
  return pick(INFO_PAYLOADS)
}

const TYPE_ICON: Record<string, string> = {
  info: '🔵',
  warning: '🟡',
  critical: '🔴',
}

let counter = 0

// ═══════════════════════════════════════════════
// Buscar entidades ativas
// ═══════════════════════════════════════════════

interface Entity {
  id: string
  name: string
  status: string
  criticalEventsCount: number
}

async function fetchActiveEntities(): Promise<Entity[]> {
  const res = await fetch(`${API_BASE}/entities?limit=100&status=active`)
  if (!res.ok) throw new Error(`GET /entities falhou: ${res.status}`)
  const json = (await res.json()) as { data: Entity[] }
  return json.data
}

// ═══════════════════════════════════════════════
// Enviar evento
// ═══════════════════════════════════════════════

async function sendEvent(entity: Entity) {
  const type = randomType()
  const payload = payloadFor(type)
  const externalId = `sim_${Date.now()}_${(++counter).toString().padStart(5, '0')}`

  const body = {
    entityId: entity.id,
    externalId,
    type,
    payload,
  }

  const res = await fetch(`${API_BASE}/events`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  const json = (await res.json()) as { status?: string; entitySuspended?: boolean; error?: string }

  if (res.ok) {
    const suspended = json.entitySuspended ? ' ⛔ SUSPENSA!' : ''
    console.log(
      `${TYPE_ICON[type]} ${type.padEnd(8)} → ${entity.name.padEnd(40)} [${externalId}]${suspended}`,
    )
    return json.entitySuspended ?? false
  } else if (res.status === 422) {
    console.log(`⛔ rejeitado  → ${entity.name.padEnd(40)} (entidade suspensa)`)
    return 'rejected' as const
  } else {
    console.error(`❌ erro ${res.status} → ${entity.name}: ${json.error ?? 'unknown'}`)
    return false
  }
}

// ═══════════════════════════════════════════════
// Loop principal
// ═══════════════════════════════════════════════

async function main() {
  console.log('🛰️  Holocron Sentinel — Simulador de eventos')
  console.log(`   API: ${API_BASE}`)
  console.log(
    `   Modo: ${fast ? '⚡ fast' : slow ? '🐢 slow' : '🔄 normal'}${criticalBias ? ' + critical-bias' : ''}`,
  )
  console.log(`   Intervalo: ${INTERVAL_MIN}-${INTERVAL_MAX}ms`)
  console.log('   Ctrl+C para parar\n')

  let entities = await fetchActiveEntities()

  if (entities.length === 0) {
    console.error('❌ Nenhuma entidade ativa encontrada. Execute npm run seed primeiro.')
    process.exit(1)
  }

  console.log(`✅ ${entities.length} entidades ativas carregadas.\n`)

  let eventsSent = 0
  let suspensions = 0

  // Recarrega a lista a cada 30 eventos (para refletir suspensões)
  const REFRESH_INTERVAL = 30

  while (true) {
    if (entities.length === 0) {
      console.log('\n⚠️  Todas as entidades foram suspensas! Recarregando lista...')
      entities = await fetchActiveEntities()
      if (entities.length === 0) {
        console.log('❌ Nenhuma entidade ativa restante. Encerrando.')
        break
      }
    }

    const entity = pick(entities)
    const result = await sendEvent(entity)

    if (result === true) {
      suspensions++
      // Remove a entidade suspensa da lista local
      entities = entities.filter((e) => e.id !== entity.id)
    } else if (result === 'rejected') {
      entities = entities.filter((e) => e.id !== entity.id)
    }

    eventsSent++

    // Recarrega periodicamente
    if (eventsSent % REFRESH_INTERVAL === 0) {
      entities = await fetchActiveEntities()
    }

    const delay = randomInt(INTERVAL_MIN, INTERVAL_MAX)
    await new Promise((r) => setTimeout(r, delay))
  }

  console.log(`\n📊 Resumo da simulação:`)
  console.log(`   Eventos enviados: ${eventsSent}`)
  console.log(`   Suspensões: ${suspensions}`)
}

main().catch((e) => {
  console.error('❌ Erro fatal:', e)
  process.exit(1)
})
