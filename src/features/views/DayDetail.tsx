import { TransactionRow } from '@/components/transactions/TransactionRow'
import { EmptyState } from '@/components/ui/EmptyState'
import type { Transaction } from '@/domain/types'
import { NO_DAY_TRANSACTIONS_MESSAGE } from '@/features/views/viewTexts'
import { useTags } from '@/repositories/tagsRepository'

interface DayDetailProps {
  /** Lançamentos do dia, do mais recente ao mais antigo. */
  transactions: Transaction[]
}

/**
 * RF-05 visão Dia — lista dos lançamentos do dia; os totais estão no cartão de resumo. Tocar
 * num lançamento abre a edição (CA-01.5).
 */
export function DayDetail({ transactions }: DayDetailProps) {
  const tags = useTags()
  const tagsById = new Map(tags?.map((tag) => [tag.id, tag]))

  if (transactions.length === 0) return <EmptyState>{NO_DAY_TRANSACTIONS_MESSAGE}</EmptyState>

  return (
    <ul
      aria-label="Lançamentos do dia"
      className="divide-y divide-slate-200 rounded-lg border border-slate-200 dark:divide-slate-700 dark:border-slate-700"
    >
      {transactions.map((transaction) => (
        <TransactionRow
          key={transaction.id}
          transaction={transaction}
          tag={tagsById.get(transaction.tagId)}
          showDate={false}
        />
      ))}
    </ul>
  )
}
