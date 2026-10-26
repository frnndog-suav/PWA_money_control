import { TransactionDescription } from '@/components/transactions/TransactionDescription'
import { Button } from '@/components/ui/Button'
import { ErrorAlert } from '@/components/ui/ErrorAlert'
import { Modal } from '@/components/ui/Modal'
import type { InstallmentDeleteScope } from '@/domain/installments'
import type { Transaction } from '@/domain/types'

interface DeleteInstallmentDialogProps {
  open: boolean
  transaction: Transaction
  onConfirm: (scope: InstallmentDeleteScope) => void
  onCancel: () => void
  isDeleting: boolean
  errorMessage: string | null
}

/** CA-08.4 — excluir uma parcela: "Só esta", "Esta e as seguintes" ou "Todas as parcelas". */
export function DeleteInstallmentDialog({
  open,
  transaction,
  onConfirm,
  onCancel,
  isDeleting,
  errorMessage,
}: DeleteInstallmentDialogProps) {
  return (
    <Modal open={open} title="Excluir parcela?" onClose={onCancel}>
      <Modal.Body>
        <p>
          “<TransactionDescription transaction={transaction} />” faz parte de um parcelamento. O que
          deve ser excluído? Esta ação não pode ser desfeita.
        </p>
        {errorMessage && <ErrorAlert>{errorMessage}</ErrorAlert>}
      </Modal.Body>
      <div className="flex flex-col gap-2">
        <Button variant="danger" disabled={isDeleting} onClick={() => onConfirm('one')}>
          Só esta
        </Button>
        <Button variant="danger" disabled={isDeleting} onClick={() => onConfirm('following')}>
          Esta e as seguintes
        </Button>
        <Button variant="danger" disabled={isDeleting} onClick={() => onConfirm('all')}>
          Todas as parcelas
        </Button>
        <Button variant="secondary" onClick={onCancel}>
          Cancelar
        </Button>
      </div>
    </Modal>
  )
}
