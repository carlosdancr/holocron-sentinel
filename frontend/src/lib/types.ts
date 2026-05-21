// ===== Entidade =====

export interface Entity {
  id: string
  name: string
  status: 'active' | 'suspended'
  criticalEventsCount: number
  createdAt: string
  updatedAt: string
  // Agregacoes retornadas pelo GET /entities
  totalEvents: number
  totalCriticalEvents: number
  lastEventAt: string | null
}

export interface EntityListResponse {
  data: Entity[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
  summary: {
    total: number
    active: number
    suspended: number
    totalCriticalEvents: number
    totalEvents: number
    nearLimit: number
  }
}

// ===== Ranking =====

export interface RankingEntity {
  id: string
  name: string
  status: 'active' | 'suspended'
  criticalEventsCount: number
  recentCriticalCount: number
  lastCriticalEventAt: string | null
}

export interface RankingResponse {
  data: RankingEntity[]
}

// ===== Evento =====

export interface Event {
  id: string
  entityId: string
  externalId: string
  type: 'info' | 'warning' | 'critical'
  payload: Record<string, unknown>
  createdAt: string
}

export interface HourlyBucket {
  label: string
  info: number
  warning: number
  critical: number
  total: number
}

export interface EventListResponse {
  data: Event[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
  summary: {
    last24h: {
      total: number
      info: number
      warning: number
      critical: number
    }
  }
  hourlyActivity: HourlyBucket[]
}

// ===== Criacao de evento =====

export interface EventCreatePayload {
  entityId: string
  externalId: string
  type: 'info' | 'warning' | 'critical'
  payload: Record<string, unknown>
}

export interface EventCreateResponse {
  event: Event
  status: 'created' | 'duplicate'
  entitySuspended: boolean
}

// ===== Stream SSE =====

export interface StreamEventData {
  event: Event
  entitySuspended: boolean
}
