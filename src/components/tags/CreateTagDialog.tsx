import { TagForm } from '@/components/tags/TagForm'
import { Modal } from '@/components/ui/Modal'
import type { Tag } from '@/domain/types'

interface CreateTagDialogProps {
  open: boolean
  onCreated: (tag: Tag) => void
  onClose: () => void
}

/**
 * CA-01.7 — "Nova tag" aberta por cima de outro formulário. Precisa ficar fora do `<form>`
 * de quem a abre: formulários aninhados não são válidos e o envio de um dispararia o outro.
 */
export function CreateTagDialog({ open, onCreated, onClose }: CreateTagDialogProps) {
  return (
    <Modal open={open} title="Nova tag" onClose={onClose}>
      <TagForm onSaved={onCreated} onCancel={onClose} />
    </Modal>
  )
}
