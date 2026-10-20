import { Button } from '@/components/ui/Button'
import { ErrorAlert } from '@/components/ui/ErrorAlert'
import { Modal } from '@/components/ui/Modal'

interface ConfirmDeleteTransactionDialogProps {
  open: boolean
  description: string
  onConfirm: () => void
  onCancel: () => void
  /** Exclusão em andamento: "Excluir" fica desabilitado. */
  isDeleting: boolean
  /** Falha ao excluir (ex.: erro do IndexedDB). */
  errorMessage: string | null
}

/** CA-01.6 — confirmação antes de excluir um lançamento. */
export function ConfirmDeleteTransactionDialog({
  open,
  description,
  onConfirm,
  onCancel,
  isDeleting,
  errorMessage,
}: ConfirmDeleteTransactionDialogProps) {
  return (
    <Modal open={open} title="Excluir lançamento?" onClose={onCancel}>
      <Modal.Body>
        <p>O lançamento “{description}” será excluído. Esta ação não pode ser desfeita.</p>
        {errorMessage && <ErrorAlert>{errorMessage}</ErrorAlert>}
      </Modal.Body>
      <Modal.Actions>
        <Button variant="secondary" onClick={onCancel}>
          Cancelar
        </Button>
        <Button variant="danger" disabled={isDeleting} onClick={onConfirm}>
          Excluir
        </Button>
      </Modal.Actions>
    </Modal>
  )
}
