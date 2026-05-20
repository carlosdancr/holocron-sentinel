'use client'

import { use, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  AlertTriangle,
  XCircle,
  Info,
  ChevronRight,
  ChevronDown,
  Send,
  Activity,
  Loader2,
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
  const { data: eventsData } = useEntityEvents({ entityId: id, page: 1, limit: 100 })
  const toggleStatus = useToggleEntityStatus()

  const events = eventsData?.data ?? []
  const pagination = eventsData?.pagination

  const [expandedEvent, setExpandedEvent] = useState<string | null>(null)

  // Derivados
  const isSuspended = entity?.status === 'suspended'
  const isNearLimit =
    !isSuspended &&
    (entity?.criticalEventsCount ?? 0) >= CRITICAL_EVENTS_LIMIT * 0.7

  // Eventos das ultimas 24h (para KPI)
  const last24hStats = useMemo(() => {
    const now = Date.now()
    const last24h = events.filter(
      (ev) => now - new Date(ev.createdAt).getTime() < 24 * 3600 * 1000,
    )
    return {
      total: last24h.length,
      critical: last24h.filter((ev) => ev.type === 'critical').length,
      warning: last24h.filter((ev) => ev.type === 'warning').length,
    }
  }, [events])

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
              ? 'Entidade reativada com sucesso'
              : 'Entidade suspensa com sucesso',
          )
        },
        onError: () => {
          toast.error('Erro ao alterar status da entidade')
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
          title="Entidade nao encontrada"
          description="O ID solicitado nao existe ou foi removido do registro."
          action={
            <button
              onClick={() => router.push('/')}
              className="inline-flex h-7 items-center gap-1.5 rounded-[6px] border border-border bg-surface px-2.5 text-[12.5px] font-medium transition-colors duration-[120ms] hover:bg-surface-2"
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
        title={entity.name}
        breadcrumb={
          <>
            <button
              onClick={() => router.push('/')}
              className="hover:text-text transition-colors"
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
            <EntityAvatar name={entity.name} size={38} />
            <StatusBadge status={entity.status} />

            <button
              onClick={handleToggleStatus}
              disabled={toggleStatus.isPending}
              className={cn(
                'inline-flex h-[34px] items-center gap-[7px] rounded-lg border px-3.5 text-[13px] font-medium transition-colors duration-[120ms]',
                isSuspended
                  ? 'border-brand bg-brand text-brand-ink hover:opacity-90'
                  : 'border-critical/30 bg-critical-bg text-critical hover:bg-critical/10',
              )}
            >
              {isSuspended ? 'Reativar entidade' : 'Suspender'}
            </button>

            <button
              onClick={() => router.push(`/events/new?entityId=${entity.id}`)}
              disabled={isSuspended}
              className="inline-flex h-[34px] items-center gap-[7px] rounded-lg border border-border bg-surface px-3.5 text-[13px] font-medium transition-colors duration-[120ms] hover:bg-surface-2 hover:border-border-strong disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send size={13} strokeWidth={1.6} />
              Registrar evento
            </button>
          </div>
        }
      />

      <div className="flex-1 px-9 py-6 pb-12">
        {/* Alerts */}
        {isSuspended && (
          <div className="mb-[18px] flex items-start gap-3 rounded-[10px] border border-critical/20 bg-critical-bg px-4 py-3.5">
            <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-critical/15 text-critical">
              <XCircle size={12} strokeWidth={1.8} />
            </span>
            <div>
              <div className="text-[13px] font-semibold text-critical">
                Entidade suspensa
              </div>
              <div className="mt-0.5 text-[12.5px] leading-relaxed text-text-muted">
                Limite de {CRITICAL_EVENTS_LIMIT} eventos criticos foi atingido
                em {formatDateTime(entity.updatedAt)}. Novos eventos serao
                rejeitados ate reativacao manual.
              </div>
            </div>
          </div>
        )}

        {isNearLimit && (
          <div className="mb-[18px] flex items-start gap-3 rounded-[10px] border border-warning/20 bg-warning-bg px-4 py-3.5">
            <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-warning/15 text-warning">
              <AlertTriangle size={12} strokeWidth={1.8} />
            </span>
            <div>
              <div className="text-[13px] font-semibold text-warning">
                Proxima do limite critico
              </div>
              <div className="mt-0.5 text-[12.5px] leading-relaxed text-text-muted">
                {entity.criticalEventsCount} de {CRITICAL_EVENTS_LIMIT} eventos
                criticos. A proxima ocorrencia critica pode acionar a suspensao
                automatica.
              </div>
            </div>
          </div>
        )}

        {/* 2-column layout */}
        <div
          className="grid gap-6"
          style={{ gridTemplateColumns: '1fr 320px' }}
        >
          {/* Left column */}
          <div>
            {/* KPIs */}
            <div className="mb-[18px] grid grid-cols-3 gap-4">
              <KpiCard
                label="Eventos totais"
                value={entity.totalEvents.toLocaleString('pt-BR')}
                footer={`desde ${formatDateTime(entity.createdAt).split(',')[0]}`}
              />
              <KpiCard
                label="Eventos criticos"
                value={
                  <>
                    <span
                      className={cn(
                        isSuspended && 'text-critical',
                        isNearLimit && 'text-warning',
                      )}
                    >
                      {entity.criticalEventsCount}
                    </span>
                    <span className="text-[18px] opacity-50">
                      {' '}
                      / {CRITICAL_EVENTS_LIMIT}
                    </span>
                  </>
                }
                footer={
                  <span className="inline-block w-full max-w-[120px]">
                    <ThreatMeter count={entity.criticalEventsCount} />
                  </span>
                }
              />
              <KpiCard
                label="Ultimas 24h"
                value={last24hStats.total}
                footer={
                  <span className="flex gap-3">
                    <span>
                      <b className="text-critical">{last24hStats.critical}</b>{' '}
                      crit
                    </span>
                    <span>
                      <b className="text-warning">{last24hStats.warning}</b>{' '}
                      warn
                    </span>
                  </span>
                }
              />
            </div>

            {/* Hourly chart */}
            <HourlyChart events={events} />

            {/* Event history */}
            <div className="overflow-hidden rounded-[10px] border border-border bg-surface shadow-sm">
              <div className="flex items-start justify-between border-b border-border px-[18px] py-3.5">
                <div>
                  <h3 className="text-[14.5px] font-semibold">
                    Historico de eventos
                  </h3>
                  <p className="mt-0.5 text-xs text-text-muted">
                    {pagination?.total ?? events.length} eventos registrados
                    para esta entidade.
                  </p>
                </div>
              </div>

              {events.length === 0 ? (
                <EmptyState
                  icon={<Activity size={24} strokeWidth={1.6} />}
                  title="Nenhum evento registrado"
                  description="Esta entidade ainda nao recebeu nenhum evento desde sua criacao."
                />
              ) : (
                <div className="flex flex-col">
                  {events.slice(0, 12).map((ev) => {
                    const isExpanded = expandedEvent === ev.id

                    return (
                      <div key={ev.id}>
                        <div
                          onClick={() =>
                            setExpandedEvent(isExpanded ? null : ev.id)
                          }
                          className="grid cursor-pointer items-center gap-3.5 border-b border-border px-[18px] py-3 text-[13px] last:border-b-0 hover:bg-surface-2/30"
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
                              'grid h-[26px] w-[26px] place-items-center rounded-[7px]',
                              SEVERITY_ICON_STYLES[ev.type],
                            )}
                          >
                            {SEVERITY_ICON[ev.type]}
                          </span>

                          {/* Body */}
                          <div className="min-w-0">
                            <div className="font-medium">
                              Evento{' '}
                              <span className="capitalize">{ev.type}</span>
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
                          <div className="pb-4 pl-[130px] pr-[18px]">
                            <JsonView data={ev.payload} />
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}

              {(pagination?.total ?? 0) > 12 && (
                <div className="border-t border-border py-3.5 text-center font-mono text-xs text-text-faint">
                  Exibindo 12 de {pagination?.total} eventos
                </div>
              )}
            </div>
          </div>

          {/* Right column (sticky sidebar) */}
          <div className="flex flex-col gap-4 self-start sticky top-[100px]">
            {/* Identification card */}
            <div className="overflow-hidden rounded-[10px] border border-border bg-surface shadow-sm">
              <div className="border-b border-border px-[18px] py-3.5">
                <h3 className="text-[14.5px] font-semibold">Identificacao</h3>
              </div>
              <div className="px-[18px] py-2">
                <ul className="flex flex-col gap-2.5 py-1.5 text-[12.5px]">
                  <li className="flex items-start justify-between gap-3">
                    <span className="text-text-muted">ID</span>
                    <span className="truncate font-mono text-[11.5px] text-right">
                      {entity.id}
                    </span>
                  </li>
                  <li className="flex items-center justify-between gap-3">
                    <span className="text-text-muted">Status</span>
                    <StatusBadge status={entity.status} />
                  </li>
                  <li className="flex items-center justify-between gap-3">
                    <span className="text-text-muted">Eventos criticos</span>
                    <span className="font-mono">
                      {entity.criticalEventsCount} / {CRITICAL_EVENTS_LIMIT}
                    </span>
                  </li>
                  <li className="flex items-center justify-between gap-3">
                    <span className="text-text-muted">Criada em</span>
                    <span className="text-[11.5px]">
                      {formatDateTime(entity.createdAt)}
                    </span>
                  </li>
                  <li className="flex items-center justify-between gap-3">
                    <span className="text-text-muted">Atualizada em</span>
                    <span className="text-[11.5px]">
                      {formatDateTime(entity.updatedAt)}
                    </span>
                  </li>
                  <li className="flex items-center justify-between gap-3">
                    <span className="text-text-muted">Ultimo evento</span>
                    <span className="text-[11.5px]">
                      {entity.lastEventAt
                        ? formatRelative(entity.lastEventAt)
                        : '—'}
                    </span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Suspension policy card */}
            <div className="overflow-hidden rounded-[10px] border border-border bg-surface shadow-sm">
              <div className="border-b border-border px-[18px] py-3.5">
                <h3 className="text-[14.5px] font-semibold">
                  Politica de suspensao
                </h3>
              </div>
              <div className="px-[18px] py-3.5">
                <p className="text-[12.5px] leading-relaxed text-text-muted">
                  Esta entidade sera automaticamente suspensa ao atingir{' '}
                  <b className="text-text">
                    {CRITICAL_EVENTS_LIMIT} eventos criticos
                  </b>
                  . Eventos rejeitados retornarao{' '}
                  <code className="rounded bg-surface-2 px-[5px] py-[1px] font-mono text-[11px]">
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
