import { useParams } from 'react-router'
import { TransactionForm } from '@/components/transactions/TransactionForm'
import { BackLink } from '@/components/ui/BackLink'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { Page } from '@/components/ui/Page'
import type { Transaction } from '@/domain/types'
import { ConfirmDeleteTransactionDialog } from '@/features/transactions/ConfirmDeleteTransactionDialog'
import { DeleteConfirmedOccurrenceDialog } from '@/features/transactions/DeleteConfirmedOccurrenceDialog'
import { DeleteInstallmentDialog } from '@/features/transactions/DeleteInstallmentDialog'
import { InstallmentInfo } from '@/features/transactions/InstallmentInfo'
import { TRANSACTION_NOT_FOUND_MESSAGE } from '@/features/transactions/transactionListTexts'
import { useTransactionDetail } from '@/features/transactions/useTransactionDetail'

type Detail = ReturnType<typeof useTransactionDetail>

interface DeleteDialogProps {
  transaction: Transaction
  detail: Detail
}

/**
 * A confirmação de exclusão de cada tipo de lançamento: parcela (CA-08.4), confirmado de um
 * recorrente (RF-07) ou avulso (CA-01.6).
 */
function DeleteDialog({ transaction, detail }: DeleteDialogProps) {
  const common = {
    open: detail.isConfirmingDelete,
    onCancel: detail.cancelDelete,
    isDeleting: detail.isDeleting,
    errorMessage: detail.deleteError,
  }
  if (transaction.installmentGroupId !== null) {
    return (
      <DeleteInstallmentDialog
        {...common}
        transaction={transaction}
        onConfirm={detail.confirmInstallmentDelete}
      />
    )
  }
  if (transaction.recurringPeriod !== null) {
    return (
      <DeleteConfirmedOccurrenceDialog
        {...common}
        description={transaction.description}
        period={transaction.recurringPeriod}
        onConfirm={detail.confirmOccurrenceDelete}
      />
    )
  }
  return (
    <ConfirmDeleteTransactionDialog
      {...common}
      description={transaction.description}
      onConfirm={detail.confirmDelete}
    />
  )
}

/**
 * RF-01 — edição e exclusão de um lançamento. O confirmado de um recorrente fica no mês da
 * ocorrência e, ao ser excluído, pergunta o que fazer com o mês (RF-07 / D-51); a parcela mostra
 * o parcelamento (CA-08.5), muda só ela ao editar (CA-08.3) e tem três opções de exclusão
 * (CA-08.4).
 */
export function TransactionDetailPage() {
  const { id = '' } = useParams()
  const detail = useTransactionDetail(id)
  const { transaction } = detail

  return (
    <Page>
      <Page.Header leading={<BackLink fallbackTo="/lancamentos" />}>Lançamento</Page.Header>
      {/* Sem nada enquanto carrega ou saindo da tela, para nada piscar. */}
      {transaction === null && !detail.isDone && (
        <EmptyState>{TRANSACTION_NOT_FOUND_MESSAGE}</EmptyState>
      )}
      {transaction && (
        <>
          {transaction.installmentGroupId !== null && (
            <InstallmentInfo transaction={transaction} groupId={transaction.installmentGroupId} />
          )}
          <TransactionForm
            key={transaction.id}
            transaction={transaction}
            onUpdated={detail.onUpdated}
            extraAction={
              <Button variant="danger-outline" onClick={detail.requestDelete}>
                Excluir
              </Button>
            }
          />
          <DeleteDialog transaction={transaction} detail={detail} />
        </>
      )}
    </Page>
  )
}
