'use client'

import { useMemo, useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Radio, Send, Search, X, Plus, Loader2, ChevronLeft, ChevronRight } from 'lucide-react'
import { toast } from 'sonner'
import {
  useReactTable,
  getCoreRowModel,
  createColumnHelper,
  flexRender,
} from '@tanstack/react-table'

import { PageHeader } from '@/components/layout/page-header'
import { KpiCard } from '@/components/ui/kpi-card'
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
import { cn } from '@/lib/utils'
import type { Entity } from '@/lib/types'

// ===== Tipos locais =====

type StatusFilter = 'all' | 'active' | 'suspended'
type SortBy = 'threat' | 'events' | 'recent' | 'name'

const PAGE_SIZE = 20

// ===== Hook de debounce =====

function useDebouncedValue<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value)

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])

  return debounced
}

// ===== Componente: Dialog de criar entidade (simples) =====

function CreateEntityDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [name, setName] = useState('')
  const createEntity = useCreateEntity()

  if (!open) return null

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) {
      toast.error('O nome da entidade é obrigatório.')
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
      <div className="relative w-full max-w-md rounded-lg border border-border bg-surface p-6 shadow-lg">
        <h2 className="text-[16px] font-semibold tracking-[-0.01em]">Criar entidade monitorada</h2>
        <p className="mt-1 text-[13px] text-text-muted">
          Adicione um novo ponto estratégico ao monitoramento.
        </p>

        <form onSubmit={handleSubmit} className="mt-5">
          <label className="mb-1.5 block text-[12.5px] font-medium">Nome da entidade</label>
          <input
            type="text"
            className="h-9.5 w-full rounded-lg border border-border bg-surface px-3 text-[13.5px] outline-none transition-[border-color,box-shadow] duration-120 focus:border-text focus:shadow-[0_0_0_3px_rgba(15,17,21,0.06)]"
            placeholder="Ex: Planeta Alderaan"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
          />

          <div className="mt-5 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-8.5 items-center rounded-lg border border-border bg-surface px-3.5 text-[13px] font-medium transition-colors duration-120 hover:bg-surface-2 hover:border-border-strong"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={createEntity.isPending}
              className="inline-flex h-8.5 items-center gap-1.5 rounded-lg bg-brand px-3.5 text-[13px] font-medium text-brand-ink transition-colors duration-120 hover:bg-[#F7DC0E] disabled:opacity-50"
            >
              {createEntity.isPending ? 'Criando...' : 'Criar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ===== Definição de colunas (TanStack Table) =====

const columnHelper = createColumnHelper<Entity>()

// ===== Componente principal =====

export default function DashboardPage() {
  const router = useRouter()
  const toggleStatus = useToggleEntityStatus()

  // Controles de filtro/paginação — server-side
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [sortBy, setSortBy] = useState<SortBy>('threat')
  const [dialogOpen, setDialogOpen] = useState(false)

  // Debounce a busca para não disparar request a cada tecla
  const debouncedSearch = useDebouncedValue(search, 300)

  // Volta à página 1 quando os filtros mudam
  const prevFilterRef = useRef({ statusFilter, debouncedSearch, sortBy })
  useEffect(() => {
    const prev = prevFilterRef.current
    if (
      prev.statusFilter !== statusFilter ||
      prev.debouncedSearch !== debouncedSearch ||
      prev.sortBy !== sortBy
    ) {
      setPage(1)
      prevFilterRef.current = { statusFilter, debouncedSearch, sortBy }
    }
  }, [statusFilter, debouncedSearch, sortBy])

  // Fetch server-side
  const { data, isLoading, isPlaceholderData } = useEntities({
    page,
    limit: PAGE_SIZE,
    status: statusFilter === 'all' ? undefined : statusFilter,
    search: debouncedSearch || undefined,
    sort: sortBy,
  })

  const entities = useMemo(() => data?.data ?? [], [data])
  const pagination = data?.pagination
  const summary = data?.summary

  // KPIs vindos do summary (global, sem filtros)
  const kpis = useMemo(
    () => ({
      total: summary?.total ?? 0,
      active: summary?.active ?? 0,
      suspended: summary?.suspended ?? 0,
      totalCritical: summary?.totalCriticalEvents ?? 0,
      totalEvents: summary?.totalEvents ?? 0,
      nearLimit: summary?.nearLimit ?? 0,
    }),
    [summary],
  )

  // Toggle status com toast
  function handleToggleStatus(entity: Entity) {
    const newStatus = entity.status === 'active' ? 'suspended' : 'active'
    toggleStatus.mutate(
      { id: entity.id, status: newStatus },
      {
        onSuccess: () => {
          toast.success(
            newStatus === 'suspended'
              ? `A entidade ${entity.name} foi suspensa com sucesso.`
              : `A entidade ${entity.name} foi reativada com sucesso.`,
          )
        },
        onError: () => {
          toast.error('Não foi possível alterar o status da entidade.')
        },
      },
    )
  }

  // Colunas definidas dentro do componente para acessar handlers
  const columns = useMemo(
    () => [
      columnHelper.accessor('name', {
        header: 'Entidade',
        cell: ({ row }) => {
          const entity = row.original
          return (
            <div className="flex items-center gap-2.5">
              <EntityAvatar name={entity.name} />
              <div>
                <div className="font-medium text-text">{entity.name}</div>
                <div className="mt-px font-mono text-[11.5px] text-text-faint">
                  {entity.id.slice(0, 8)}
                </div>
              </div>
            </div>
          )
        },
      }),
      columnHelper.accessor('status', {
        header: 'Status',
        cell: ({ getValue }) => <StatusBadge status={getValue()} />,
      }),
      columnHelper.accessor('criticalEventsCount', {
        header: 'Eventos críticos',
        cell: ({ getValue }) => <ThreatMeter count={getValue()} />,
      }),
      columnHelper.accessor('totalEvents', {
        header: 'Total eventos',
        meta: { align: 'right' },
        cell: ({ getValue }) => (
          <span className="font-mono tabular-nums">{getValue().toLocaleString('pt-BR')}</span>
        ),
      }),
      columnHelper.accessor('lastEventAt', {
        header: 'Último evento',
        cell: ({ getValue }) => (
          <span className="text-[12.5px] text-text-muted">{formatRelative(getValue())}</span>
        ),
      }),
      columnHelper.display({
        id: 'actions',
        header: '',
        meta: { width: 'w-20' },
        cell: ({ row }) => {
          const entity = row.original
          return (
            <div onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => handleToggleStatus(entity)}
                disabled={toggleStatus.isPending}
                title={entity.status === 'active' ? 'Suspender entidade' : 'Reativar entidade'}
                className="inline-flex h-7 cursor-pointer items-center rounded-sm border border-border bg-surface px-2.5 text-[12.5px] font-medium transition-colors duration-120 hover:bg-surface-2 hover:border-border-strong disabled:cursor-not-allowed disabled:opacity-50"
              >
                {entity.status === 'active' ? 'Suspender' : 'Reativar'}
              </button>
            </div>
          )
        },
      }),
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [toggleStatus.isPending],
  )

  // TanStack Table com paginação manual (server-side)
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data: entities,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    pageCount: pagination?.totalPages ?? -1,
    state: {
      pagination: { pageIndex: page - 1, pageSize: PAGE_SIZE },
    },
    onPaginationChange: (updater) => {
      const next =
        typeof updater === 'function'
          ? updater({ pageIndex: page - 1, pageSize: PAGE_SIZE })
          : updater
      setPage(next.pageIndex + 1)
    },
  })

  const totalPages = pagination?.totalPages ?? 0
  const totalFiltered = pagination?.total ?? 0
  const from = totalFiltered > 0 ? (page - 1) * PAGE_SIZE + 1 : 0
  const to = Math.min(page * PAGE_SIZE, totalFiltered)

  return (
    <>
      <PageHeader
        title="Entidades monitoradas"
        subtitle="Visão geral das entidades sob vigilância contínua do Holocron Sentinel."
        actions={
          <>
            <button
              onClick={() => router.push('/feed')}
              className="inline-flex h-8.5 cursor-pointer items-center gap-1.75 rounded-lg border border-border bg-surface px-3.5 text-[13px] font-medium transition-colors duration-120 hover:bg-surface-2 hover:border-border-strong"
            >
              <Radio size={14} strokeWidth={1.6} />
              Abrir feed
            </button>
            <button
              onClick={() => router.push('/events/new')}
              className="inline-flex h-8.5 cursor-pointer items-center gap-1.75 rounded-lg bg-brand px-3.5 text-[13px] font-medium text-brand-ink transition-colors duration-120 hover:bg-[#F7DC0E]"
            >
              <Send size={14} strokeWidth={1.6} />
              Registrar evento
            </button>
          </>
        }
      />

      <div className="flex flex-1 flex-col gap-5.5 px-9 py-6 min-h-0 overflow-hidden">
        {/* KPIs */}
        <div className="animate-fade-in-up grid shrink-0 grid-cols-4 gap-3.5">
          <KpiCard
            hero
            label="Entidades ativas"
            value={
              <>
                {kpis.active}
                <span className="text-lg opacity-50"> / {kpis.total}</span>
              </>
            }
            footer={<>monitoramento contínuo</>}
          />
          <KpiCard
            label="Entidades suspensas"
            value={kpis.suspended}
            footer={
              <>
                <span className="font-medium text-critical">●</span> limite crítico atingido
              </>
            }
          />
          <KpiCard
            label="Próximas do limite"
            value={kpis.nearLimit}
            footer={<>≥ 70% do threshold ({CRITICAL_EVENTS_LIMIT})</>}
          />
          <KpiCard
            label="Eventos críticos (total)"
            value={kpis.totalCritical}
            footer={<>de {kpis.totalEvents.toLocaleString('pt-BR')} eventos registrados</>}
          />
        </div>

        {/* Card da tabela */}
        <div className="animate-fade-in-up [animation-delay:60ms] flex min-h-0 flex-1 flex-col overflow-hidden rounded-md border border-border bg-surface shadow-sm">
          {/* Filter bar */}
          <div className="flex flex-wrap items-center gap-2.5 border-b border-border px-3.5 py-3">
            {/* Busca */}
            <div className="flex min-w-60 max-w-95 flex-1 items-center gap-2 rounded-[6px] border border-border bg-surface px-3 transition-[border-color,box-shadow] duration-120 focus-within:border-text focus-within:shadow-[0_0_0_3px_rgba(15,17,21,0.05)]">
              <Search size={14} className="shrink-0 text-text-muted" strokeWidth={1.6} />
              <input
                type="text"
                className="h-8.5 flex-1 bg-transparent text-[13px] outline-none placeholder:text-text-faint"
                placeholder="Buscar por nome..."
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
                { value: 'all', label: 'Todas', count: kpis.total },
                { value: 'active', label: 'Ativas', count: kpis.active },
                { value: 'suspended', label: 'Suspensas', count: kpis.suspended },
              ]}
            />

            {/* Sort */}
            <select
              className="ml-auto h-8.5 cursor-pointer appearance-none rounded-[6px] border border-border bg-surface bg-[url('data:image/svg+xml,%3Csvg%20width=%2212%22%20height=%2212%22%20viewBox=%220%200%2012%2012%22%20fill=%22none%22%20xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cpath%20d=%22M3%204.5L6%207.5L9%204.5%22%20stroke=%22%236B6B63%22%20stroke-width=%221.5%22%20stroke-linecap=%22round%22%20stroke-linejoin=%22round%22/%3E%3C/svg%3E')] bg-position-[right_10px_center] bg-no-repeat pl-2.5 pr-7 text-[13px] text-text"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortBy)}
            >
              <option value="threat">Ordenar: ameaça</option>
              <option value="events">Ordenar: total de eventos</option>
              <option value="recent">Ordenar: evento mais recente</option>
              <option value="name">Ordenar: nome</option>
            </select>

            {/* Botão criar entidade */}
            <button
              onClick={() => setDialogOpen(true)}
              className="inline-flex h-8.5 cursor-pointer items-center gap-1.75 rounded-[6px] bg-brand px-3.5 text-[13px] font-medium text-brand-ink transition-colors duration-120 hover:bg-[#F7DC0E]"
            >
              <Plus size={14} strokeWidth={1.6} />
              Nova entidade
            </button>
          </div>

          {/* Tabela com altura fixa ou loading ou empty */}
          {isLoading ? (
            <div className="flex flex-1 min-h-0 items-center justify-center gap-2 text-text-muted">
              <Loader2 size={16} className="animate-spin" />
              <span className="text-[13px]">Carregando entidades...</span>
            </div>
          ) : entities.length === 0 ? (
            <div className="flex flex-1 min-h-0 items-center justify-center">
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
                    className="inline-flex h-7 cursor-pointer items-center rounded-sm border border-border bg-surface px-2.5 text-[12.5px] font-medium transition-colors duration-120 hover:bg-surface-2"
                  >
                    Limpar filtros
                  </button>
                }
              />
            </div>
          ) : (
            <div
              className={cn(
                'flex-1 min-h-0 overflow-auto',
                isPlaceholderData && 'opacity-60 transition-opacity duration-200',
              )}
            >
              <table className="w-full border-collapse text-[13px]">
                <thead>
                  {table.getHeaderGroups().map((headerGroup) => (
                    <tr key={headerGroup.id}>
                      {headerGroup.headers.map((header) => {
                        const align =
                          (header.column.columnDef.meta as { align?: string })?.align === 'right'
                            ? 'text-right'
                            : 'text-left'
                        const width = (header.column.columnDef.meta as { width?: string })?.width
                        return (
                          <th
                            key={header.id}
                            className={cn(
                              'sticky top-0 z-10 border-b border-border bg-surface-2 px-4 py-2.5 text-[11.5px] font-medium uppercase tracking-[0.04em] text-text-muted',
                              align,
                              width,
                            )}
                          >
                            {header.isPlaceholder
                              ? null
                              : flexRender(header.column.columnDef.header, header.getContext())}
                          </th>
                        )
                      })}
                    </tr>
                  ))}
                </thead>
                <tbody>
                  {table.getRowModel().rows.map((row) => (
                    <tr
                      key={row.id}
                      className="cursor-pointer border-b border-border transition-colors duration-120 last:border-b-0 hover:bg-surface-2/30"
                      onClick={() => router.push(`/entities/${row.original.id}`)}
                    >
                      {row.getVisibleCells().map((cell) => {
                        const align =
                          (cell.column.columnDef.meta as { align?: string })?.align === 'right'
                            ? 'text-right'
                            : ''
                        return (
                          <td key={cell.id} className={cn('px-4 py-3', align)}>
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Footer com paginação */}
          <div className="flex items-center justify-between border-t border-border px-4 py-3">
            <span className="font-mono text-xs text-text-faint">
              {totalFiltered > 0 ? (
                <>
                  {from}–{to} de {totalFiltered} entidades
                </>
              ) : (
                <>0 entidades</>
              )}
              {' · '}limite crítico: {CRITICAL_EVENTS_LIMIT} eventos
            </span>

            {totalPages > 1 && (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => table.previousPage()}
                  disabled={!table.getCanPreviousPage()}
                  className="inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-md border border-border bg-surface text-text-muted transition-colors duration-120 hover:bg-surface-2 hover:border-border-strong disabled:cursor-default disabled:opacity-35 disabled:pointer-events-none"
                >
                  <ChevronLeft size={14} strokeWidth={1.6} />
                </button>

                {Array.from({ length: totalPages }, (_, i) => (
                  <button
                    key={i}
                    onClick={() => setPage(i + 1)}
                    className={cn(
                      'inline-flex h-7 min-w-7 cursor-pointer items-center justify-center rounded-md px-1.5 font-mono text-xs font-medium transition-colors duration-120',
                      i + 1 === page
                        ? 'bg-brand text-brand-ink'
                        : 'border border-border bg-surface text-text-muted hover:bg-surface-2 hover:border-border-strong',
                    )}
                  >
                    {i + 1}
                  </button>
                ))}

                <button
                  onClick={() => table.nextPage()}
                  disabled={!table.getCanNextPage()}
                  className="inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-md border border-border bg-surface text-text-muted transition-colors duration-120 hover:bg-surface-2 hover:border-border-strong disabled:cursor-default disabled:opacity-35 disabled:pointer-events-none"
                >
                  <ChevronRight size={14} strokeWidth={1.6} />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Dialog criar entidade */}
      <CreateEntityDialog open={dialogOpen} onClose={() => setDialogOpen(false)} />
    </>
  )
}
