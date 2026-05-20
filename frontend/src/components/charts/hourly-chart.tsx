'use client'

import { useMemo } from 'react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import type { Event } from '@/lib/types'

// ===== Types =====

interface HourlyBucket {
  label: string
  info: number
  warning: number
  critical: number
  total: number
}

interface HourlyChartProps {
  events: Event[]
}

// ===== Helpers =====

function buildBuckets(events: Event[]): HourlyBucket[] {
  const buckets: HourlyBucket[] = Array.from({ length: 24 }, (_, i) => {
    const hoursAgo = 23 - i
    const label = hoursAgo === 0 ? 'agora' : `-${hoursAgo}h`
    return { label, info: 0, warning: 0, critical: 0, total: 0 }
  })

  const now = Date.now()
  events.forEach((ev) => {
    const hoursAgo = Math.floor((now - new Date(ev.createdAt).getTime()) / 3600000)
    if (hoursAgo >= 0 && hoursAgo < 24) {
      const idx = 23 - hoursAgo
      buckets[idx][ev.type]++
      buckets[idx].total++
    }
  })

  return buckets
}

// ===== Custom Tooltip =====

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: Array<{ value: number; payload: HourlyBucket }>
  label?: string
}) {
  if (!active || !payload?.length) return null

  const bucket = payload[0]?.payload
  if (!bucket) return null

  return (
    <div className="rounded-lg border border-border bg-surface px-3 py-2 shadow-md">
      <div className="mb-1 text-[10.5px] font-medium text-text-faint">{label}</div>
      <div className="flex flex-col gap-0.5 text-[11.5px]">
        <div className="flex justify-between gap-4">
          <span className="text-text-muted">Total</span>
          <span className="font-semibold">{bucket.total}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-text-muted">Info</span>
          <span className="font-semibold">{bucket.info}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-warning">Warning</span>
          <span className="font-semibold">{bucket.warning}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-critical">Critical</span>
          <span className="font-semibold">{bucket.critical}</span>
        </div>
      </div>
    </div>
  )
}

// ===== Componente principal =====

export function HourlyChart({ events }: HourlyChartProps) {
  const hourly = useMemo(() => buildBuckets(events), [events])

  const peak = Math.max(1, ...hourly.map((b) => b.total))
  const totalLast24h = hourly.reduce((s, b) => s + b.total, 0)
  const warnLast24h = hourly.reduce((s, b) => s + b.warning, 0)
  const critLast24h = hourly.reduce((s, b) => s + b.critical, 0)

  // Mostrar apenas alguns labels no eixo X para nao poluir
  const visibleTicks = ['-23h', '-18h', '-12h', '-6h', 'agora']

  return (
    <div className="animate-fade-in-up [animation-delay:60ms] overflow-hidden rounded-[10px] border border-border bg-surface shadow-sm mb-[18px]">
      {/* Header */}
      <div className="flex items-start justify-between border-b border-border px-[18px] py-3.5">
        <div>
          <h3 className="text-[14.5px] font-semibold">Atividade (últimas 24h)</h3>
          <p className="mt-0.5 text-xs text-text-muted">Volume total de eventos por hora.</p>
        </div>
        <div className="flex items-center gap-5">
          <div className="text-right">
            <div className="text-[10.5px] font-medium uppercase tracking-[0.06em] text-text-faint">
              Total
            </div>
            <div className="text-[15px] font-semibold tabular-nums">{totalLast24h}</div>
          </div>
          <div className="text-right">
            <div className="text-[10.5px] font-medium uppercase tracking-[0.06em] text-text-faint">
              Pico/h
            </div>
            <div className="text-[15px] font-semibold tabular-nums">{peak}</div>
          </div>
          <div className="text-right">
            <div className="text-[10.5px] font-medium uppercase tracking-[0.06em] text-text-faint">
              Warning
            </div>
            <div className="text-[15px] font-semibold tabular-nums text-warning">{warnLast24h}</div>
          </div>
          <div className="text-right">
            <div className="text-[10.5px] font-medium uppercase tracking-[0.06em] text-text-faint">
              Critical
            </div>
            <div className="text-[15px] font-semibold tabular-nums text-critical">
              {critLast24h}
            </div>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="px-2 pt-4 pb-1">
        <ResponsiveContainer width="100%" height={180}>
          <AreaChart data={hourly} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#FAE231" stopOpacity={0.55} />
                <stop offset="60%" stopColor="#FAE231" stopOpacity={0.15} />
                <stop offset="100%" stopColor="#FAE231" stopOpacity={0} />
              </linearGradient>
            </defs>

            <CartesianGrid
              strokeDasharray="none"
              stroke="var(--color-border)"
              strokeOpacity={0.5}
              horizontal
              vertical={false}
            />

            <XAxis
              dataKey="label"
              axisLine={false}
              tickLine={false}
              tick={{
                fontSize: 10.5,
                fill: 'var(--color-text-faint)',
                fontFamily: 'var(--font-mono)',
              }}
              ticks={visibleTicks}
              interval="preserveStartEnd"
            />

            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{
                fontSize: 10.5,
                fill: 'var(--color-text-faint)',
                fontFamily: 'var(--font-mono)',
              }}
              allowDecimals={false}
            />

            <Tooltip
              content={<ChartTooltip />}
              cursor={{
                stroke: 'var(--color-text-faint)',
                strokeWidth: 0.5,
                strokeDasharray: '3 2',
              }}
            />

            <Area
              type="monotone"
              dataKey="total"
              stroke="#FAE231"
              strokeWidth={1.5}
              fill="url(#chartGradient)"
              animationDuration={900}
              animationEasing="ease-in-out"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
