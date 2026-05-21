'use client'

import { use, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  AlertTriangle,
  XCircle,
  Info,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  Send,
  Activity,
  Loader2,
  Ban,
  RotateCcw,
} from 'lucide-react'
import { toast } from 'sonner'

import { PageHeader } from '@/components/layout/page-header'
import { EntityAvatar } from '@/components/ui/entity-avatar'
import { StatusBadge } from '@/components/ui/status-badge'
import { TypeBadge } from '@/components/ui/type-badge'
import { ThreatMeter } from '@/components/ui/threat-meter'
import { KpiCard } from '@/components/ui/kpi-card'
import { JsonView } from '@/components/ui/json-view'
import { EmptyState } from '@/components/ui/empty-state'
import { HourlyChart } from '@/components/charts/hourly-chart'

import { useEntity } from '@/hooks/use-entity'
import { useEntityEvents } from '@/hooks/use-entity-events'
import { useToggleEntityStatus } from '@/hooks/use-toggle-entity-status'
import { formatDateTime, formatRelative, formatTime } from '@/lib/utils'
import { cn } from '@/lib/utils'
import { CRITICAL_EVENTS_LIMIT } from '@/lib/constants'

// ===== Types =====

interface PageProps {
  params: Promise<{ id: string }>
}

// ===== Constants =====

const EVENTS_PER_PAGE = 8

// ===== Severity icons =====

const SEVERITY_ICON: Record<string, React.ReactNode> = {
  info: <Info size={12} strokeWidth={1.6} />,
  warning: <AlertTriangle size={12} strokeWidth={1.6} />,
  critical: <AlertTriangle size={12} strokeWidth={1.6} />,
}

const SEVERITY_ICON_STYLES: Record<string, string> = {
  info: 'bg-info-bg text-info',
  warning: 'bg-warning-bg text-warning',
  critical: 'bg-critical-bg text-critical',
}

// ===== Componente principal =====

