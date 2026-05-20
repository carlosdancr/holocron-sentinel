import { type ClassValue, clsx } from 'clsx'

// Merge de classes condicionais (wrapper simples sem tailwind-merge)
export function cn(...inputs: ClassValue[]) {
  return clsx(inputs)
}

// Formata data relativa em PT-BR: "agora", "há 5s", "há 3min", "há 2h", "há 1d", etc.
export function formatRelative(iso: string | null): string {
  if (!iso) return '-'

  const now = Date.now()
  const then = new Date(iso).getTime()
  const diff = Math.max(0, now - then)
  const seconds = Math.floor(diff / 1000)

  if (seconds < 5) return 'agora'
  if (seconds < 60) return `há ${seconds}s`

  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `há ${minutes}min`

  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `há ${hours}h`

  const days = Math.floor(hours / 24)
  if (days < 30) return `há ${days}d`

  return formatDateTime(iso)
}

// Formata horario em PT-BR: "12:34:56"
export function formatTime(iso: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    timeStyle: 'medium',
  }).format(new Date(iso))
}

// Formata data/hora em PT-BR: "20 mai 2026 14:30"
export function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso))
}

// Formata data curta em PT-BR: "20/05/2026"
export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
  }).format(new Date(iso))
}
