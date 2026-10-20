import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import type { TagUsage } from '@/domain/tags'
import type { Tag } from '@/domain/types'
import { formatTagUsage } from '@/features/tags/tagTexts'

interface DeleteTagBlockedDialogProps {
  blocked: { tag: Tag; usage: TagUsage } | null
  onClose: () => void
}

/** CA-03.2 / D-02 — exclusão bloqueada: informa quantos registros usam a tag. */
export function DeleteTagBlockedDialog({ blocked, onClose }: DeleteTagBlockedDialogProps) {
  return (
    <Modal open={blocked !== null} title="Não é possível excluir" onClose={onClose}>
      {blocked && (
        <>
          <Modal.Body>
            <p>
              A tag “{blocked.tag.name}” está em uso por {formatTagUsage(blocked.usage)} e não pode
              ser excluída. Ela só pode ser excluída quando nenhum registro a usar.
            </p>
          </Modal.Body>
          <Modal.Actions>
            <Button variant="primary" onClick={onClose}>
              Entendi
            </Button>
          </Modal.Actions>
        </>
      )}
    </Modal>
  )
}
