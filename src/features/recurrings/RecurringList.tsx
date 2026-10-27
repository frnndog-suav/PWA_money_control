import { Link } from 'react-router'
import { SignedAmount } from '@/components/ui/SignedAmount'
import { TagChip } from '@/components/ui/TagChip'
import { displayAmount, recurringListStatus } from '@/domain/recurring'
import type { PeriodString, Recurring, Tag } from '@/domain/types'
import { statusLabel, TYPE_LABELS } from '@/features/recurrings/recurringsTexts'

interface RecurringListProps {
  recurrings: Recurring[]
  tagsById: ReadonlyMap<string, Tag>
  currentPeriod: PeriodString
  confirmedKeys: ReadonlySet<string>
}

/**
 * CA-07.6 — todos os recorrentes (ativos e encerrados) com tipo, tag, valor vigente e status
 * do mês atual; tocar abre os detalhes.
 */
export function RecurringList({
  recurrings,
  tagsById,
  currentPeriod,
  confirmedKeys,
}: RecurringListProps) {
  return (
    <ul className="divide-y divide-slate-200 rounded-lg border border-slate-200 dark:divide-slate-700 dark:border-slate-700">
      {recurrings.map((recurring) => {
        const tag = tagsById.get(recurring.tagId)
        const cents = displayAmount(recurring, currentPeriod)
        const status = recurringListStatus(recurring, currentPeriod, confirmedKeys)
        return (
          <li key={recurring.id}>
            <Link
              to={`/ajustes/recorrentes/${recurring.id}`}
              className="flex min-h-11 items-center gap-3 px-4 py-3"
            >
              <span className="flex min-w-0 flex-1 flex-col items-start gap-1">
                <span className="w-full truncate font-medium">{recurring.description}</span>
                <span className="flex flex-wrap items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                  <span>{TYPE_LABELS[recurring.type]}</span>
                  {tag && <TagChip name={tag.name} color={tag.color} />}
                  <span>{statusLabel(status, recurring.startPeriod)}</span>
                </span>
              </span>
              <SignedAmount cents={recurring.type === 'income' ? cents : -cents} />
              <span aria-hidden="true" className="text-slate-500 dark:text-slate-400">
                ›
              </span>
            </Link>
          </li>
        )
      })}
    </ul>
  )
}
