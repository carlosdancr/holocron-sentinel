'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Pause, Play, Trash2, AlertTriangle, Info, Activity } from 'lucide-react'

import { PageHeader } from '@/components/layout/page-header'
import { LivePill } from '@/components/ui/live-pill'
import { ChipGroup } from '@/components/ui/chip-group'
import { TypeBadge } from '@/components/ui/type-badge'
import { JsonView } from '@/components/ui/json-view'
import { EmptyState } from '@/components/ui/empty-state'

import { useEventStream } from '@/hooks/use-event-stream'
import { useEntities } from '@/hooks/use-entities'
import { formatTime } from '@/lib/utils'
import { cn } from '@/lib/utils'
import type { Entity } from '@/lib/types'

// ===== Helpers =====

type EventType = 'info' | 'warning' | 'critical'

const SEVERITY_ICON: Record<EventType, React.ReactNode> = {
  info: <Info size={12} strokeWidth={1.6} />,
  warning: <AlertTriangle size={12} strokeWidth={1.6} />,
  critical: <AlertTriangle size={12} strokeWidth={1.6} />,
}

const SEVERITY_ICON_STYLES: Record<EventType, string> = {
  info: 'bg-info-bg text-info',
  warning: 'bg-warning-bg text-warning',
  critical: 'bg-critical-bg text-critical',
}

function resolveEntityName(entityId: string, entities: Entity[]): string {
  const entity = entities.find((e) => e.id === entityId)
  return entity?.name || entityId.slice(0, 8)
}

// ===== Componente principal =====

