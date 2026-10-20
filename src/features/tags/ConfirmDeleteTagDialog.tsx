import { Button } from '@/components/ui/Button'
import { ErrorAlert } from '@/components/ui/ErrorAlert'
import { Modal } from '@/components/ui/Modal'
import type { Tag } from '@/domain/types'

interface ConfirmDeleteTagDialogProps {
  tag: Tag | null
  onConfirm: (tag: Tag) => void
  onCancel: () => void
  /** Exclusão em andamento: "Excluir" fica desabilitado. */
  isDeleting: boolean
  /** Falha ao excluir (ex.: erro do IndexedDB). */
  errorMessage: string | null
}

/** CA-03.3 — confirmação antes de excluir uma tag sem uso. */
export function ConfirmDeleteTagDialog({
  tag,
  onConfirm,
  onCancel,
  isDeleting,
  errorMessage,
}: ConfirmDeleteTagDialogProps) {
  return (
    <Modal open={tag !== null} title="Excluir tag?" onClose={onCancel}>
      {tag && (
        <>
          <Modal.Body>
            <p>A tag “{tag.name}” será excluída. Esta ação não pode ser desfeita.</p>
            {errorMessage && <ErrorAlert>{errorMessage}</ErrorAlert>}
          </Modal.Body>
          <Modal.Actions>
            <Button variant="secondary" onClick={onCancel}>
              Cancelar
            </Button>
            <Button variant="danger" disabled={isDeleting} onClick={() => onConfirm(tag)}>
              Excluir
            </Button>
          </Modal.Actions>
        </>
      )}
    </Modal>
  )
}
