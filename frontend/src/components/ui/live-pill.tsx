import { cn } from '@/lib/utils'

type LivePillStatus = 'connected' | 'paused' | 'reconnecting' | 'disconnected'

interface LivePillProps {
  status?: LivePillStatus
  label?: string
}

const STATUS_CONFIG: Record<LivePillStatus, { label: string; dotClass: string; animation: string }> = {
  connected: {
    label: 'Conectado',
    dotClass: 'bg-success',
    animation: 'pulse-dot 1.6s infinite',
  },
  paused: {
    label: 'Pausado',
    dotClass: 'bg-warning',
    animation: 'pulse-dot-warn 1.6s infinite',
  },
  reconnecting: {
    label: 'Reconectando...',
    dotClass: 'bg-warning',
    animation: 'pulse-dot-warn 1.6s infinite',
  },
  disconnected: {
    label: 'Desconectado',
    dotClass: 'bg-critical',
    animation: 'none',
  },
}

export function LivePill({ status = 'connected', label }: LivePillProps) {
  const config = STATUS_CONFIG[status]

  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface-2 px-2.5 py-[5px] pl-2 font-mono text-xs font-medium text-text-muted">
      <span
        className={cn('h-[7px] w-[7px] rounded-full', config.dotClass)}
        style={{ animation: config.animation }}
      />
      {label || config.label}
    </span>
  )
}
