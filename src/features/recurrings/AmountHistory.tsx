import { useId } from 'react'
import { formatBRL } from '@/domain/money'
import type { Recurring } from '@/domain/types'
import { amountSinceLabel } from '@/features/recurrings/recurringsTexts'

interface AmountHistoryProps {
  recurring: Recurring
}

const LIST_CLASSES =
  'divide-y divide-slate-200 rounded-lg border border-slate-200 dark:divide-slate-700 dark:border-slate-700'

/** RF-07 — histórico de valores: cada valor e o mês a partir do qual vale (CA-07.3). */
export function AmountHistory({ recurring }: AmountHistoryProps) {
  const titleId = useId()
  return (
    <section aria-labelledby={titleId} className="flex flex-col gap-2">
      <h2 id={titleId} className="text-lg font-semibold">
        Histórico de valores
      </h2>
      <ul className={LIST_CLASSES}>
        {[...recurring.amounts].reverse().map((item) => (
          <li key={item.fromPeriod} className="flex items-center justify-between gap-3 px-4 py-3">
            <span className="tabular-nums">{formatBRL(item.amountCents)}</span>
            <span className="text-sm text-slate-600 dark:text-slate-300">
              {amountSinceLabel(item.fromPeriod)}
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}
