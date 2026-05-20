'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Radio, BarChart3, Send } from 'lucide-react'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/feed', label: 'Feed em tempo real', icon: Radio, liveBadge: true },
  { href: '/ranking', label: 'Ranking crítico', icon: BarChart3 },
  { href: '/events/new', label: 'Registrar evento', icon: Send },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside
      className="flex h-screen flex-col border-r border-border bg-surface"
      style={{ position: 'sticky', top: 0 }}
    >
      {/* Logo / Brand */}
      <div className="flex items-center gap-2.5 border-b border-border px-4.5 pb-4.5 pt-5">
        <div
          className="grid h-7 w-7 shrink-0 place-items-center rounded-[7px] bg-brand font-mono text-[13px] font-bold tracking-tight text-brand-ink"
          style={{ boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.06)' }}
        >
          HS
        </div>
        <div>
          <span className="text-sm font-semibold tracking-tight">Holocron Sentinel</span>
          <small className="block text-[11px] font-normal uppercase tracking-widest text-text-muted">
            monitoramento
          </small>
        </div>
      </div>

      {/* Navegacao */}
      <nav className="flex flex-1 flex-col gap-0.5 px-2.5 pt-3">
        <span className="px-2.5 pb-1.5 pt-3.5 text-[10.5px] font-medium uppercase tracking-[0.08em] text-text-faint">
          Operação
        </span>

        {NAV_ITEMS.map((item) => {
          const isActive =
            pathname === item.href || (item.href === '/' && pathname.startsWith('/entities/'))

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-2.5 rounded-sm px-2.5 py-2 text-[13.5px] font-medium text-text-muted transition-[background,color] duration-120',
                isActive ? 'bg-surface-2 text-text' : 'hover:bg-surface-2 hover:text-text',
              )}
            >
              <span
                className={cn(
                  'grid h-5.5 w-5.5 shrink-0 place-items-center rounded-[5px]',
                  isActive ? 'bg-brand text-brand-ink' : 'text-text-muted',
                )}
              >
                <item.icon size={14} strokeWidth={1.6} />
              </span>

              {item.label}

              {/* Badge "live" no Feed */}
              {item.liveBadge && (
                <span className="ml-auto inline-flex items-center gap-1 rounded-full border border-border bg-surface-2 px-1.5 py-px font-mono text-[10.5px] text-text-muted">
                  <span
                    className="inline-block h-1.25 w-1.25 rounded-full bg-success"
                    style={{ animation: 'pulse-dot 1.6s infinite' }}
                  />
                  live
                </span>
              )}
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
