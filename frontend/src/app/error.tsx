'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { AlertTriangle } from 'lucide-react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[GlobalError]', error)
  }, [error])

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 px-9 py-12">
      <span className="grid h-14 w-14 place-items-center rounded-2xl bg-critical-bg">
        <AlertTriangle size={24} strokeWidth={1.6} className="text-critical" />
      </span>
      <h2 className="text-[18px] font-semibold">Algo deu errado</h2>
      <p className="max-w-sm text-center text-[13.5px] text-text-muted">
        Ocorreu um erro inesperado ao carregar esta página. Tente novamente ou retorne ao dashboard.
      </p>
      <div className="mt-2 flex items-center gap-2.5">
        <button
          onClick={reset}
          className="inline-flex h-8.5 items-center gap-1.75 rounded-lg border border-brand bg-brand px-3.5 text-[13px] font-medium text-brand-ink transition-colors duration-120 hover:opacity-90"
        >
          Tentar novamente
        </button>
        <Link
          href="/"
          className="inline-flex h-8.5 items-center gap-1.75 rounded-lg border border-border bg-surface px-3.5 text-[13px] font-medium transition-colors duration-120 hover:bg-surface-2 hover:border-border-strong"
        >
          Voltar ao dashboard
        </Link>
      </div>
    </div>
  )
}
