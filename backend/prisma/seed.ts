import 'dotenv/config'
import pg from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../src/generated/prisma/client.js'

const pool = new pg.Pool({ connectionString: process.env['DATABASE_URL'] })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

// ═══════════════════════════════════════════════
// Entidades — pontos estratégicos da galáxia
// ═══════════════════════════════════════════════

const ENTITIES = [
  // Planetas — postos e bases em solo
  'Base Echo — Hoth',
  'Templo Jedi — Coruscant',
  'Posto Avançado — Tatooine',
  'Cidade das Nuvens — Bespin',
  'Refúgio Rebelde — Yavin IV',
  'Floresta Endor — Lua Santuário',
  'Fortaleza Maz — Takodana',
  'Outpost Niima — Jakku',
  'Academia Imperial — Lothal',
  'Minas de Kessel — Kessel',
  'Templo Sith — Malachor',
  'Porto Espacial — Mos Eisley',
  'Cidadela Jedi — Ilum',
  'Refúgio Wookiee — Kashyyyk',
  'Palácio Real — Naboo',
  'Laboratório Kamino — Tipoca City',
  'Mercado Negro — Canto Bight',
  'Favela de Corellia — Coronet City',
  'Colônia de Mineração — Mustafar',
  'Posto de Escuta — Ord Mantell',

  // Bases e estações orbitais
  'Estação de Monitoramento — Scarif',
  'Base Rebelde — Dantooine',
  'Antena de Comunicação — Atollon',
  'Centro de Comando — Mon Cala',
  'Estação Skyhook — Kuat',
  'Plataforma de Defesa — Sullust',
  'Relay Station — Ryloth',
  'Observatório Jedi — Jedha',
  'Posto Médico — Polis Massa',
  'Estação de Reabastecimento — Ring of Kafrene',

  // Naves capitais
  'Millennium Falcon',
  'Fragata Nebulon-B — Redenção',
  'Corveta CR90 — Tantive IV',
  'Cruzador MC80 — Home One',
  'Cargueiro GR-75 — Bright Hope',
  'Fragata MC75 — Raddus',
  'Corveta Hammerhead — Lightmaker',
  'Cruzador MC85 — Ninka',
  'Destroyer Rebelde — Liberty',
  'Nave de Bloqueio — Profundity',

  // Caças e naves leves
  'X-Wing Red Five',
  'U-Wing — Rogue One',
  'Ghost — Espectros',
  'A-Wing — Green Leader',
  'Y-Wing Gold Squadron',
  'B-Wing — Blade Wing',
  'Shuttle Tydirium',
  'Razor Crest',
  'Slave I — Rastreio',
  'Outrider — Dash Rendar',
]

// ═══════════════════════════════════════════════
// Payloads temáticos por tipo de evento
// ═══════════════════════════════════════════════

const INFO_PAYLOADS = [
  { signal_strength: 92, source: 'sensor_grid_7', notes: 'Leitura de rotina confirmada pelo operador.' },
  { frequency: '138.2 MHz', bandwidth: 'nominal', operator: 'K-2SO' },
  { scan_type: 'perimetro', sectors_clear: 12, sectors_total: 12 },
  { crew_count: 47, morale: 'estável', supplies_days: 18 },
  { hyperspace_route: 'Kessel Run', status: 'verificada', parsecs: 12 },
  { temperature_celsius: -32, wind_speed_kmh: 85, visibility: 'moderada' },
  { docking_bay: 'B-7', clearance_level: 3, ship: 'GR-75 Transport' },
  { maintenance_cycle: 14, systems_ok: true, technician: 'Sabine Wren' },
  null, // sem payload
  null,
  { patrol_route: 'Outer Rim — setor 7G', duration_hours: 6 },
  { comms_test: true, latency_ms: 42, relay_station: 'Echo Base Relay' },
]

const WARNING_PAYLOADS = [
  { anomaly: 'oscilação no campo deflector', severity: 'P3', sector: 'Norte' },
  { probe_detected: true, origin: 'desconhecida', distance_km: 340 },
  { shield_power_pct: 43, recommended_action: 'diagnóstico imediato', priority: 'P2' },
  { fuel_remaining_pct: 15, estimated_range_parsecs: 2.3, alert: 'reabastecimento urgente' },
  { encrypted_transmission: true, source: 'frequência Imperial', decryption_status: 'parcial' },
  { seismic_activity: 2.7, richter_scale: true, location: 'quadrante Leste' },
  null,
  { hull_integrity_pct: 72, damage_source: 'detritos asteroidais', repair_eta_hours: 8 },
  { unidentified_vessel: true, trajectory: 'em aproximação', eta_minutes: 45 },
  { power_surge: true, affected_systems: ['comunicação', 'navegação'], duration_seconds: 3.2 },
]

