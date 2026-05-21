import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { cn, formatRelative, formatTime, formatDateTime, formatDate } from '@/lib/utils'

// ===== cn (merge de classes) =====

describe('cn', () => {
  it('combina strings simples', () => {
    expect(cn('a', 'b')).toBe('a b')
  })

  it('remove valores falsy', () => {
    expect(cn('a', false && 'b', null, undefined, 'c')).toBe('a c')
  })

  it('retorna string vazia sem argumentos', () => {
    expect(cn()).toBe('')
  })
})

// ===== formatRelative =====

describe('formatRelative', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-05-21T12:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('retorna "-" para null', () => {
    expect(formatRelative(null)).toBe('-')
  })

  it('retorna "agora" para menos de 5 segundos', () => {
    expect(formatRelative('2026-05-21T11:59:57Z')).toBe('agora')
  })

  it('retorna segundos para diferenca < 60s', () => {
    expect(formatRelative('2026-05-21T11:59:30Z')).toBe('há 30s')
  })

  it('retorna minutos para diferenca < 60min', () => {
    expect(formatRelative('2026-05-21T11:45:00Z')).toBe('há 15min')
  })

  it('retorna horas para diferenca < 24h', () => {
    expect(formatRelative('2026-05-21T06:00:00Z')).toBe('há 6h')
  })

  it('retorna dias para diferenca < 30d', () => {
    expect(formatRelative('2026-05-18T12:00:00Z')).toBe('há 3d')
  })

  it('retorna data formatada para >= 30 dias', () => {
    const result = formatRelative('2026-03-01T12:00:00Z')
    // Deve cair em formatDateTime que retorna formato pt-BR
    expect(result).toBeTruthy()
    expect(result).not.toBe('-')
  })
})

// ===== formatTime =====

describe('formatTime', () => {
  it('formata horario em pt-BR', () => {
    const result = formatTime('2026-05-21T15:30:45Z')
    // Deve conter pelo menos horas e minutos
    expect(result).toMatch(/\d{2}:\d{2}/)
  })
})

// ===== formatDateTime =====

describe('formatDateTime', () => {
  it('formata data e hora em pt-BR', () => {
    const result = formatDateTime('2026-05-21T15:30:00Z')
    expect(result).toBeTruthy()
    // Deve conter ano
    expect(result).toMatch(/2026/)
  })
})

// ===== formatDate =====

describe('formatDate', () => {
  it('formata data curta em pt-BR', () => {
    const result = formatDate('2026-05-21T00:00:00Z')
    expect(result).toBeTruthy()
    // Deve ter formato dd/mm/yyyy
    expect(result).toMatch(/\d{2}\/\d{2}\/\d{4}/)
  })
})
