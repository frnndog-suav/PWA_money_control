import { Button } from '@/components/ui/Button'
import { ErrorAlert } from '@/components/ui/ErrorAlert'
import { Modal } from '@/components/ui/Modal'
import { DELETE_BLOCKED_MESSAGE } from '@/features/recurrings/recurringsTexts'

export type DeleteRecurringStep = 'confirm' | 'blocked'

interface DeleteRecurringDialogProps {
  /** `null` fecha; `blocked` quando há ocorrência confirmada (RF-07). */
  step: DeleteRecurringStep | null
  description: string
  isDeleting: boolean
  errorMessage: string | null
  onConfirm: () => void
  /** Sugestão do RF-07 quando a exclusão é bloqueada. */
  onEndInstead: () => void
  onClose: () => void
}

/**
 * RF-07 "Excluir recorrente" — só sem ocorrência confirmada; com alguma, explica e sugere
 * "Encerrar".
 */
export function DeleteRecurringDialog({
  step,
  description,
  isDeleting,
  errorMessage,
  onConfirm,
  onEndInstead,
  onClose,
}: DeleteRecurringDialogProps) {
  const isBlocked = step === 'blocked'

  return (
    <Modal
      open={step !== null}
      title={isBlocked ? 'Não é possível excluir' : 'Excluir recorrente?'}
      onClose={onClose}
    >
      <Modal.Body>
        <p>
          {isBlocked
            ? DELETE_BLOCKED_MESSAGE
            : `O recorrente “${description}” será excluído. Esta ação não pode ser desfeita.`}
        </p>
        {errorMessage && <ErrorAlert>{errorMessage}</ErrorAlert>}
      </Modal.Body>
      <Modal.Actions>
        <Button variant="secondary" onClick={onClose}>
          {isBlocked ? 'Fechar' : 'Cancelar'}
        </Button>
        {isBlocked ? (
          <Button variant="primary" onClick={onEndInstead}>
            Encerrar
          </Button>
        ) : (
          <Button variant="danger" disabled={isDeleting} onClick={onConfirm}>
            Excluir
          </Button>
        )}
      </Modal.Actions>
    </Modal>
  )
}
