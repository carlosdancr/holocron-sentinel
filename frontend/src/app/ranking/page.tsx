'use client'

import { useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Shield } from 'lucide-react'

import { PageHeader } from '@/components/layout/page-header'
import { KpiCard } from '@/components/ui/kpi-card'
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
        title="Ranking de entidades críticas"
        subtitle="Entidades com maior incidência de eventos críticos. Atualizado por agregação periódica."
      />

      <div className="flex flex-1 flex-col min-h-0 overflow-hidden px-9 py-6">
          {/* KPIs */}
          <div className="animate-fade-in-up mb-5.5 grid shrink-0 grid-cols-3 gap-5">
            <KpiCard
              label="Entidade mais crítica"
              value={ranked[0]?.name ?? '—'}
              footer={ranked[0] ? `${ranked[0].recentCriticalCount} eventos críticos` : 'sem dados'}
              hero
              valueClassName="!text-[22px] !leading-tight"
            />
            <KpiCard
              label="Total no período"
              value={totalCrit}
              footer="eventos críticos agregados"
            />
            <KpiCard
              label="Entidades no ranking"
              value={ranked.length}
              footer="com >= 1 evento crítico no período"
            />
          </div>

          {/* Card do ranking */}
          <div className="animate-fade-in-up [animation-delay:60ms] flex min-h-0 flex-1 flex-col overflow-hidden rounded-md border border-border bg-surface shadow-sm">
            {/* Card header */}
            <div className="shrink-0 flex items-start justify-between border-b border-border px-4.5 py-3.5">
              <div>
                <h2 className="text-[14.5px] font-semibold mb-2">Top 12 — últimos 7 dias</h2>
                <p className="mt-0.5 text-xs text-text-muted">
                  Endpoint:{' '}
                  <code className="rounded bg-surface-2 px-1.5 py-px font-mono text-[12px]">
                    GET /entities/ranking?limit=12
                  </code>
                </p>
              </div>

              {updatedAgo && (
                <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface-2 px-2.5 py-1.25 pl-2 font-mono text-xs font-medium text-text-muted">
                  <span
                    className="h-1.75 w-1.75 rounded-full bg-success"
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
                title="Sem eventos críticos no período"
                description="Nenhuma entidade registrou eventos críticos na janela selecionada. Boa notícia."
              />
            ) : (
              <div className="flex flex-1 min-h-0 flex-col overflow-auto">
                {ranked.map((entity, i) => {
                  const pct = (entity.recentCriticalCount / max) * 100

                  return (
                    <div
                      key={entity.id}
                      onClick={() => router.push(`/entities/${entity.id}`)}
                      className={cn(
                        'grid cursor-pointer items-center gap-4 border-b border-border px-4.5 py-3 text-[13px] transition-colors duration-120 last:border-b-0 hover:bg-surface-2/50',
                      )}
                      style={{
                        gridTemplateColumns: '36px 1fr auto 160px 90px',
                      }}
                    >
                      {/* Posicao */}
                      <span
                        className={cn(
                          'grid h-7.5 w-7.5 place-items-center rounded-[8px] font-mono text-[12.5px] font-bold',
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
                      <div className="h-1.5 w-full rounded-full bg-surface-2">
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
                        <span className="text-text-faint"> eventos</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Scrim footer */}
            <div className="shrink-0 border-t border-border py-3.5 text-center font-mono text-xs text-text-faint">
              Janela: últimos 7 dias · ordem decrescente por eventos críticos · agregação cacheada
              (TTL 30s)
            </div>
          </div>
      </div>
    </>
  )
}
