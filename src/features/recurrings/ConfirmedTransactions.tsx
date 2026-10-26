import { useId } from 'react'
import { TransactionRow } from '@/components/transactions/TransactionRow'
import type { Tag, Transaction } from '@/domain/types'

interface ConfirmedTransactionsProps {
  /** Do mês mais recente ao mais antigo. */
  transactions: Transaction[]
  tagsById: ReadonlyMap<string, Tag>
}

/** RF-07 — lançamentos confirmados do recorrente; tocar abre a edição (CA-01.5). */
export function ConfirmedTransactions({ transactions, tagsById }: ConfirmedTransactionsProps) {
  const titleId = useId()
  if (transactions.length === 0) return null

  return (
    <section aria-labelledby={titleId} className="flex flex-col gap-2">
      <h2 id={titleId} className="text-lg font-semibold">
        Lançamentos confirmados
      </h2>
      <ul className="divide-y divide-slate-200 rounded-lg border border-slate-200 dark:divide-slate-700 dark:border-slate-700">
        {transactions.map((transaction) => (
          // A tag de cada lançamento pode ter sido trocada só nele (RF-07 "Confirmar").
          <TransactionRow
            key={transaction.id}
            transaction={transaction}
            tag={tagsById.get(transaction.tagId)}
          />
        ))}
      </ul>
    </section>
  )
}
