import { useId } from 'react'
import { UNDO_LABEL } from '@/components/recurrings/recurringTexts'
import { Button } from '@/components/ui/Button'
import { formatMonthLabel } from '@/domain/dates'
import type { PeriodString, Recurring } from '@/domain/types'

const LIST_CLASSES =
  'divide-y divide-slate-200 rounded-lg border border-slate-200 dark:divide-slate-700 dark:border-slate-700'

interface SkippedMonthsProps {
  recurring: Recurring
  onUndo: (period: PeriodString) => void
  isBusy: boolean
}

/** CA-07.4 — meses pulados, cada um com "Desfazer" (volta a pendente). Oculto sem pulos. */
export function SkippedMonths({ recurring, onUndo, isBusy }: SkippedMonthsProps) {
  const titleId = useId()
  if (recurring.skippedPeriods.length === 0) return null

  return (
    <section aria-labelledby={titleId} className="flex flex-col gap-2">
      <h2 id={titleId} className="text-lg font-semibold">
        Meses pulados
      </h2>
      <ul className={LIST_CLASSES}>
        {recurring.skippedPeriods.map((period) => (
          <li key={period} className="flex items-center justify-between gap-3 px-4 py-2">
            <span className="first-letter:uppercase">{formatMonthLabel(period)}</span>
            <Button
              variant="secondary"
              disabled={isBusy}
              aria-label={`${UNDO_LABEL}: ${formatMonthLabel(period)}`}
              onClick={() => onUndo(period)}
            >
              {UNDO_LABEL}
            </Button>
          </li>
        ))}
      </ul>
    </section>
  )
}
