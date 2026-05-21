'use client'

import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Send, RefreshCw, Copy, AlertTriangle, Check, X, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { AxiosError } from 'axios'

import { PageHeader } from '@/components/layout/page-header'
import { TypeBadge } from '@/components/ui/type-badge'
import { EntityAvatar } from '@/components/ui/entity-avatar'
import { EmptyState } from '@/components/ui/empty-state'

import { useEntities } from '@/hooks/use-entities'
import { useCreateEvent } from '@/hooks/use-create-event'

import { CRITICAL_EVENTS_LIMIT } from '@/lib/constants'
import { formatTime } from '@/lib/utils'
import { cn } from '@/lib/utils'

// ===== Tipos locais =====

type EventType = 'info' | 'warning' | 'critical'

interface Submission {
  entityId: string
  entityName: string
  externalId: string
  type: EventType
  result: 'success' | 'duplicate' | 'error' | 'suspended'
  at: string
}

interface LastResult {
  kind: 'success' | 'duplicate' | 'error' | 'suspended'
  message?: string
  eventId?: string
  externalId?: string
}

interface FormErrors {
  entity?: string
  external?: string
  payload?: string
}

// ===== Constantes =====

const SAMPLE_PAYLOAD = `{
  "signal_strength": 87,
  "source": "sensor_grid_4",
  "priority": "P2",
  "notes": "Leitura confirmada por operador."
}`

const TYPE_OPTIONS = [
  { value: 'info' as const, label: 'Info', desc: 'Atividade rotineira' },
  { value: 'warning' as const, label: 'Warning', desc: 'Anomalia leve' },
  { value: 'critical' as const, label: 'Critical', desc: 'Incrementa o contador' },
]

// ===== Componente principal =====

