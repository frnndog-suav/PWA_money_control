import { BackLink } from '@/components/ui/BackLink'
import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/EmptyState'
import { Page } from '@/components/ui/Page'
import { ConfirmDeleteTagDialog } from '@/features/tags/ConfirmDeleteTagDialog'
import { DeleteTagBlockedDialog } from '@/features/tags/DeleteTagBlockedDialog'
import { TagFormDialog } from '@/features/tags/TagFormDialog'
import { TagList } from '@/features/tags/TagList'
import { useTagsScreen } from '@/features/tags/useTagsScreen'
import { useTagsWithTransactionCount } from '@/repositories/tagsRepository'

// RF-03 — Ajustes → Tags.
export function TagsPage() {
  const items = useTagsWithTransactionCount()
  const {
    dialog,
    pendingStep,
    deleteError,
    close,
    openCreate,
    openEdit,
    requestDelete,
    confirmDelete,
  } = useTagsScreen()

  return (
    <Page>
      <Page.Header leading={<BackLink fallbackTo="/ajustes" />}>Tags</Page.Header>
      <Page.Body>
        <Button variant="primary" onClick={openCreate}>
          Nova tag
        </Button>
        {/* Sem nada enquanto carrega, para o estado vazio não piscar. */}
        {items?.length === 0 && (
          <EmptyState>
            Nenhuma tag ainda. Crie a primeira para classificar seus lançamentos.
          </EmptyState>
        )}
        {items && items.length > 0 && <TagList items={items} onSelect={openEdit} />}
      </Page.Body>

      <TagFormDialog
        open={dialog.kind === 'create' || dialog.kind === 'edit'}
        tag={dialog.kind === 'edit' ? dialog.tag : undefined}
        onClose={close}
        onDelete={requestDelete}
        isCheckingUsage={pendingStep === 'checking-usage'}
        deleteError={deleteError}
      />
      <ConfirmDeleteTagDialog
        tag={dialog.kind === 'confirm-delete' ? dialog.tag : null}
        onConfirm={confirmDelete}
        onCancel={close}
        isDeleting={pendingStep === 'deleting'}
        errorMessage={deleteError}
      />
      <DeleteTagBlockedDialog
        blocked={dialog.kind === 'delete-blocked' ? dialog : null}
        onClose={close}
      />
    </Page>
  )
}
