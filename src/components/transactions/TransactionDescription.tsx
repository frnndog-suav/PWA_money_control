import { displayDescription } from '@/domain/installments'
import type { Transaction } from '@/domain/types'
import { useInstallmentCount } from '@/repositories/installmentsRepository'

interface TransactionDescriptionProps {
  transaction: Pick<Transaction, 'description' | 'installmentGroupId' | 'installmentNumber'>
}

function InstallmentDescription({
  transaction,
  groupId,
}: TransactionDescriptionProps & { groupId: string }) {
  return <>{displayDescription(transaction, useInstallmentCount(groupId))}</>
}

/**
 * RF-08 — descrição como o usuário vê: "Notebook (2/12)" nas parcelas. Só as parcelas leem o
 * grupo (o "n"); os outros lançamentos mostram a descrição sem nenhuma consulta.
 */
export function TransactionDescription({ transaction }: TransactionDescriptionProps) {
  if (transaction.installmentGroupId === null) return <>{transaction.description}</>
  return (
    <InstallmentDescription transaction={transaction} groupId={transaction.installmentGroupId} />
  )
}
