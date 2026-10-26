import { useId, useState } from 'react'
import { ConfirmOccurrenceDialog } from '@/components/recurrings/ConfirmOccurrenceDialog'
import { PendingOccurrenceItem } from '@/components/recurrings/PendingOccurrenceItem'
import {
  CONFIRM_LABEL,
  OCCURRENCE_CONFIRMED_MESSAGE,
  OCCURRENCE_SKIPPED_MESSAGE,
  PENDING_RECURRINGS_TITLE,
  SKIP_FAILED_MESSAGE,
  SKIP_LABEL,
  UNDO_LABEL,
  UNSKIP_FAILED_MESSAGE,
} from '@/components/recurrings/recurringTexts'
import { Button } from '@/components/ui/Button'
import { ErrorAlert } from '@/components/ui/ErrorAlert'
import { Notice } from '@/components/ui/Notice'
import { Toast } from '@/components/ui/Toast'
import { useToast } from '@/components/ui/useToast'
import type { PendingOccurrence } from '@/domain/recurring'
import type { PeriodString } from '@/domain/types'
import { skipErrorMessage } from '@/components/recurrings/skipErrorMessage'
import { skipOccurrence, unskipOccurrence } from '@/repositories/recurringsRepository'
import { useTags } from '@/repositories/tagsRepository'

interface PendingOccurrencesSectionProps {
  occurrences: PendingOccurrence[]
  /** Mês atual: ocorrências de meses anteriores aparecem como "Não confirmada" (CA-07.7). */
  currentPeriod: PeriodString
  /** D-51 — na visão Mês cada pendente também pode ser pulada; no Início, só confirmada. */
  canSkip: boolean
}

/** Tempo do aviso "Mês pulado." com "Desfazer" (D-51): o bastante para ler e tocar. */
const UNDO_NOTICE_MS = 8000

interface SkippedOccurrence {
  recurringId: string
  period: PeriodString
}

/**
 * RF-02 item 4 / RF-05 — "Recorrentes pendentes": lista com "Confirmar" (e "Pular", quando
 * permitido). Oculta quando não há pendências.
 */
export function PendingOccurrencesSection({
  occurrences,
  currentPeriod,
  canSkip,
}: PendingOccurrencesSectionProps) {
  const titleId = useId()
  const tags = useTags()
  const tagsById = new Map(tags?.map((tag) => [tag.id, tag]))
  const [confirming, setConfirming] = useState<PendingOccurrence | null>(null)
  const [lastSkipped, setLastSkipped] = useState<SkippedOccurrence | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  // Um toque de cada vez: o 2º toque em "Pular" acharia o mês já pulado e mostraria erro.
  const [isBusy, setIsBusy] = useState(false)
  const confirmedToast = useToast()
  const undoNotice = useToast(UNDO_NOTICE_MS)

  const skip = async ({ recurring, period }: PendingOccurrence) => {
    if (isBusy) return
    setActionError(null)
    setIsBusy(true)
    try {
      await skipOccurrence(recurring.id, period)
      setLastSkipped({ recurringId: recurring.id, period })
      undoNotice.show(OCCURRENCE_SKIPPED_MESSAGE)
    } catch (error) {
      setActionError(skipErrorMessage(error, SKIP_FAILED_MESSAGE))
    } finally {
      setIsBusy(false)
    }
  }

  const undoSkip = async () => {
    if (!lastSkipped || isBusy) return
    setActionError(null)
    setIsBusy(true)
    try {
      await unskipOccurrence(lastSkipped.recurringId, lastSkipped.period)
      undoNotice.hide()
      setLastSkipped(null)
    } catch (error) {
      setActionError(skipErrorMessage(error, UNSKIP_FAILED_MESSAGE))
    } finally {
      setIsBusy(false)
    }
  }

  const isEmpty = occurrences.length === 0

  return (
    <>
      {/* A lista some sem pendências, mas o "Desfazer" do último pulo continua à mão. */}
      {undoNotice.message && (
        <div role="status">
          <Notice variant="accent">
            <Notice.Message>{undoNotice.message}</Notice.Message>
            <Notice.Action onClick={undoSkip}>{UNDO_LABEL}</Notice.Action>
          </Notice>
        </div>
      )}
      {actionError && <ErrorAlert>{actionError}</ErrorAlert>}
      {!isEmpty && (
        <section aria-labelledby={titleId} className="flex flex-col gap-2">
          <h2 id={titleId} className="text-lg font-semibold">
            {PENDING_RECURRINGS_TITLE}
          </h2>
          <ul className="divide-y divide-slate-200 rounded-lg border border-slate-200 dark:divide-slate-700 dark:border-slate-700">
            {occurrences.map((occurrence) => (
              <PendingOccurrenceItem
                key={`${occurrence.recurring.id}|${occurrence.period}`}
                occurrence={occurrence}
                tag={tagsById.get(occurrence.recurring.tagId)}
                isOverdue={occurrence.period < currentPeriod}
                actions={
                  <>
                    {canSkip && (
                      <Button
                        variant="secondary"
                        disabled={isBusy}
                        aria-label={`${SKIP_LABEL} ${occurrence.recurring.description}`}
                        onClick={() => skip(occurrence)}
                      >
                        {SKIP_LABEL}
                      </Button>
                    )}
                    <Button
                      variant="primary"
                      aria-label={`${CONFIRM_LABEL} ${occurrence.recurring.description}`}
                      onClick={() => setConfirming(occurrence)}
                    >
                      {CONFIRM_LABEL}
                    </Button>
                  </>
                }
              />
            ))}
          </ul>
        </section>
      )}
      <ConfirmOccurrenceDialog
        occurrence={confirming}
        onClose={() => setConfirming(null)}
        onConfirmed={() => {
          setConfirming(null)
          confirmedToast.show(OCCURRENCE_CONFIRMED_MESSAGE)
        }}
      />
      <Toast message={confirmedToast.message} />
    </>
  )
}