export default function FeedPage() {
  const router = useRouter()
  const { events, status, paused, pause, resume, clear } = useEventStream()
  const { data: entitiesData } = useEntities({ limit: 100 })
  const entities = entitiesData?.data ?? []

  const [typeFilter, setTypeFilter] = useState<'all' | EventType>('all')
  const [expandedPayload, setExpandedPayload] = useState<string | null>(null)

  // Filtro por tipo
  const filtered = useMemo(
    () => events.filter((e) => typeFilter === 'all' || e.event.type === typeFilter),
    [events, typeFilter],
  )

  // Contadores para os chips
  const stats = useMemo(
    () => ({
      total: events.length,
      info: events.filter((e) => e.event.type === 'info').length,
      warning: events.filter((e) => e.event.type === 'warning').length,
      critical: events.filter((e) => e.event.type === 'critical').length,
    }),
    [events],
  )

  // Status da pill
  const pillStatus = paused ? 'paused' : status

  return (
    <>
      <PageHeader
        title="Feed em tempo real"
        subtitle="Stream contínuo via Server-Sent Events. Novos eventos são exibidos sem refresh."
        actions={
          <>
            <LivePill status={pillStatus} />
            <button
              onClick={paused ? resume : pause}
              className="inline-flex h-[34px] items-center gap-[7px] rounded-lg border border-border bg-surface px-3.5 text-[13px] font-medium transition-colors duration-[120ms] hover:bg-surface-2 hover:border-border-strong"
            >
              {paused ? (
                <Play size={13} strokeWidth={1.6} />
              ) : (
                <Pause size={13} strokeWidth={1.6} />
              )}
              {paused ? 'Retomar' : 'Pausar'}
            </button>
            <button
              onClick={clear}
              disabled={events.length === 0}
              className="inline-flex h-[34px] items-center gap-[7px] rounded-lg border border-border bg-surface px-3.5 text-[13px] font-medium transition-colors duration-[120ms] hover:bg-surface-2 hover:border-border-strong disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Trash2 size={13} strokeWidth={1.6} />
              Limpar
            </button>
          </>
        }
      />

      <div className="flex flex-1 min-h-0 flex-col overflow-hidden px-9 py-6">
        <div className="animate-fade-in-up flex min-h-0 flex-1 flex-col overflow-hidden rounded-[10px] border border-border bg-surface shadow-sm">
          {/* Controls bar */}
          <div className="shrink-0 flex flex-wrap items-center gap-2.5 border-b border-border px-3.5 py-3">
            <ChipGroup
              value={typeFilter}
              onChange={(v) => setTypeFilter(v as 'all' | EventType)}
              options={[
                { value: 'all', label: 'Tudo', count: stats.total },
                { value: 'info', label: 'Info', count: stats.info },
                { value: 'warning', label: 'Warning', count: stats.warning },
                { value: 'critical', label: 'Critical', count: stats.critical },
              ]}
            />

            <div className="ml-auto flex items-center gap-3 font-mono text-xs text-text-muted">
              <span>GET /events/stream</span>
              <span className="opacity-50">·</span>
              <span>{events.length} eventos buffered</span>
            </div>
          </div>

          {/* Feed list ou empty state */}
          {filtered.length === 0 ? (
            <div className="flex flex-1 min-h-0 items-center justify-center">
              <EmptyState
                icon={<Activity size={24} strokeWidth={1.6} />}
                title={
                  typeFilter === 'all' ? 'Aguardando eventos...' : 'Nenhum evento neste filtro'
                }
                description={
                  typeFilter === 'all'
                    ? 'O stream esta conectado. Novos eventos aparecerao aqui assim que forem registrados.'
                    : 'Tente trocar para "Tudo" ou esperar por novos eventos do tipo selecionado.'
                }
                action={
                  paused ? (
                    <button
                      onClick={resume}
                      className="inline-flex h-7 items-center gap-1.5 rounded-[6px] border border-border bg-surface px-2.5 text-[12.5px] font-medium transition-colors duration-[120ms] hover:bg-surface-2"
                    >
                      <Play size={12} strokeWidth={1.6} />
                      Retomar stream
                    </button>
                  ) : undefined
                }
              />
            </div>
          ) : (
            <div className="flex flex-1 min-h-0 flex-col overflow-auto">
              {filtered.map((item) => {
                const ev = item.event
                const isExpanded = expandedPayload === ev.id
                const entityName = resolveEntityName(ev.entityId, entities)

                return (
                  <div key={ev.id}>
                    {/* Feed row */}
                    <div
                      className={cn(
                        'grid items-center gap-3.5 border-b border-border px-[18px] py-3 text-[13px] last:border-b-0',
                        item.__new && 'feed-row-new',
                      )}
                      style={{ gridTemplateColumns: '80px 32px 1fr auto' }}
                    >
                      {/* Horario */}
                      <span className="font-mono text-[11.5px] text-text-muted">
                        {formatTime(ev.createdAt)}
                      </span>

                      {/* Icone de severidade */}
                      <span
                        className={cn(
                          'grid h-[26px] w-[26px] place-items-center rounded-[7px]',
                          SEVERITY_ICON_STYLES[ev.type],
                        )}
                      >
                        {SEVERITY_ICON[ev.type]}
                      </span>

                      {/* Body */}
                      <div className="min-w-0">
                        <div className="font-medium">
                          Evento <span className="capitalize">{ev.type}</span>
                          <span className="ml-2 text-xs font-normal text-text-faint">
                            em{' '}
                            <button
                              onClick={() => router.push(`/entities/${ev.entityId}`)}
                              className="font-medium text-text-muted hover:text-text"
                            >
                              {entityName}
                            </button>
                          </span>
                        </div>
                        <div className="mt-0.5 flex flex-wrap items-center gap-2.5 text-xs text-text-muted">
                          <TypeBadge type={ev.type} />
                          <code className="font-mono">{ev.externalId}</code>
                          <span className="font-mono text-[11px] text-text-faint">
                            {ev.id.slice(0, 8)}
                          </span>
                        </div>
                      </div>

                      {/* Toggle payload */}
                      <button
                        onClick={() => setExpandedPayload(isExpanded ? null : ev.id)}
                        className="inline-flex h-7 items-center rounded-[6px] border border-border bg-surface px-2.5 text-[12.5px] font-medium transition-colors duration-[120ms] hover:bg-surface-2"
                      >
                        {isExpanded ? 'Ocultar' : 'Payload'}
                      </button>
                    </div>

                    {/* Payload expandido */}
                    {isExpanded && (
                      <div className="pb-4 pl-[130px] pr-[18px] mt-3">
                        <JsonView data={ev.payload} />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {/* Scrim footer */}
          <div className="shrink-0 border-t border-border py-3.5 text-center font-mono text-xs text-text-faint">
            Buffer limitado a 100 eventos · auto-scroll {paused ? 'pausado' : 'ativo'} · reconexão
            automática habilitada
          </div>
        </div>
      </div>
    </>
  )
}
