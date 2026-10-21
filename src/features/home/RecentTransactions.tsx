import { useId } from 'react'
import { Link } from 'react-router'
import { TransactionRow } from '@/components/transactions/TransactionRow'
import { EmptyState } from '@/components/ui/EmptyState'
import type { DateString } from '@/domain/types'
import { NO_TRANSACTIONS_MESSAGE, RECENT_TRANSACTIONS_COUNT } from '@/features/home/homeTexts'
import { useTags } from '@/repositories/tagsRepository'
import { useRecentTransactions } from '@/repositories/transactionsRepository'

interface RecentTransactionsProps {
  /** Vem do `useToday`: na virada do dia a lista passa a incluir o novo dia (D-40). */
  today: DateString
}

/** RF-02 item 5 / D-40 — os 5 lançamentos mais recentes até hoje e o link "Ver todos". */
export function RecentTransactions({ today }: RecentTransactionsProps) {
  const titleId = useId()
  const transactions = useRecentTransactions(today, RECENT_TRANSACTIONS_COUNT)
  const tags = useTags()
  const tagsById = new Map(tags?.map((tag) => [tag.id, tag]))

  return (
    <section aria-labelledby={titleId} className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <h2 id={titleId} className="text-lg font-semibold">
          Últimos lançamentos
        </h2>
        <Link
          to="/lancamentos"
          className="flex min-h-11 items-center px-2 font-semibold text-blue-700 dark:text-blue-300"
        >
          Ver todos
        </Link>
      </div>
      {/* Sem nada enquanto carrega, para o estado vazio não piscar. */}
      {transactions?.length === 0 && <EmptyState>{NO_TRANSACTIONS_MESSAGE}</EmptyState>}
      {transactions && transactions.length > 0 && (
        <ul className="divide-y divide-slate-200 rounded-lg border border-slate-200 dark:divide-slate-700 dark:border-slate-700">
          {transactions.map((transaction) => (
            <TransactionRow
              key={transaction.id}
              transaction={transaction}
              tag={tagsById.get(transaction.tagId)}
            />
          ))}
        </ul>
      )}
    </section>
  )
}
