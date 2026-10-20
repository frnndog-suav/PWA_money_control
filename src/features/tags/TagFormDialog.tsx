import { Button } from '@/components/ui/Button'
import { ErrorAlert } from '@/components/ui/ErrorAlert'
import { Modal } from '@/components/ui/Modal'
import type { Tag } from '@/domain/types'
import { TagForm } from '@/features/tags/TagForm'

interface TagFormDialogProps {
  open: boolean
  /** Tag em edição; ausente ao criar. */
  tag?: Tag
  onClose: () => void
  onDelete: (tag: Tag) => void
  /** Conferindo se a tag está em uso: "Excluir tag" fica desabilitado. */
  isCheckingUsage: boolean
  /** Falha ao conferir o uso antes de excluir. */
  deleteError: string | null
}

/** RF-03 — modal de criar ("Nova tag") ou editar ("Editar tag", com "Excluir tag"). */
export function TagFormDialog({
  open,
  tag,
  onClose,
  onDelete,
  isCheckingUsage,
  deleteError,
}: TagFormDialogProps) {
  return (
    <Modal open={open} title={tag ? 'Editar tag' : 'Nova tag'} onClose={onClose}>
      <TagForm
        // Trocar de tag recria o formulário com os valores dela.
        key={tag?.id ?? 'new'}
        tag={tag}
        onSaved={onClose}
        onCancel={onClose}
        notice={deleteError && <ErrorAlert>{deleteError}</ErrorAlert>}
        extraAction={
          tag && (
            <Button
              variant="danger-outline"
              disabled={isCheckingUsage}
              onClick={() => onDelete(tag)}
            >
              Excluir tag
            </Button>
          )
        }
      />
    </Modal>
  )
}
