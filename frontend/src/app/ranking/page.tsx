'use client'

import { useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Shield } from 'lucide-react'

import { PageHeader } from '@/components/layout/page-header'
import { KpiCard } from '@/components/ui/kpi-card'
import { ChipGroup } from '@/components/ui/chip-group'
import { EntityAvatar } from '@/components/ui/entity-avatar'
import { StatusBadge } from '@/components/ui/status-badge'
import { EmptyState } from '@/components/ui/empty-state'

import { useRanking } from '@/hooks/use-ranking'
import { formatRelative } from '@/lib/utils'
import { cn } from '@/lib/utils'

// ===== Componente principal =====

export default function RankingPage() {
  const router = useRouter()
  const { data: rankingData, dataUpdatedAt } = useRanking({ limit: 12 })
  const ranked = useMemo(() => rankingData?.data ?? [], [rankingData])

  // Valor maximo para barra proporcional
  const max = ranked[0]?.recentCriticalCount ?? 1

  // KPIs
  const totalCrit = useMemo(
    () => ranked.reduce((sum, e) => sum + e.recentCriticalCount, 0),
    [ranked],
  )

  // Tempo desde ultima atualizacao
  const updatedAgo = dataUpdatedAt ? formatRelative(new Date(dataUpdatedAt).toISOString()) : null

  return (
    <>
      <PageHeader
        title="Ranking de entidades criticas"
        subtitle="Entidades com maior incidencia de eventos criticos. Atualizado por agregacao periodica."
        actions={
          <ChipGroup
            value="7d"
            onChange={() => {}}
            options={[
              { value: '24h', label: '24h', disabled: true },
              { value: '7d', label: '7 dias' },
              { value: '30d', label: '30 dias', disabled: true },
            ]}
          />
        }
      />

      <div className="flex-1 px-9 py-6 pb-12">
        <div className="flex flex-col gap-[22px]">
          {/* KPIs */}
          <div className="grid grid-cols-3 gap-5">
            <KpiCard
              label="Entidade mais critica"
              value={ranked[0]?.name ?? '—'}
              footer={ranked[0] ? `${ranked[0].recentCriticalCount} eventos criticos` : 'sem dados'}
              hero
              valueClassName="!text-[22px] !leading-tight"
            />
            <KpiCard
              label="Total no periodo"
              value={totalCrit}
              footer="eventos criticos agregados"
            />
            <KpiCard
              label="Entidades no ranking"
              value={ranked.length}
              footer="com >= 1 evento critico no periodo"
            />
          </div>

          {/* Card do ranking */}
          <div className="overflow-hidden rounded-[10px] border border-border bg-surface shadow-sm">
            {/* Card header */}
            <div className="flex items-start justify-between border-b border-border px-[18px] py-3.5">
              <div>
                <h2 className="text-[14.5px] font-semibold">Top 12 — janela 7 dias</h2>
                <p className="mt-0.5 text-xs text-text-muted">
                  Endpoint:{' '}
                  <code className="rounded bg-surface-2 px-1.5 py-[1px] font-mono text-[12px]">
                    GET /entities/ranking?limit=12
                  </code>
                </p>
              </div>

              {updatedAgo && (
                <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface-2 px-2.5 py-[5px] pl-2 font-mono text-xs font-medium text-text-muted">
                  <span
                    className="h-[7px] w-[7px] rounded-full bg-success"
                    style={{ animation: 'pulse-dot 1.6s infinite' }}
                  />
                  atualizado {updatedAgo}
                </span>
              )}
            </div>

            {/* Ranking list ou empty state */}
            {ranked.length === 0 ? (
              <EmptyState
                icon={<Shield size={24} strokeWidth={1.6} />}
                title="Sem eventos criticos no periodo"
                description="Nenhuma entidade registrou eventos criticos na janela selecionada. Boa noticia."
              />
            ) : (
              <div className="flex flex-col">
                {ranked.map((entity, i) => {
                  const pct = (entity.recentCriticalCount / max) * 100

                  return (
                    <div
                      key={entity.id}
                      onClick={() => router.push(`/entities/${entity.id}`)}
                      className={cn(
                        'grid cursor-pointer items-center gap-4 border-b border-border px-[18px] py-3 text-[13px] transition-colors duration-[120ms] last:border-b-0 hover:bg-surface-2/50',
                      )}
                      style={{
                        gridTemplateColumns: '36px 1fr 90px 1fr 60px',
                      }}
                    >
                      {/* Posicao */}
                      <span
                        className={cn(
                          'grid h-[30px] w-[30px] place-items-center rounded-[8px] font-mono text-[12.5px] font-bold',
                          i === 0
                            ? 'bg-brand text-brand-ink'
                            : i === 1
                              ? 'bg-surface-2 text-text'
                              : i === 2
                                ? 'bg-surface-2 text-text-muted'
                                : 'text-text-faint',
                        )}
                      >
                        {i + 1}
                      </span>

                      {/* Entidade */}
                      <div className="flex items-center gap-2.5 min-w-0">
                        <EntityAvatar name={entity.name} size={30} />
                        <div className="min-w-0">
                          <div className="truncate font-medium">{entity.name}</div>
                          <div className="truncate font-mono text-[11px] text-text-faint">
                            {entity.id}
                          </div>
                        </div>
                      </div>

                      {/* Status */}
                      <StatusBadge status={entity.status} />

                      {/* Barra proporcional */}
                      <div className="h-[6px] w-full rounded-full bg-surface-2">
                        <div
                          className={cn(
                            'h-full rounded-full transition-all duration-500',
                            i === 0 ? 'bg-critical' : i < 3 ? 'bg-warning' : 'bg-info',
                          )}
                          style={{ width: `${pct}%` }}
                        />
                      </div>

                      {/* Contagem */}
                      <div className="text-right font-mono text-[12.5px]">
                        <span className="font-bold">{entity.recentCriticalCount}</span>
                        <span className="text-text-faint"> evt</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Scrim footer */}
            <div className="border-t border-border py-3.5 text-center font-mono text-xs text-text-faint">
              Janela: ultimos 7 dias · ordem decrescente por eventos criticos · agregacao cacheada
              (TTL 30s)
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
