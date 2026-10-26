import { useParams } from 'react-router'
import { ConfirmOccurrenceDialog } from '@/components/recurrings/ConfirmOccurrenceDialog'
import { BackLink } from '@/components/ui/BackLink'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { ErrorAlert } from '@/components/ui/ErrorAlert'
import { Page } from '@/components/ui/Page'
import { Toast } from '@/components/ui/Toast'
import { AmountHistory } from '@/features/recurrings/AmountHistory'
import { ChangeAmountDialog } from '@/features/recurrings/ChangeAmountDialog'
import { ConfirmedTransactions } from '@/features/recurrings/ConfirmedTransactions'
import { CurrentOccurrence } from '@/features/recurrings/CurrentOccurrence'
import { DeleteRecurringDialog } from '@/features/recurrings/DeleteRecurringDialog'
import { EditRecurringDialog } from '@/features/recurrings/EditRecurringDialog'
import { EndRecurringDialog } from '@/features/recurrings/EndRecurringDialog'
import { RecurringSummary } from '@/features/recurrings/RecurringSummary'
import { RECURRING_NOT_FOUND_MESSAGE } from '@/features/recurrings/recurringsTexts'
import { SkippedMonths } from '@/features/recurrings/SkippedMonths'
import { useRecurringDetail } from '@/features/recurrings/useRecurringDetail'
import { useTags } from '@/repositories/tagsRepository'

/**
 * RF-07 / CA-07.6 — detalhes de um recorrente: status do mês atual (confirmar, pular,
 * desfazer), editar descrição e tag, alterar valor, encerrar, excluir (com a regra), histórico
 * de valores, meses pulados e lançamentos confirmados.
 */
export function RecurringDetailPage() {
  const { id = '' } = useParams()
  const detail = useRecurringDetail(id)
  const { recurring, confirmations, currentPeriod, status } = detail
  const tags = useTags()
  const tagsById = new Map(tags?.map((item) => [item.id, item]))
  const tag = recurring ? tagsById.get(recurring.tagId) : undefined

  return (
    <Page>
      <Page.Header leading={<BackLink fallbackTo="/ajustes/recorrentes" />}>
        {recurring?.description ?? 'Recorrente'}
      </Page.Header>
      {/* Sem nada enquanto carrega ou saindo da tela depois de excluir. */}
      {recurring === null && !detail.isDeleted && (
        <EmptyState>{RECURRING_NOT_FOUND_MESSAGE}</EmptyState>
      )}
      {recurring && status && confirmations && (
        <Page.Body>
          <RecurringSummary recurring={recurring} tag={tag} currentPeriod={currentPeriod} />
          <CurrentOccurrence
            recurring={recurring}
            period={currentPeriod}
            status={status}
            onConfirm={detail.startConfirm}
            onSkip={() => detail.skip(currentPeriod)}
            onUndoSkip={() => detail.undoSkip(currentPeriod)}
            isBusy={detail.isBusy}
          />
          {detail.actionError && <ErrorAlert>{detail.actionError}</ErrorAlert>}
          <div className="grid grid-cols-2 gap-2">
            <Button variant="secondary" onClick={() => detail.openDialog('edit')}>
              Editar
            </Button>
            <Button variant="secondary" onClick={() => detail.openDialog('amount')}>
              Alterar valor
            </Button>
            <Button variant="secondary" onClick={() => detail.openDialog('end')}>
              Encerrar
            </Button>
            <Button variant="danger-outline" onClick={detail.requestDelete}>
              Excluir
            </Button>
          </div>
          <AmountHistory recurring={recurring} />
          <SkippedMonths recurring={recurring} onUndo={detail.undoSkip} isBusy={detail.isBusy} />
          <ConfirmedTransactions transactions={confirmations} tagsById={tagsById} />

          <EditRecurringDialog
            open={detail.dialog === 'edit'}
            recurring={recurring}
            onClose={detail.closeDialog}
            onSaved={detail.onEdited}
          />
          <ChangeAmountDialog
            open={detail.dialog === 'amount'}
            recurring={recurring}
            currentPeriod={currentPeriod}
            onClose={detail.closeDialog}
            onSaved={detail.onAmountChanged}
          />
          <EndRecurringDialog
            open={detail.dialog === 'end'}
            recurring={recurring}
            currentPeriod={currentPeriod}
            lastConfirmedPeriod={detail.lastConfirmedPeriod}
            onClose={detail.closeDialog}
            onSaved={detail.onEnded}
          />
          <DeleteRecurringDialog
            step={detail.deleteStep}
            description={recurring.description}
            isDeleting={detail.isDeleting}
            errorMessage={detail.actionError}
            onConfirm={detail.confirmDelete}
            onEndInstead={detail.endInsteadOfDelete}
            onClose={detail.cancelDelete}
          />
          <ConfirmOccurrenceDialog
            occurrence={detail.confirming}
            onClose={detail.cancelConfirm}
            onConfirmed={detail.onConfirmed}
          />
        </Page.Body>
      )}
      <Toast message={detail.toastMessage} />
    </Page>
  )
}
