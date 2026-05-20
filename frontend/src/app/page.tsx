'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Radio, Send, Search, X, Plus, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

import { PageHeader } from '@/components/layout/page-header'
import { KpiCard } from '@/components/ui/kpi-card'
import { LivePill } from '@/components/ui/live-pill'
import { ChipGroup } from '@/components/ui/chip-group'
import { EntityAvatar } from '@/components/ui/entity-avatar'
import { StatusBadge } from '@/components/ui/status-badge'
import { ThreatMeter } from '@/components/ui/threat-meter'
import { EmptyState } from '@/components/ui/empty-state'

import { useEntities } from '@/hooks/use-entities'
import { useCreateEntity } from '@/hooks/use-create-entity'
import { useToggleEntityStatus } from '@/hooks/use-toggle-entity-status'

import { CRITICAL_EVENTS_LIMIT } from '@/lib/constants'
import { formatRelative } from '@/lib/utils'
import type { Entity } from '@/lib/types'

// ===== Tipos locais =====

type StatusFilter = 'all' | 'active' | 'suspended'
type SortBy = 'threat' | 'events' | 'recent' | 'name'

// ===== Helpers =====

function sortEntities(entities: Entity[], sortBy: SortBy): Entity[] {
  const sorted = [...entities]
  switch (sortBy) {
    case 'threat':
      return sorted.sort((a, b) => b.criticalEventsCount - a.criticalEventsCount)
    case 'events':
      return sorted.sort((a, b) => b.totalEvents - a.totalEvents)
    case 'recent':
      return sorted.sort(
        (a, b) =>
          new Date(b.lastEventAt || 0).getTime() - new Date(a.lastEventAt || 0).getTime(),
      )
    case 'name':
      return sorted.sort((a, b) => a.name.localeCompare(b.name))
    default:
      return sorted
  }
}

// ===== Componente: Dialog de criar entidade (simples) =====

