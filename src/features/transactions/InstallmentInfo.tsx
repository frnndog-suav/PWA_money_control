import { useId } from 'react'
import { useToday } from '@/components/ui/useToday'
import { countPassedInstallments } from '@/domain/installments'
import { formatBRL } from '@/domain/money'
import type { Transaction } from '@/domain/types'
import { useInstallmentGroupDetails } from '@/repositories/installmentsRepository'

interface InstallmentInfoProps {
  transaction: Transaction
  groupId: string
}

/**
 * CA-08.5 — informações do parcelamento nos detalhes de uma parcela: qual é esta parcela, o
 * valor total, o número de parcelas e quantas já passaram (data até hoje — D-53).
 */
export function InstallmentInfo({ transaction, groupId }: InstallmentInfoProps) {
  const titleId = useId()
  const details = useInstallmentGroupDetails(groupId)
  const today = useToday()
  if (!details) return null
  const { group } = details

  return (
    <section
      aria-labelledby={titleId}
      className="flex flex-col gap-2 rounded-lg border border-slate-200 p-4 dark:border-slate-700"
    >
      <h2 id={titleId} className="font-semibold">
        Parcela {transaction.installmentNumber} de {group.count}
      </h2>
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
        <dt className="text-slate-600 dark:text-slate-300">Valor total</dt>
        <dd className="text-right tabular-nums">{formatBRL(group.totalCents)}</dd>
        <dt className="text-slate-600 dark:text-slate-300">Parcelas</dt>
        <dd className="text-right tabular-nums">{group.count}</dd>
        <dt className="text-slate-600 dark:text-slate-300">Já passaram</dt>
        <dd className="text-right tabular-nums">
          {countPassedInstallments(group, today)} de {group.count}
        </dd>
      </dl>
    </section>
  )
}