export default function EventFormPage() {
  const searchParams = useSearchParams()
  const { data } = useEntities({ limit: 100 })
  const createEvent = useCreateEvent()

  const [entityId, setEntityId] = useState(searchParams.get('entityId') ?? '')
  const [externalId, setExternalId] = useState('')
  const [type, setType] = useState<EventType>('info')
  const [payload, setPayload] = useState(SAMPLE_PAYLOAD)
  const [errors, setErrors] = useState<FormErrors>({})
  const [lastResult, setLastResult] = useState<LastResult | null>(null)
  const [submissions, setSubmissions] = useState<Submission[]>([])

  const entities = data?.data ?? []
  const selectedEntity = entities.find((e) => e.id === entityId)
  const entitySuspended = selectedEntity?.status === 'suspended'

  function genExternalId() {
    setExternalId('ext_' + Math.random().toString(36).slice(2, 10))
  }

  function validate(): FormErrors {
    const errs: FormErrors = {}
    if (!entityId) errs.entity = 'Selecione uma entidade.'
    if (!externalId.trim()) errs.external = 'external_id é obrigatório.'
    else if (!/^[a-zA-Z0-9_\-:.]+$/.test(externalId))
      errs.external = 'Use apenas letras, números, _ - : .'
    try {
      const parsed = JSON.parse(payload)
      if (typeof parsed !== 'object' || Array.isArray(parsed) || parsed === null) {
        errs.payload = 'Payload deve ser um objeto JSON.'
      }
    } catch (e) {
      errs.payload = 'JSON inválido: ' + (e instanceof Error ? e.message : 'erro desconhecido')
    }
    return errs
  }

  function handleClear() {
    setEntityId('')
    setExternalId('')
    setType('info')
    setPayload(SAMPLE_PAYLOAD)
    setErrors({})
    setLastResult(null)
  }

  function handleReuseLastSubmission() {
    if (submissions.length === 0) return
    const last = submissions[0]
    setEntityId(last.entityId)
    setExternalId(last.externalId)
    setType(last.type)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const errs = validate()
    setErrors(errs)
    if (Object.keys(errs).length > 0) return

    setLastResult(null)

    createEvent.mutate(
      {
        entityId,
        externalId: externalId.trim(),
        type,
        payload: JSON.parse(payload),
      },
      {
        onSuccess: (data) => {
          const entityName = selectedEntity?.name || entityId

          if (data.status === 'duplicate') {
            setLastResult({
              kind: 'duplicate',
              eventId: data.event.id,
              externalId: data.event.externalId,
            })
            toast.warning('Idempotência aplicada — external_id já foi processado.')
            setSubmissions((prev) => [
              {
                entityId,
                entityName,
                externalId,
                type,
                result: 'duplicate',
                at: new Date().toISOString(),
              },
              ...prev.slice(0, 19),
            ])
          } else {
            setLastResult({ kind: 'success', eventId: data.event.id })
            toast.success('Evento registrado com sucesso!')

            if (data.entitySuspended) {
              toast.warning('A entidade foi suspensa automaticamente por atingir o limite crítico!')
            }

            setSubmissions((prev) => [
              {
                entityId,
                entityName,
                externalId,
                type,
                result: 'success',
                at: new Date().toISOString(),
              },
              ...prev.slice(0, 19),
            ])

            // Reset apenas o external_id para permitir submissoes em lote
            setExternalId('')
          }
        },
        onError: (error) => {
          const axiosError = error as AxiosError<{ error?: string }>
          const status = axiosError.response?.status
          const message = axiosError.response?.data?.error || 'Erro ao registrar evento.'
          const entityName = selectedEntity?.name || entityId

          if (status === 422) {
            setLastResult({ kind: 'suspended', message })
            toast.error('Entidade suspensa — evento rejeitado.')
            setSubmissions((prev) => [
              {
                entityId,
                entityName,
                externalId,
                type,
                result: 'suspended',
                at: new Date().toISOString(),
              },
              ...prev.slice(0, 19),
            ])
          } else {
            setLastResult({ kind: 'error', message })
            toast.error(message)
            setSubmissions((prev) => [
              {
                entityId,
                entityName,
                externalId,
                type,
                result: 'error',
                at: new Date().toISOString(),
              },
              ...prev.slice(0, 19),
            ])
          }
        },
      },
    )
  }

  return (
    <>
      <PageHeader
        title="Registrar evento"
        subtitle={
          <>
            Inserção manual para operadores. Submissões respeitam idempotência por{' '}
            <code className="rounded bg-surface-2 px-1 py-px font-mono text-xs">external_id</code>.
          </>
        }
      />

      <div className="flex-1 overflow-auto px-9 py-6 pb-12">
        <div className="grid grid-cols-1 items-start gap-6 md:grid-cols-[1fr_360px]">
          {/* Card do formulario */}
          <div className="animate-fade-in-up overflow-hidden rounded-md border border-border bg-surface shadow-sm">
            {/* Card header */}
            <div className="flex items-center justify-between gap-4 border-b border-border px-4.5 py-4">
              <div>
                <div className="text-sm font-semibold tracking-[-0.01em]">Novo evento</div>
                <div className="mt-0.5 text-[12.5px] text-text-muted">
                  Preencha os campos e revise antes de enviar.
                </div>
              </div>
              <button
                type="button"
                onClick={handleClear}
                className="inline-flex h-7 items-center rounded-sm border border-border bg-surface px-2.5 text-[12.5px] font-medium transition-colors duration-120 hover:bg-surface-2"
              >
                Limpar
              </button>
            </div>

            <form onSubmit={handleSubmit} className="grid gap-4 p-4.5">
              {/* Banners de resultado */}
              {lastResult?.kind === 'success' && (
                <ResultAlert
                  variant="success"
                  icon={<Check size={12} />}
                  title="Evento registrado com sucesso"
                  description={
                    <>
                      ID interno{' '}
                      <code className="font-mono font-semibold">
                        {lastResult.eventId?.slice(0, 8)}
                      </code>
                    </>
                  }
                />
              )}
              {lastResult?.kind === 'duplicate' && (
                <ResultAlert
                  variant="warning"
                  icon={<AlertTriangle size={12} />}
                  title="Evento duplicado — idempotência aplicada"
                  description={
                    <>
                      Um evento com{' '}
                      <code className="font-mono font-semibold">
                        external_id={lastResult.externalId}
                      </code>{' '}
                      já foi processado. Retornando o registro existente{' '}
                      <code className="font-mono font-semibold">
                        {lastResult.eventId?.slice(0, 8)}
                      </code>{' '}
                      sem efeitos colaterais.
                    </>
                  }
                />
              )}
              {(lastResult?.kind === 'error' || lastResult?.kind === 'suspended') && (
                <ResultAlert
                  variant="error"
                  icon={<X size={12} />}
                  title="Evento rejeitado"
                  description={
                    lastResult.kind === 'suspended'
                      ? 'A entidade está suspensa e não aceita novos eventos.'
                      : lastResult.message || 'Falha na submissão.'
                  }
                />
              )}

              {/* Entidade */}
              <div className="grid gap-1.5">
                <label className="flex items-center gap-1.5 text-[12.5px] font-medium">
                  Entidade <span className="text-critical">*</span>
                </label>
                <select
                  className={cn(
                    "h-9.5 w-full appearance-none rounded-lg border bg-surface bg-[url('data:image/svg+xml,%3Csvg%20width=%2212%22%20height=%2212%22%20viewBox=%220%200%2012%2012%22%20fill=%22none%22%20xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cpath%20d=%22M3%204.5L6%207.5L9%204.5%22%20stroke=%22%236B6B63%22%20stroke-width=%221.5%22%20stroke-linecap=%22round%22%20stroke-linejoin=%22round%22/%3E%3C/svg%3E')] bg-position-[right_12px_center] bg-no-repeat px-3 pr-8 text-[13.5px] outline-none transition-[border-color,box-shadow] duration-120 focus:border-text focus:shadow-[0_0_0_3px_rgba(15,17,21,0.06)]",
                    errors.entity ? 'border-critical' : 'border-border',
                  )}
                  value={entityId}
                  onChange={(e) => setEntityId(e.target.value)}
                >
                  <option value="">— Selecione uma entidade —</option>
                  <optgroup label="Ativas">
                    {entities
                      .filter((e) => e.status === 'active')
                      .map((e) => (
                        <option key={e.id} value={e.id}>
                          {e.name} ({e.id.slice(0, 8)})
                        </option>
                      ))}
                  </optgroup>
                  <optgroup label="Suspensas (somente leitura)">
                    {entities
                      .filter((e) => e.status === 'suspended')
                      .map((e) => (
                        <option key={e.id} value={e.id}>
                          ⊘ {e.name} ({e.id.slice(0, 8)})
                        </option>
                      ))}
                  </optgroup>
                </select>
                {errors.entity && <FieldError message={errors.entity} />}
                {entitySuspended && !errors.entity && (
                  <FieldError message="Esta entidade está suspensa — eventos serão rejeitados." />
                )}
                {selectedEntity && !entitySuspended && (
                  <div className="flex items-center gap-2 text-[11.5px] text-text-muted">
                    <EntityAvatar name={selectedEntity.name} size={20} />
                    {selectedEntity.criticalEventsCount}/{CRITICAL_EVENTS_LIMIT} eventos críticos
                  </div>
                )}
              </div>

              {/* External ID */}
              <div className="grid gap-1.5">
                <label className="flex items-center gap-1.5 text-[12.5px] font-medium">
                  external_id <span className="text-critical">*</span>
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    className={cn(
                      'h-9.5 flex-1 rounded-lg border bg-surface px-3 font-mono text-[13px] outline-none transition-[border-color,box-shadow] duration-120 focus:border-text focus:shadow-[0_0_0_3px_rgba(15,17,21,0.06)]',
                      errors.external ? 'border-critical' : 'border-border',
                    )}
                    placeholder="ext_ab9f3..."
                    value={externalId}
                    onChange={(e) => setExternalId(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={genExternalId}
                    title="Gerar ID aleatório"
                    className="inline-flex h-8.5 w-8.5 items-center justify-center rounded-lg border border-border bg-surface transition-colors duration-120 hover:bg-surface-2 hover:border-border-strong"
                  >
                    <RefreshCw size={13} strokeWidth={1.6} />
                  </button>
                </div>
                {errors.external ? (
                  <FieldError message={errors.external} />
                ) : (
                  <p className="text-[11.5px] text-text-muted">
                    Use o mesmo external_id apenas se quiser deduplicar uma re-submissão.
                  </p>
                )}
              </div>

              {/* Tipo do evento */}
              <div className="grid gap-1.5">
                <label className="flex items-center gap-1.5 text-[12.5px] font-medium">
                  Tipo do evento <span className="text-critical">*</span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {TYPE_OPTIONS.map((opt) => (
                    <label
                      key={opt.value}
                      className={cn(
                        'flex cursor-pointer items-center gap-2.5 rounded-lg border bg-surface px-3 py-2.5 transition-[border-color,background,box-shadow] duration-120',
                        type === opt.value
                          ? 'border-brand shadow-[0_0_0_1px_var(--color-brand)]'
                          : 'border-border hover:border-border-strong',
                      )}
                    >
                      <input
                        type="radio"
                        name="type"
                        value={opt.value}
                        checked={type === opt.value}
                        onChange={() => setType(opt.value)}
                        className="hidden"
                      />
                      <TypeBadge type={opt.value} />
                      <div>
                        <div className="text-[13px] font-medium">{opt.label}</div>
                        <div className="mt-px text-[11.5px] text-text-muted">{opt.desc}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Payload JSON */}
              <div className="grid gap-1.5">
                <label className="flex items-center gap-1.5 text-[12.5px] font-medium">
                  Payload (JSON)
                  <span className="font-normal text-text-muted">— opcional, mas recomendado</span>
                </label>
                <textarea
                  className={cn(
                    'min-h-30 resize-y rounded-lg border bg-surface px-3 py-2.5 font-mono text-[12.5px] leading-[1.55] outline-none transition-[border-color,box-shadow] duration-120 focus:border-text focus:shadow-[0_0_0_3px_rgba(15,17,21,0.06)]',
                    errors.payload ? 'border-critical' : 'border-border',
                  )}
                  value={payload}
                  onChange={(e) => setPayload(e.target.value)}
                  rows={9}
                  spellCheck={false}
                />
                {errors.payload && <FieldError message={errors.payload} />}
              </div>

              {/* Divider + acoes */}
              <div className="border-t border-border" />

              <div className="flex items-center justify-between">
                <p className="text-[11.5px] text-text-muted">
                  O endpoint <code className="font-mono text-xs">POST /events</code> aceita esta
                  carga.
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleReuseLastSubmission}
                    disabled={submissions.length === 0}
                    title="Reusar dados da última submissão (para testar idempotência)"
                    className="inline-flex h-8.5 items-center gap-1.75 rounded-lg border border-border bg-surface px-3.5 text-[13px] font-medium transition-colors duration-120 hover:bg-surface-2 hover:border-border-strong disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Copy size={13} strokeWidth={1.6} />
                    Reusar último
                  </button>
                  <button
                    type="submit"
                    disabled={createEvent.isPending || entitySuspended}
                    className="inline-flex h-8.5 items-center gap-1.75 rounded-lg bg-brand px-3.5 text-[13px] font-medium text-brand-ink transition-colors duration-120 hover:bg-[#F7DC0E] disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {createEvent.isPending ? (
                      <Loader2 size={13} className="animate-spin" />
                    ) : (
                      <Send size={13} strokeWidth={1.6} />
                    )}
                    {createEvent.isPending ? 'Enviando...' : 'Enviar evento'}
                  </button>
                </div>
              </div>
            </form>
          </div>

          {/* Sidebar: submissoes recentes + idempotencia */}
          <div className="animate-fade-in-up [animation-delay:60ms] flex flex-col gap-4">
            {/* Submissoes recentes */}
            <div className="overflow-hidden rounded-md border border-border bg-surface shadow-sm">
              <div className="border-b border-border px-4.5 py-4">
                <div className="text-sm font-semibold tracking-[-0.01em]">Submissões recentes</div>
              </div>
              {submissions.length === 0 ? (
                <EmptyState
                  icon={<Send size={24} strokeWidth={1.6} />}
                  title="Nenhuma submissão"
                  description="Os eventos enviados nesta sessão aparecerão aqui."
                />
              ) : (
                <div>
                  {submissions.slice(0, 6).map((s, i) => (
                    <div
                      key={`${s.externalId}-${i}`}
                      className={cn(
                        'px-4.5 py-2.5 text-[12.5px]',
                        i > 0 && 'border-t border-border',
                      )}
                    >
                      <div className="mb-1 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <TypeBadge type={s.type} />
                          {s.result === 'duplicate' && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-warning-bg px-2 py-px text-[11px] font-medium text-warning">
                              duplicado
                            </span>
                          )}
                          {s.result === 'suspended' && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-critical-bg px-2 py-px text-[11px] font-medium text-critical">
                              rejeitado
                            </span>
                          )}
                        </div>
                        <span className="font-mono text-[11px] text-text-faint">
                          {formatTime(s.at)}
                        </span>
                      </div>
                      <div className="text-xs text-text-muted">
                        <code className="font-mono">{s.externalId}</code> → {s.entityName}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Card idempotencia */}
            <div className="overflow-hidden rounded-md border border-border bg-surface shadow-sm">
              <div className="border-b border-border px-4.5 py-4">
                <div className="text-sm font-semibold tracking-[-0.01em]">
                  Como funciona a idempotência
                </div>
              </div>
              <div className="space-y-2.5 px-4.5 py-4 text-[12.5px] leading-relaxed text-text-muted">
                <p>
                  Cada{' '}
                  <code className="rounded bg-surface-2 px-1 py-px font-mono text-xs text-text">
                    external_id
                  </code>{' '}
                  é único por entidade. Re-submissões retornam o registro original sem efeitos
                  colaterais.
                </p>
                <p>
                  Eventos do tipo <strong className="text-critical">critical</strong> incrementam o
                  contador atomicamente. Ao atingir o limite ({CRITICAL_EVENTS_LIMIT}), a entidade é
                  suspensa na mesma transação.
                </p>
                <p>Tente reenviar o mesmo external_id para ver a resposta de deduplicação.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

// ===== Componentes auxiliares =====

function ResultAlert({
  variant,
  icon,
  title,
  description,
}: {
  variant: 'success' | 'warning' | 'error'
  icon: React.ReactNode
  title: string
  description: React.ReactNode
}) {
  const styles = {
    success: 'bg-success-bg border-success/20 text-success',
    warning: 'bg-warning-bg border-warning/20 text-warning',
    error: 'bg-critical-bg border-critical/20 text-critical',
  }

  const iconBg = {
    success: 'bg-success',
    warning: 'bg-warning',
    error: 'bg-critical',
  }

  return (
    <div
      className={cn('flex items-start gap-3 rounded-md border p-3.5 text-[13px]', styles[variant])}
    >
      <span
        className={cn(
          'mt-px grid h-5 w-5 shrink-0 place-items-center rounded-full text-white',
          iconBg[variant],
        )}
      >
        {icon}
      </span>
      <div className="flex-1">
        <div className="font-semibold">{title}</div>
        <div className="mt-0.5 text-[12.5px] opacity-85">{description}</div>
      </div>
    </div>
  )
}

function FieldError({ message }: { message: string }) {
  return (
    <div className="flex items-center gap-1 text-xs text-critical">
      <AlertTriangle size={12} strokeWidth={1.6} />
      {message}
    </div>
  )
}
