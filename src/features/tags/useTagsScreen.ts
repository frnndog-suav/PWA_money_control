import { useState } from 'react'
import { isTagInUse, type TagUsage } from '@/domain/tags'
import type { Tag } from '@/domain/types'
import { CHECK_TAG_USAGE_FAILED_MESSAGE, DELETE_TAG_FAILED_MESSAGE } from '@/features/tags/tagTexts'
import { deleteTag, getTagUsage } from '@/repositories/tagsRepository'

/** Qual modal da tela de tags está aberto (§6.6: modais, não rotas). */
export type TagsDialog =
  | { kind: 'closed' }
  | { kind: 'create' }
  | { kind: 'edit'; tag: Tag }
  | { kind: 'confirm-delete'; tag: Tag }
  | { kind: 'delete-blocked'; tag: Tag; usage: TagUsage }

/** Operação de exclusão em andamento: desabilita o botão que a disparou. */
export type PendingDeleteStep = 'checking-usage' | 'deleting' | null

const CLOSED: TagsDialog = { kind: 'closed' }

/** RF-03 — fluxo da tela: criar, editar e excluir (com bloqueio por uso — CA-03.2). */
export function useTagsScreen() {
  const [dialog, setDialog] = useState<TagsDialog>(CLOSED)
  const [pendingStep, setPendingStep] = useState<PendingDeleteStep>(null)
  // Falha do IndexedDB ao conferir o uso ou excluir; aparece no modal aberto.
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const show = (next: TagsDialog) => {
    setDeleteError(null)
    setDialog(next)
  }

  const close = () => show(CLOSED)
  const openCreate = () => show({ kind: 'create' })
  const openEdit = (tag: Tag) => show({ kind: 'edit', tag })

  // Confere o uso antes de pedir confirmação, para não perguntar algo que será bloqueado.
  const requestDelete = async (tag: Tag) => {
    setDeleteError(null)
    setPendingStep('checking-usage')
    try {
      const usage = await getTagUsage(tag.id)
      show(
        isTagInUse(usage)
          ? { kind: 'delete-blocked', tag, usage }
          : { kind: 'confirm-delete', tag },
      )
    } catch {
      setDeleteError(CHECK_TAG_USAGE_FAILED_MESSAGE)
    } finally {
      setPendingStep(null)
    }
  }

  // A exclusão confere o uso de novo, na mesma transação (D-02): algo pode ter passado a
  // usar a tag enquanto a confirmação estava aberta.
  const confirmDelete = async (tag: Tag) => {
    setDeleteError(null)
    setPendingStep('deleting')
    try {
      const result = await deleteTag(tag.id)
      show(
        result.status === 'deleted' ? CLOSED : { kind: 'delete-blocked', tag, usage: result.usage },
      )
    } catch {
      setDeleteError(DELETE_TAG_FAILED_MESSAGE)
    } finally {
      setPendingStep(null)
    }
  }

  return {
    dialog,
    pendingStep,
    deleteError,
    close,
    openCreate,
    openEdit,
    requestDelete,
    confirmDelete,
  }
}