export default function EntityDetailPage({ params }: PageProps) {
  const { id } = use(params)
  const router = useRouter()

  const { data: entity, isLoading, error } = useEntity(id)
  const toggleStatus = useToggleEntityStatus()

  // Paginação server-side
  const [eventPage, setEventPage] = useState(1)
  const { data: eventsData, isPlaceholderData } = useEntityEvents({
    entityId: id,
    page: eventPage,
    limit: EVENTS_PER_PAGE,
  })

  const events = useMemo(() => eventsData?.data ?? [], [eventsData])
  const pagination = eventsData?.pagination
  const summary = eventsData?.summary
  const hourlyActivity = useMemo(() => eventsData?.hourlyActivity ?? [], [eventsData])

  const [expandedEvent, setExpandedEvent] = useState<string | null>(null)

  // Derivados
  const isSuspended = entity?.status === 'suspended'
  const isNearLimit =
    !isSuspended && (entity?.criticalEventsCount ?? 0) >= CRITICAL_EVENTS_LIMIT * 0.7

  // KPIs vindos do summary (server-side)
  const last24hStats = useMemo(
    () => summary?.last24h ?? { total: 0, info: 0, warning: 0, critical: 0 },
    [summary],
  )

  // Paginação
  const totalEventPages = pagination?.totalPages ?? 0
  const totalEvents = pagination?.total ?? 0
  const eventsFrom = totalEvents > 0 ? (eventPage - 1) * EVENTS_PER_PAGE + 1 : 0
  const eventsTo = Math.min(eventPage * EVENTS_PER_PAGE, totalEvents)

  // Toggle status handler
  const handleToggleStatus = () => {
    if (!entity) return
    const newStatus = isSuspended ? 'active' : 'suspended'
    toggleStatus.mutate(
      { id: entity.id, status: newStatus },
      {
        onSuccess: () => {
          toast.success(
            newStatus === 'active'
              ? 'A entidade foi reativada com sucesso.'
              : 'A entidade foi suspensa com sucesso.',
          )
        },
        onError: () => {
          toast.error('Não foi possível alterar o status da entidade.')
        },
      },
    )
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Loader2 size={24} className="animate-spin text-text-muted" />
      </div>
    )
  }

  // Not found
  if (error || !entity) {
    return (
      <div className="flex flex-1 px-9 py-12">
        <EmptyState
          icon={<AlertTriangle size={24} strokeWidth={1.6} />}
          title="Entidade não encontrada"
          description="O ID solicitado não existe ou foi removido do registro."
          action={
            <button
              onClick={() => router.push('/')}
              className="inline-flex h-7 cursor-pointer items-center gap-1.5 rounded-sm border border-border bg-surface px-2.5 text-[12.5px] font-medium transition-colors duration-120 hover:bg-surface-2"
            >
              <ArrowLeft size={12} strokeWidth={1.6} />
              Voltar ao dashboard
            </button>
          }
        />
      </div>
    )
  }

  return (
    <>
      <PageHeader
        title={
          <span className="flex items-center gap-3">
            <EntityAvatar name={entity.name} size={32} />
            {entity.name}
            <StatusBadge status={entity.status} />
          </span>
        }
        breadcrumb={
          <>
            <button
              onClick={() => router.push('/')}
              className="cursor-pointer hover:text-text transition-colors"
            >
              Dashboard
            </button>
            <span className="mx-1.5 text-text-faint">/</span>
            <span>{entity.name}</span>
          </>
        }
        subtitle={
          <span className="flex items-center gap-2">
            <span className="font-mono">{entity.id}</span>
            <span className="text-text-faint">·</span>
            <span>criada em {formatDateTime(entity.createdAt)}</span>
          </span>
        }
        actions={
          <div className="flex items-center gap-2.5">
            <button
              onClick={handleToggleStatus}
              disabled={toggleStatus.isPending}
              className="inline-flex h-8.5 cursor-pointer items-center gap-1.75 rounded-lg border border-border bg-surface px-3.5 text-[13px] font-medium transition-colors duration-120 hover:bg-surface-2 hover:border-border-strong disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSuspended ? (
                <RotateCcw size={13} strokeWidth={1.6} />
              ) : (
                <Ban size={13} strokeWidth={1.6} />
              )}
              {isSuspended ? 'Reativar' : 'Suspender'}
            </button>

            <button
              onClick={() => router.push(`/events/new?entityId=${entity.id}`)}
              disabled={isSuspended}
              className="inline-flex h-8.5 cursor-pointer items-center gap-1.75 rounded-lg border border-border bg-surface px-3.5 text-[13px] font-medium transition-colors duration-120 hover:bg-surface-2 hover:border-border-strong disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Send size={13} strokeWidth={1.6} />
              Registrar evento
            </button>
          </div>
        }
      />

      <div className="flex-1 overflow-auto px-9 py-6 pb-12">
        {/* Alerts */}
        {isSuspended && (
          <div className="mb-4.5 flex items-start gap-3 rounded-md border border-critical/20 bg-critical-bg px-4 py-3.5">
            <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-critical/15 text-critical">
              <XCircle size={12} strokeWidth={1.8} />
            </span>
            <div>
              <div className="text-[13px] font-semibold text-critical">Entidade suspensa</div>
              <div className="mt-0.5 text-[12.5px] leading-relaxed text-text-muted">
                Limite de {CRITICAL_EVENTS_LIMIT} eventos críticos foi atingido em{' '}
                {formatDateTime(entity.updatedAt)}. Novos eventos serão rejeitados até reativação
                manual.
              </div>
            </div>
          </div>
        )}

        {isNearLimit && (
          <div className="mb-4.5 flex items-start gap-3 rounded-md border border-warning/20 bg-warning-bg px-4 py-3.5">
            <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-warning/15 text-warning">
              <AlertTriangle size={12} strokeWidth={1.8} />
            </span>
            <div>
              <div className="text-[13px] font-semibold text-warning">
                Próxima do limite crítico
              </div>
              <div className="mt-0.5 text-[12.5px] leading-relaxed text-text-muted">
                {entity.criticalEventsCount} de {CRITICAL_EVENTS_LIMIT} eventos críticos. A próxima
                ocorrência crítica pode acionar a suspensão automática.
              </div>
            </div>
          </div>
        )}

        {/* 2-column layout — fills remaining viewport */}
        <div className="grid items-start gap-6" style={{ gridTemplateColumns: '1fr 320px' }}>
          {/* Left column */}
          <div>
            {/* KPIs */}
            <div className="animate-fade-in-up mb-4.5 grid grid-cols-3 gap-4">
              <KpiCard
                label="Eventos totais"
                value={entity.totalEvents.toLocaleString('pt-BR')}
                footer={`desde ${formatDateTime(entity.createdAt).split(',')[0]}`}
              />
              <KpiCard
                label="Eventos críticos"
                value={
                  <>
                    <span
                      className={cn(isSuspended && 'text-critical', isNearLimit && 'text-warning')}
                    >
                      {entity.criticalEventsCount}
                    </span>
                    <span className="text-[18px] opacity-50"> / {CRITICAL_EVENTS_LIMIT}</span>
                  </>
                }
                footer={
                  <span className="inline-block w-full max-w-30">
                    <ThreatMeter count={entity.criticalEventsCount} />
                  </span>
                }
              />
              <KpiCard
                label="Últimas 24h"
                value={last24hStats.total}
                footer={
                  <span className="flex gap-3">
                    <span>
                      <b className="text-critical">{last24hStats.critical}</b> critical
                    </span>
                    <span>
                      <b className="text-warning">{last24hStats.warning}</b> warning
                    </span>
                  </span>
                }
              />
            </div>

            {/* Hourly chart */}
            <HourlyChart hourlyActivity={hourlyActivity} last24h={last24hStats} />

            {/* Event history */}
            <div className="animate-fade-in-up [animation-delay:120ms] overflow-hidden rounded-md border border-border bg-surface shadow-sm">
              <div className="flex items-start justify-between border-b border-border px-4.5 py-3.5">
                <div>
                  <h3 className="text-[14.5px] font-semibold">Histórico de eventos</h3>
                  <p className="mt-0.5 text-xs text-text-muted">
                    {entity.totalEvents} eventos registrados para esta entidade.
                  </p>
                </div>
              </div>

              {/* Event list or empty */}
              {events.length === 0 && eventPage === 1 ? (
                <div>
                  <EmptyState
                    icon={<Activity size={24} strokeWidth={1.6} />}
                    title="Nenhum evento registrado"
                    description="Esta entidade ainda não recebeu nenhum evento desde sua criação."
                  />
                </div>
              ) : (
                <div
                  className={cn(
                    'flex min-h-[536px] flex-col',
                    isPlaceholderData && 'opacity-60 transition-opacity duration-200',
                  )}
                >
                  {events.map((ev) => {
                    const isExpanded = expandedEvent === ev.id

                    return (
                      <div key={ev.id}>
                        <div
                          onClick={() => setExpandedEvent(isExpanded ? null : ev.id)}
                          className="grid cursor-pointer items-center gap-3.5 border-b border-border px-4.5 py-3 text-[13px] last:border-b-0 hover:bg-surface-2/30"
                          style={{
                            gridTemplateColumns: '80px 32px 1fr auto',
                          }}
                        >
                          {/* Time */}
                          <span className="font-mono text-[11.5px] text-text-muted">
                            {formatTime(ev.createdAt)}
                          </span>

                          {/* Severity icon */}
                          <span
                            className={cn(
                              'grid h-6.5 w-6.5 place-items-center rounded-[7px]',
                              SEVERITY_ICON_STYLES[ev.type],
                            )}
                          >
                            {SEVERITY_ICON[ev.type]}
                          </span>

                          {/* Body */}
                          <div className="min-w-0">
                            <div className="font-medium">
                              Evento <span className="capitalize">{ev.type}</span>
                              <span className="ml-2 font-mono text-[11.5px] font-normal text-text-faint">
                                {ev.id}
                              </span>
                            </div>
                            <div className="mt-0.5 flex flex-wrap items-center gap-2.5 text-xs text-text-muted">
                              <TypeBadge type={ev.type} />
                              <code className="font-mono">{ev.externalId}</code>
                            </div>
                          </div>

                          {/* Expand toggle */}
                          <span className="text-text-muted">
                            {isExpanded ? (
                              <ChevronDown size={14} strokeWidth={1.6} />
                            ) : (
                              <ChevronRight size={14} strokeWidth={1.6} />
                            )}
                          </span>
                        </div>

                        {/* Expanded payload */}
                        {isExpanded && (
                          <div className="pb-4 pl-32.5 pr-4.5 mt-3">
                            <JsonView data={ev.payload} />
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Pagination footer */}
              {totalEvents > 0 && (
                <div className="flex items-center justify-between border-t border-border px-4 py-3">
                  <span className="font-mono text-xs text-text-faint">
                    {eventsFrom}–{eventsTo} de {totalEvents} eventos
                  </span>

                  {totalEventPages > 1 && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setEventPage((p) => p - 1)}
                        disabled={eventPage <= 1}
                        className="inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-md border border-border bg-surface text-text-muted transition-colors duration-120 hover:bg-surface-2 hover:border-border-strong disabled:cursor-default disabled:opacity-35 disabled:pointer-events-none"
                      >
                        <ChevronLeft size={14} strokeWidth={1.6} />
                      </button>

                      {Array.from({ length: totalEventPages }, (_, i) => (
                        <button
                          key={i}
                          onClick={() => setEventPage(i + 1)}
                          className={cn(
                            'inline-flex h-7 min-w-7 cursor-pointer items-center justify-center rounded-md px-1.5 font-mono text-xs font-medium transition-colors duration-120',
                            i + 1 === eventPage
                              ? 'bg-text text-surface'
                              : 'border border-border bg-surface text-text-muted hover:bg-surface-2 hover:border-border-strong',
                          )}
                        >
                          {i + 1}
                        </button>
                      ))}

                      <button
                        onClick={() => setEventPage((p) => p + 1)}
                        disabled={eventPage >= totalEventPages}
                        className="inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-md border border-border bg-surface text-text-muted transition-colors duration-120 hover:bg-surface-2 hover:border-border-strong disabled:cursor-default disabled:opacity-35 disabled:pointer-events-none"
                      >
                        <ChevronRight size={14} strokeWidth={1.6} />
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right column — aligned to top */}
          <div className="animate-fade-in-up [animation-delay:60ms] flex flex-col gap-4">
            {/* Identification card */}
            <div className="overflow-hidden rounded-md border border-border bg-surface shadow-sm">
              <div className="border-b border-border px-4.5 py-3.5">
                <h3 className="text-[14.5px] font-semibold">Identificação</h3>
              </div>
              <div className="px-4.5 py-2">
                <ul className="flex flex-col gap-2.5 py-1.5 text-[12.5px]">
                  <li className="flex items-start justify-between gap-3">
                    <span className="text-text-muted">ID</span>
                    <span className="truncate font-mono text-[11.5px] text-right">{entity.id}</span>
                  </li>
                  <li className="flex items-center justify-between gap-3">
                    <span className="text-text-muted">Status</span>
                    <StatusBadge status={entity.status} />
                  </li>
                  <li className="flex items-center justify-between gap-3">
                    <span className="text-text-muted">Eventos críticos</span>
                    <span className="font-mono">
                      {entity.criticalEventsCount} / {CRITICAL_EVENTS_LIMIT}
                    </span>
                  </li>
                  <li className="flex items-center justify-between gap-3">
                    <span className="text-text-muted">Criada em</span>
                    <span className="text-[11.5px]">{formatDateTime(entity.createdAt)}</span>
                  </li>
                  <li className="flex items-center justify-between gap-3">
                    <span className="text-text-muted">Atualizada em</span>
                    <span className="text-[11.5px]">{formatDateTime(entity.updatedAt)}</span>
                  </li>
                  <li className="flex items-center justify-between gap-3">
                    <span className="text-text-muted">Último evento</span>
                    <span className="text-[11.5px]">
                      {entity.lastEventAt ? formatRelative(entity.lastEventAt) : '—'}
                    </span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Suspension policy card */}
            <div className="overflow-hidden rounded-md border border-border bg-surface shadow-sm">
              <div className="border-b border-border px-4.5 py-3.5">
                <h3 className="text-[14.5px] font-semibold">Política de suspensão</h3>
              </div>
              <div className="px-4.5 py-3.5">
                <p className="text-[12.5px] leading-relaxed text-text-muted">
                  Esta entidade será automaticamente suspensa ao atingir{' '}
                  <b className="text-text">{CRITICAL_EVENTS_LIMIT} eventos críticos</b>. Eventos
                  rejeitados retornarão{' '}
                  <code className="rounded bg-surface-2 px-1.25 py-px font-mono text-[11px]">
                    409 Conflict
                  </code>{' '}
                  ao cliente.
                </p>

                <div className="my-3 border-t border-border" />

                <div className="flex items-center justify-between text-[12.5px]">
                  <span className="text-text-muted">Progresso</span>
                  <span className="font-mono font-medium">
                    {entity.criticalEventsCount}/{CRITICAL_EVENTS_LIMIT}
                  </span>
                </div>

                <div className="mt-2">
                  <ThreatMeter count={entity.criticalEventsCount} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
