'use client'

import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { Sidebar } from './sidebar'
import { Logo } from '@/components/ui/logo'

const MOBILE_BREAKPOINT = 768
const STORAGE_KEY = 'sidebar-collapsed'

interface AppShellProps {
  children: ReactNode
}

export function AppShell({ children }: AppShellProps) {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  // Detecta mobile e auto-colapsa; restaura preferência em desktop
  useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)

    function handleChange(e: MediaQueryListEvent | MediaQueryList) {
      const mobile = e.matches
      setIsMobile(mobile)
      setMobileOpen(false)

      if (mobile) {
        setCollapsed(true)
      } else {
        // Em desktop, restaura a preferência salva
        const saved = localStorage.getItem(STORAGE_KEY)
        setCollapsed(saved === 'true')
      }
    }

    // Estado inicial
    handleChange(mql)

    mql.addEventListener('change', handleChange)
    return () => mql.removeEventListener('change', handleChange)
  }, [])

  const handleToggle = useCallback(() => {
    if (isMobile) {
      // Em mobile, abre/fecha overlay
      setMobileOpen((prev) => !prev)
    } else {
      // Em desktop, colapsa/expande e persiste
      setCollapsed((prev) => {
        const next = !prev
        localStorage.setItem(STORAGE_KEY, String(next))
        return next
      })
    }
  }, [isMobile])

  // Fecha overlay mobile ao clicar no backdrop
  const handleBackdropClick = useCallback(() => {
    setMobileOpen(false)
  }, [])

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar — desktop: inline, mobile: overlay */}
      {isMobile ? (
        <>
          {/* Backdrop */}
          {mobileOpen && (
            <div
              className="fixed inset-0 z-40 bg-black/30 transition-opacity duration-200"
              onClick={handleBackdropClick}
            />
          )}

          {/* Sidebar overlay */}
          <div
            className={cn(
              'fixed inset-y-0 left-0 z-50 transition-transform duration-200 ease-in-out',
              mobileOpen ? 'translate-x-0' : '-translate-x-full',
            )}
          >
            <Sidebar collapsed={false} onToggle={() => setMobileOpen(false)} />
          </div>
        </>
      ) : (
        <Sidebar collapsed={collapsed} onToggle={handleToggle} />
      )}

      {/* Conteúdo principal */}
      <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* Barra mobile com botão hamburguer */}
        {isMobile && (
          <div className="flex items-center gap-2.5 border-b border-border bg-surface px-4 py-2.5">
            <button
              onClick={handleToggle}
              className="grid h-8 w-8 place-items-center rounded-sm transition-colors duration-120 hover:bg-surface-2"
              title="Abrir menu"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              >
                <line x1="2" y1="4" x2="14" y2="4" />
                <line x1="2" y1="8" x2="14" y2="8" />
                <line x1="2" y1="12" x2="14" y2="12" />
              </svg>
            </button>
            <Logo size={24} />
            <span className="text-[13px] font-semibold tracking-tight">Holocron Sentinel</span>
          </div>
        )}

        {children}
      </main>
    </div>
  )
}
