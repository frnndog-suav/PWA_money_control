import { SignedAmount } from '@/components/ui/SignedAmount'
import { TagChip } from '@/components/ui/TagChip'
import { formatMonthLabel } from '@/domain/dates'
import { displayAmount } from '@/domain/recurring'
import type { PeriodString, Recurring, Tag } from '@/domain/types'
import { NO_END_LABEL, TYPE_LABELS } from '@/features/recurrings/recurringsTexts'

interface RecurringSummaryProps {
  recurring: Recurring
  tag: Tag | undefined
  currentPeriod: PeriodString
}

/** RF-07 — campos do recorrente: tipo, tag, valor vigente, início e término. */
export function RecurringSummary({ recurring, tag, currentPeriod }: RecurringSummaryProps) {
  const cents = displayAmount(recurring, currentPeriod)

  return (
    <dl className="grid grid-cols-[auto_1fr] items-center gap-x-4 gap-y-2 rounded-lg border border-slate-200 p-4 dark:border-slate-700">
      <dt className="text-slate-600 dark:text-slate-300">Tipo</dt>
      <dd>{TYPE_LABELS[recurring.type]}</dd>
      <dt className="text-slate-600 dark:text-slate-300">Tag</dt>
      <dd>{tag ? <TagChip name={tag.name} color={tag.color} /> : '—'}</dd>
      <dt className="text-slate-600 dark:text-slate-300">Valor vigente</dt>
      <dd>
        <SignedAmount cents={recurring.type === 'income' ? cents : -cents} />
      </dd>
      <dt className="text-slate-600 dark:text-slate-300">Início</dt>
      <dd className="first-letter:uppercase">{formatMonthLabel(recurring.startPeriod)}</dd>
      <dt className="text-slate-600 dark:text-slate-300">Término</dt>
      <dd className="first-letter:uppercase">
        {recurring.endPeriod ? formatMonthLabel(recurring.endPeriod) : NO_END_LABEL}
      </dd>
    </dl>
  )
}
