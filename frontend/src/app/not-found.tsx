import Link from 'next/link'
import { AlertTriangle } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 px-9 py-12">
      <span className="grid h-14 w-14 place-items-center rounded-2xl bg-surface-2">
        <AlertTriangle size={24} strokeWidth={1.6} className="text-text-muted" />
      </span>
      <h2 className="text-[18px] font-semibold">Página não encontrada</h2>
      <p className="max-w-sm text-center text-[13.5px] text-text-muted">
        O recurso solicitado não existe ou foi removido. Verifique a URL ou retorne ao dashboard.
      </p>
      <Link
        href="/"
        className="mt-2 inline-flex h-8.5 items-center gap-1.75 rounded-lg border border-border bg-surface px-3.5 text-[13px] font-medium transition-colors duration-120 hover:bg-surface-2 hover:border-border-strong"
      >
        Voltar ao dashboard
      </Link>
    </div>
  )
}
