import { useParams } from 'react-router'
import { TransactionForm } from '@/components/transactions/TransactionForm'
import { BackLink } from '@/components/ui/BackLink'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { Page } from '@/components/ui/Page'
import { ConfirmDeleteTransactionDialog } from '@/features/transactions/ConfirmDeleteTransactionDialog'
import { DeleteConfirmedOccurrenceDialog } from '@/features/transactions/DeleteConfirmedOccurrenceDialog'
import { useTransactionDetail } from '@/features/transactions/useTransactionDetail'

// RF-01 — edição e exclusão de um lançamento. O confirmado de um recorrente fica no mês da
// ocorrência e, ao ser excluído, pergunta o que fazer com o mês (RF-07 / D-51). (Regras de
// parcelas — RF-08 — chegam na Fase 10.)
export function TransactionDetailPage() {
  const { id = '' } = useParams()
  const detail = useTransactionDetail(id)
  const { transaction } = detail

  return (
    <Page>
      <Page.Header leading={<BackLink fallbackTo="/lancamentos" />}>Lançamento</Page.Header>
      {/* Sem nada enquanto carrega ou saindo da tela, para nada piscar. */}
      {transaction === null && !detail.isDone && <EmptyState>Lançamento não encontrado</EmptyState>}
      {transaction && (
        <>
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
          {transaction.recurringPeriod !== null && (
            <DeleteConfirmedOccurrenceDialog
              open={detail.isConfirmingDelete}
              description={transaction.description}
              period={transaction.recurringPeriod}
              onConfirm={detail.confirmDelete}
              onCancel={detail.cancelDelete}
              isDeleting={detail.isDeleting}
              errorMessage={detail.deleteError}
            />
          )}
          <ConfirmDeleteTransactionDialog
            open={detail.isConfirmingDelete && transaction.recurringPeriod === null}
            description={transaction.description}
            onConfirm={() => detail.confirmDelete()}
            onCancel={detail.cancelDelete}
            isDeleting={detail.isDeleting}
            errorMessage={detail.deleteError}
          />
        </>
      )}
    </Page>
  )
}
