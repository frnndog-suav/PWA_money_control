import { Link } from 'react-router'
import { TransactionDescription } from '@/components/transactions/TransactionDescription'
import { SignedAmount } from '@/components/ui/SignedAmount'
import { TagChip } from '@/components/ui/TagChip'
import { signedAmount } from '@/domain/balances'
import { formatShortDate } from '@/domain/dates'
import type { Tag, Transaction } from '@/domain/types'

interface TransactionRowProps {
  transaction: Transaction
  /** Tag do lançamento (D-01); ausente só enquanto as tags carregam. */
  tag: Tag | undefined
  /** `false` na lista agrupada por dia (CA-04.1), onde a data já está no cabeçalho do dia. */
  showDate?: boolean
}

/**
 * RF-02 item 5 / RF-04 — descrição ("(k/n)" nas parcelas — RF-08), tag, data e valor com
 * sinal; tocar abre a edição (CA-01.5 / CA-04.5).
 */
export function TransactionRow({ transaction, tag, showDate = true }: TransactionRowProps) {
  return (
    <li>
      <Link
        to={`/lancamentos/${transaction.id}`}
        className="flex min-h-11 items-center gap-3 px-4 py-3"
      >
        <span className="flex min-w-0 flex-1 flex-col items-start gap-1">
          <span className="w-full truncate font-medium">
            <TransactionDescription transaction={transaction} />
          </span>
          <span className="flex max-w-full flex-wrap items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
            {tag && <TagChip name={tag.name} color={tag.color} />}
            {showDate && <span className="tabular-nums">{formatShortDate(transaction.date)}</span>}
          </span>
        </span>
        <SignedAmount cents={signedAmount(transaction)} />
      </Link>
    </li>
  )
}
