import { useId } from 'react'
import { CONFIRM_LABEL, SKIP_LABEL, UNDO_LABEL } from '@/components/recurrings/recurringTexts'
import { Button } from '@/components/ui/Button'
import { formatMonthLabel } from '@/domain/dates'
import type { RecurringListStatus } from '@/domain/recurring'
import type { PeriodString, Recurring } from '@/domain/types'
import { statusLabel } from '@/features/recurrings/recurringsTexts'

interface CurrentOccurrenceProps {
  recurring: Recurring
  period: PeriodString
  status: RecurringListStatus
  onConfirm: () => void
  onSkip: () => void
  onUndoSkip: () => void
  /** Ação em andamento: evita o toque duplo. */
  isBusy: boolean
}

/** CA-07.6 — status do mês atual, com as ações que cabem nele. */
export function CurrentOccurrence({
  recurring,
  period,
  status,
  onConfirm,
  onSkip,
  onUndoSkip,
  isBusy,
}: CurrentOccurrenceProps) {
  const titleId = useId()

  return (
    <section
      aria-labelledby={titleId}
      className="flex flex-col gap-3 rounded-lg border border-slate-200 p-4 dark:border-slate-700"
    >
      <h2 id={titleId} className="font-semibold first-letter:uppercase">
        {formatMonthLabel(period)}
      </h2>
      <p>{statusLabel(status, recurring.startPeriod)}</p>
      {status === 'pending' && (
        <div className="flex gap-2 *:flex-1">
          <Button variant="secondary" disabled={isBusy} onClick={onSkip}>
            {SKIP_LABEL}
          </Button>
          <Button variant="primary" onClick={onConfirm}>
            {CONFIRM_LABEL}
          </Button>
        </div>
      )}
      {status === 'skipped' && (
        <Button variant="secondary" disabled={isBusy} onClick={onUndoSkip}>
          {UNDO_LABEL}
        </Button>
      )}
    </section>
  )
}
