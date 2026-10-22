import { useId } from 'react'
import { IncomeExpenseTotals } from '@/components/transactions/IncomeExpenseTotals'
import { TransactionRow } from '@/components/transactions/TransactionRow'
import { formatLongDate } from '@/domain/dates'
import type { DayGroup } from '@/domain/transactionFilters'
import type { Tag } from '@/domain/types'

interface DaySectionProps {
  day: DayGroup
  tagsById: ReadonlyMap<string, Tag>
}

/** CA-04.1 — cabeçalho com a data por extenso e os totais do dia, seguido dos lançamentos. */
export function DaySection({ day, tagsById }: DaySectionProps) {
  const titleId = useId()

  return (
    <section aria-labelledby={titleId} className="flex flex-col gap-2">
      <header className="flex flex-col gap-0.5">
        <h2 id={titleId} className="font-semibold first-letter:uppercase">
          {formatLongDate(day.date)}
        </h2>
        <IncomeExpenseTotals incomeCents={day.incomeCents} expenseCents={day.expenseCents} />
      </header>
      <ul className="divide-y divide-slate-200 rounded-lg border border-slate-200 dark:divide-slate-700 dark:border-slate-700">
        {day.transactions.map((transaction) => (
          <TransactionRow
            key={transaction.id}
            transaction={transaction}
            tag={tagsById.get(transaction.tagId)}
            showDate={false}
          />
        ))}
      </ul>
    </section>
  )
}