function CreateEntityDialog({
  open,
  onClose,
}: {
  open: boolean
  onClose: () => void
}) {
  const [name, setName] = useState('')
  const createEntity = useCreateEntity()

  if (!open) return null

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) {
      toast.error('O nome da entidade e obrigatorio.')
      return
    }
    createEntity.mutate(
      { name: name.trim() },
      {
        onSuccess: (data) => {
          toast.success(`Entidade "${data.name}" criada com sucesso!`)
          setName('')
          onClose()
        },
        onError: () => {
          toast.error('Erro ao criar entidade. Tente novamente.')
        },
      },
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Overlay */}
      <div className="absolute inset-0 bg-text/20" onClick={onClose} />

      {/* Dialog */}
      <div className="relative w-full max-w-md rounded-[14px] border border-border bg-surface p-6 shadow-lg">
        <h2 className="text-[16px] font-semibold tracking-[-0.01em]">Criar entidade monitorada</h2>
        <p className="mt-1 text-[13px] text-text-muted">
          Adicione um novo ponto estrategico ao monitoramento.
        </p>

        <form onSubmit={handleSubmit} className="mt-5">
          <label className="mb-1.5 block text-[12.5px] font-medium">Nome da entidade</label>
          <input
            type="text"
            className="h-[38px] w-full rounded-lg border border-border bg-surface px-3 text-[13.5px] outline-none transition-[border-color,box-shadow] duration-[120ms] focus:border-text focus:shadow-[0_0_0_3px_rgba(15,17,21,0.06)]"
            placeholder="Ex: Planeta Alderaan"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
          />

          <div className="mt-5 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-[34px] items-center rounded-lg border border-border bg-surface px-3.5 text-[13px] font-medium transition-colors duration-[120ms] hover:bg-surface-2 hover:border-border-strong"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={createEntity.isPending}
              className="inline-flex h-[34px] items-center gap-1.5 rounded-lg bg-brand px-3.5 text-[13px] font-medium text-brand-ink transition-colors duration-[120ms] hover:bg-[#F7DC0E] disabled:opacity-50"
            >
              {createEntity.isPending ? 'Criando...' : 'Criar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ===== Componente principal =====

export default function DashboardPage() {
  const router = useRouter()
  const { data, isLoading } = useEntities({ limit: 100 })
  const toggleStatus = useToggleEntityStatus()

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [sortBy, setSortBy] = useState<SortBy>('threat')
  const [dialogOpen, setDialogOpen] = useState(false)

  const entities = data?.data ?? []

  // KPIs computados
  const kpis = useMemo(() => {
    const total = entities.length
    const active = entities.filter((e) => e.status === 'active').length
    const suspended = total - active
    const totalCritical = entities.reduce((s, e) => s + e.criticalEventsCount, 0)
    const totalEvents = entities.reduce((s, e) => s + e.totalEvents, 0)
    const nearLimit = entities.filter(
      (e) => e.status === 'active' && e.criticalEventsCount >= CRITICAL_EVENTS_LIMIT * 0.7,
    ).length
    return { total, active, suspended, totalCritical, totalEvents, nearLimit }
  }, [entities])

  // Contadores para os chips
  const counts = useMemo(
    () => ({
      all: entities.length,
      active: entities.filter((e) => e.status === 'active').length,
      suspended: entities.filter((e) => e.status === 'suspended').length,
    }),
    [entities],
  )

  // Filtro + ordenacao
  const filtered = useMemo(() => {
    let result = entities

    if (search) {
      const q = search.toLowerCase()
      result = result.filter(
        (e) => e.name.toLowerCase().includes(q) || e.id.toLowerCase().includes(q),
      )
    }

    if (statusFilter !== 'all') {
      result = result.filter((e) => e.status === statusFilter)
    }

    return sortEntities(result, sortBy)
  }, [entities, search, statusFilter, sortBy])

  // Toggle status com toast
  function handleToggleStatus(entity: Entity) {
    const newStatus = entity.status === 'active' ? 'suspended' : 'active'
    toggleStatus.mutate(
      { id: entity.id, status: newStatus },
      {
        onSuccess: () => {
          toast.success(
            newStatus === 'suspended'
              ? `"${entity.name}" foi suspensa.`
              : `"${entity.name}" foi reativada.`,
          )
        },
        onError: () => {
          toast.error('Erro ao alterar status da entidade.')
        },
      },
    )
  }

  return (
    <>
      <PageHeader
        title="Entidades monitoradas"
        subtitle="Visao geral das entidades sob vigilancia continua do Holocron Sentinel."
        actions={
          <>
            <LivePill />
            <button
              onClick={() => router.push('/feed')}
              className="inline-flex h-[34px] items-center gap-[7px] rounded-lg border border-border bg-surface px-3.5 text-[13px] font-medium transition-colors duration-[120ms] hover:bg-surface-2 hover:border-border-strong"
            >
              <Radio size={14} strokeWidth={1.6} />
              Abrir feed
            </button>
            <button
              onClick={() => router.push('/events/new')}
              className="inline-flex h-[34px] items-center gap-[7px] rounded-lg bg-brand px-3.5 text-[13px] font-medium text-brand-ink transition-colors duration-[120ms] hover:bg-[#F7DC0E]"
            >
              <Send size={14} strokeWidth={1.6} />
              Registrar evento
            </button>
          </>
        }
      />

      <div className="flex flex-1 flex-col gap-[22px] px-9 py-6 pb-12">
        {/* KPIs */}
        <div className="grid grid-cols-4 gap-3.5">
          <KpiCard
            hero
            label="Entidades ativas"
            value={
              <>
                {kpis.active}
                <span className="text-lg opacity-50"> / {kpis.total}</span>
              </>
            }
            footer={<>monitoramento continuo</>}
          />
          <KpiCard
            label="Suspensas"
            value={kpis.suspended}
            footer={
              <>
                <span className="font-medium text-critical">●</span> limite critico atingido
              </>
            }
          />
          <KpiCard
            label="Proximas do limite"
            value={kpis.nearLimit}
            footer={<>≥ 70% do threshold ({CRITICAL_EVENTS_LIMIT})</>}
          />
          <KpiCard
            label="Eventos criticos (total)"
            value={kpis.totalCritical}
            footer={<>de {kpis.totalEvents.toLocaleString('pt-BR')} eventos registrados</>}
          />
        </div>

        {/* Card da tabela */}
        <div className="overflow-hidden rounded-[10px] border border-border bg-surface shadow-sm">
          {/* Filter bar */}
          <div className="flex flex-wrap items-center gap-2.5 border-b border-border px-3.5 py-3">
            {/* Busca */}
            <div className="flex min-w-[240px] max-w-[380px] flex-1 items-center gap-2 rounded-lg border border-border bg-surface px-3 transition-[border-color,box-shadow] duration-[120ms] focus-within:border-text focus-within:shadow-[0_0_0_3px_rgba(15,17,21,0.05)]">
              <Search size={14} className="shrink-0 text-text-muted" strokeWidth={1.6} />
              <input
                type="text"
                className="h-[34px] flex-1 bg-transparent text-[13px] outline-none placeholder:text-text-faint"
                placeholder="Buscar por nome ou ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {search && (
                <button onClick={() => setSearch('')} className="text-text-muted">
                  <X size={12} strokeWidth={1.6} />
                </button>
              )}
            </div>

            {/* Chips de status */}
            <ChipGroup
              value={statusFilter}
              onChange={(v) => setStatusFilter(v as StatusFilter)}
              options={[
                { value: 'all', label: 'Todas', count: counts.all },
                { value: 'active', label: 'Ativas', count: counts.active },
                { value: 'suspended', label: 'Suspensas', count: counts.suspended },
              ]}
            />

            {/* Sort */}
            <select
              className="ml-auto h-[34px] cursor-pointer appearance-none rounded-lg border border-border bg-surface bg-[url('data:image/svg+xml,%3Csvg%20width=%2212%22%20height=%2212%22%20viewBox=%220%200%2012%2012%22%20fill=%22none%22%20xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cpath%20d=%22M3%204.5L6%207.5L9%204.5%22%20stroke=%22%236B6B63%22%20stroke-width=%221.5%22%20stroke-linecap=%22round%22%20stroke-linejoin=%22round%22/%3E%3C/svg%3E')] bg-[right_10px_center] bg-no-repeat pl-2.5 pr-7 text-[13px] text-text"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortBy)}
            >
              <option value="threat">Ordenar: ameaca</option>
              <option value="events">Ordenar: total de eventos</option>
              <option value="recent">Ordenar: evento mais recente</option>
              <option value="name">Ordenar: nome</option>
            </select>

            {/* Botao criar entidade */}
            <button
              onClick={() => setDialogOpen(true)}
              className="inline-flex h-[34px] items-center gap-[7px] rounded-lg bg-text px-3.5 text-[13px] font-medium text-surface transition-colors duration-[120ms] hover:bg-[#2B2D33]"
            >
              <Plus size={14} strokeWidth={1.6} />
              Nova entidade
            </button>
          </div>

          {/* Tabela ou loading ou empty */}
          {isLoading ? (
            <div className="flex items-center justify-center gap-2 py-20 text-text-muted">
              <Loader2 size={16} className="animate-spin" />
              <span className="text-[13px]">Carregando entidades...</span>
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={<Search size={24} strokeWidth={1.6} />}
              title="Nenhuma entidade encontrada"
              description="Tente ajustar a busca ou os filtros aplicados acima."
              action={
                <button
                  onClick={() => {
                    setSearch('')
                    setStatusFilter('all')
                  }}
                  className="inline-flex h-7 items-center rounded-[6px] border border-border bg-surface px-2.5 text-[12.5px] font-medium transition-colors duration-[120ms] hover:bg-surface-2"
                >
                  Limpar filtros
                </button>
              }
            />
          ) : (
            <div className="overflow-auto">
              <table className="w-full border-collapse text-[13px]">
                <thead>
                  <tr>
                    <th className="sticky top-0 border-b border-border bg-surface-2 px-4 py-2.5 text-left text-[11.5px] font-medium uppercase tracking-[0.04em] text-text-muted">
                      Entidade
                    </th>
                    <th className="sticky top-0 border-b border-border bg-surface-2 px-4 py-2.5 text-left text-[11.5px] font-medium uppercase tracking-[0.04em] text-text-muted">
                      Status
                    </th>
                    <th className="sticky top-0 border-b border-border bg-surface-2 px-4 py-2.5 text-left text-[11.5px] font-medium uppercase tracking-[0.04em] text-text-muted">
                      Eventos criticos
                    </th>
                    <th className="sticky top-0 border-b border-border bg-surface-2 px-4 py-2.5 text-right text-[11.5px] font-medium uppercase tracking-[0.04em] text-text-muted">
                      Total eventos
                    </th>
                    <th className="sticky top-0 border-b border-border bg-surface-2 px-4 py-2.5 text-left text-[11.5px] font-medium uppercase tracking-[0.04em] text-text-muted">
                      Ultimo evento
                    </th>
                    <th className="sticky top-0 w-20 border-b border-border bg-surface-2 px-4 py-2.5" />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((entity) => (
                    <tr
                      key={entity.id}
                      className="cursor-pointer border-b border-border transition-colors duration-[120ms] last:border-b-0 hover:bg-surface-2"
                      onClick={() => router.push(`/entities/${entity.id}`)}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <EntityAvatar name={entity.name} />
                          <div>
                            <div className="font-medium text-text">{entity.name}</div>
                            <div className="mt-px font-mono text-[11.5px] text-text-faint">
                              {entity.id.slice(0, 8)}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={entity.status} />
                      </td>
                      <td className="px-4 py-3">
                        <ThreatMeter count={entity.criticalEventsCount} />
                      </td>
                      <td className="px-4 py-3 text-right font-mono tabular-nums">
                        {entity.totalEvents.toLocaleString('pt-BR')}
                      </td>
                      <td className="px-4 py-3 text-[12.5px] text-text-muted">
                        {formatRelative(entity.lastEventAt)}
                      </td>
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => handleToggleStatus(entity)}
                          disabled={toggleStatus.isPending}
                          title={
                            entity.status === 'active'
                              ? 'Suspender entidade'
                              : 'Reativar entidade'
                          }
                          className="inline-flex h-7 items-center rounded-[6px] border border-border bg-surface px-2.5 text-[12.5px] font-medium transition-colors duration-[120ms] hover:bg-surface-2 hover:border-border-strong disabled:opacity-50"
                        >
                          {entity.status === 'active' ? 'Suspender' : 'Reativar'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Scrim footer */}
          <div className="border-t border-border py-3.5 text-center font-mono text-xs text-text-faint">
            {filtered.length} de {entities.length} entidades · limite critico:{' '}
            {CRITICAL_EVENTS_LIMIT} eventos
          </div>
        </div>
      </div>

      {/* Dialog criar entidade */}
      <CreateEntityDialog open={dialogOpen} onClose={() => setDialogOpen(false)} />
    </>
  )
}