const CRITICAL_PAYLOADS = [
  { threat: 'Star Destroyer detectado', distance_parsecs: 0.3, alert_level: 'VERMELHO' },
  { imperial_troops: 'desembarque confirmado', estimated_count: 500, sector: 'perímetro Sul' },
  { system_failure: 'reator principal', cascade_risk: true, evacuation_recommended: true },
  { breach_detected: true, compromised_area: 'hangar principal', intruders: 'Stormtroopers' },
  { death_star_trajectory: 'alinhada', firing_range: true, time_to_impact_minutes: 28 },
  null,
  { sabotage: true, system: 'gerador de escudos', suspect: 'agente infiltrado' },
  { ion_cannon_hit: true, target: 'corveta de escolta', systems_offline: ['propulsão', 'escudos'] },
]

// ═══════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

/** Gera um Date aleatório nos últimos N dias */
function randomDate(daysBack: number): Date {
  const now = Date.now()
  const offset = Math.random() * daysBack * 24 * 60 * 60 * 1000
  return new Date(now - offset)
}

// ═══════════════════════════════════════════════
// Seed principal
// ═══════════════════════════════════════════════

async function main() {
  console.log('🌌 Iniciando seed do Holocron Sentinel...\n')

  // Limpa dados anteriores
  await prisma.$executeRawUnsafe('TRUNCATE TABLE events, entities CASCADE')
  console.log('🗑️  Tabelas limpas.\n')

  // Cria entidades
  const entities = await Promise.all(
    ENTITIES.map((name) =>
      prisma.entity.create({ data: { name } }),
    ),
  )
  console.log(`✅ ${entities.length} entidades criadas.\n`)

  let totalEvents = 0
  let totalCritical = 0

  for (const entity of entities) {
    // Cada entidade recebe entre 8 e 40 eventos
    const eventCount = randomInt(8, 40)

    // Decide quantos críticos essa entidade terá
    // Suspensas recebem exatamente 10 (o limite); ativas recebem de 0 a 9
    // ~20% das entidades serão suspensas
    const willSuspend = Math.random() < 0.2
    const maxCritical = willSuspend ? 10 : randomInt(0, 9)

    let criticalCount = 0
    const events: Array<{
      entityId: string
      externalId: string
      type: string
      payload: object
      createdAt: Date
    }> = []

    for (let i = 0; i < eventCount; i++) {
      // Decide o tipo do evento
      let type: 'info' | 'warning' | 'critical'

      if (criticalCount < maxCritical && Math.random() < 0.25) {
        type = 'critical'
        criticalCount++
      } else if (Math.random() < 0.3) {
        type = 'warning'
      } else {
        type = 'info'
      }

      // Seleciona payload
      let payload: Record<string, unknown> | null
      if (type === 'critical') {
        payload = pick(CRITICAL_PAYLOADS)
      } else if (type === 'warning') {
        payload = pick(WARNING_PAYLOADS)
      } else {
        payload = pick(INFO_PAYLOADS)
      }

      events.push({
        entityId: entity.id,
        externalId: `seed_${entity.id.slice(0, 8)}_${i.toString().padStart(3, '0')}`,
        type,
        payload: payload ?? {},
        createdAt: randomDate(10), // últimos 10 dias (cobre janela de 7 dias do ranking)
      })
    }

    // Insere eventos em batch
    await prisma.event.createMany({ data: events })

    // Atualiza o contador e status da entidade
    const shouldSuspend = criticalCount >= 10
    await prisma.entity.update({
      where: { id: entity.id },
      data: {
        criticalEventsCount: criticalCount,
        ...(shouldSuspend && { status: 'suspended' }),
      },
    })

    const statusLabel = shouldSuspend ? '🔴 suspensa' : '🟢 ativa'
    console.log(
      `   ${entity.name.padEnd(42)} → ${eventCount.toString().padStart(2)} eventos (${criticalCount} críticos) ${statusLabel}`,
    )

    totalEvents += eventCount
    totalCritical += criticalCount
  }

  console.log(`\n📊 Resumo:`)
  console.log(`   Entidades:       ${entities.length}`)
  console.log(`   Eventos totais:  ${totalEvents}`)
  console.log(`   Eventos críticos: ${totalCritical}`)
  console.log(`   Suspensas:       ${entities.length} × ~20% = ~${Math.round(entities.length * 0.2)}`)
  console.log(`\n✨ Seed concluído! Que a Força esteja com você.`)
}

main()
  .catch((e) => {
    console.error('❌ Erro no seed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
    await pool.end()
  })
