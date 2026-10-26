import { Controller } from 'react-hook-form'
import { RECURRING_TAG_NOT_FOUND_MESSAGE } from '@/components/recurrings/recurringTexts'
import { TagPicker } from '@/components/tags/TagPicker'
import { Button } from '@/components/ui/Button'
import { ErrorAlert } from '@/components/ui/ErrorAlert'
import { Field } from '@/components/ui/Field'
import { Modal } from '@/components/ui/Modal'
import { TextInput } from '@/components/ui/TextInput'
import { recurringDetailsSchema } from '@/domain/recurringSchema'
import type { Recurring } from '@/domain/types'
import { SAVE_RECURRING_FAILED_MESSAGE } from '@/features/recurrings/recurringsTexts'
import { useRecurringForm } from '@/features/recurrings/useRecurringForm'
import {
  RecurringTagNotFoundError,
  updateRecurringDetails,
} from '@/repositories/recurringsRepository'
import { useTags } from '@/repositories/tagsRepository'

interface EditRecurringDialogProps {
  open: boolean
  recurring: Recurring
  onClose: () => void
  onSaved: () => void
}

function EditRecurringForm({
  recurring,
  onClose,
  onSaved,
}: Omit<EditRecurringDialogProps, 'open'>) {
  const { form, submit, saveError, canSubmit } = useRecurringForm({
    schema: recurringDetailsSchema,
    defaultValues: { description: recurring.description, tagId: recurring.tagId },
    save: async (values) => {
      await updateRecurringDetails(recurring.id, values)
      onSaved()
    },
    toErrorMessage: (error) =>
      error instanceof RecurringTagNotFoundError
        ? RECURRING_TAG_NOT_FOUND_MESSAGE
        : SAVE_RECURRING_FAILED_MESSAGE,
  })
  const { control } = form
  const tags = useTags()

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4">
      <p className="text-sm text-slate-600 dark:text-slate-300">
        Vale para os meses pendentes e os próximos; lançamentos já confirmados não mudam.
      </p>
      <Controller
        control={control}
        name="description"
        render={({ field, fieldState }) => (
          <Field error={fieldState.error?.message}>
            <Field.Label>Descrição</Field.Label>
            <TextInput autoComplete="off" enterKeyHint="done" {...field} />
            <Field.Error />
          </Field>
        )}
      />
      {tags && (
        <Controller
          control={control}
          name="tagId"
          render={({ field, fieldState }) => (
            // O recorrente já usa uma tag (D-02), então a lista nunca fica vazia aqui.
            <TagPicker {...field} tags={tags} error={fieldState.error?.message} emptyState={null} />
          )}
        />
      )}
      {saveError && <ErrorAlert>{saveError}</ErrorAlert>}
      <Modal.Actions>
        <Button variant="secondary" onClick={onClose}>
          Cancelar
        </Button>
        <Button variant="primary" type="submit" disabled={!canSubmit}>
          Salvar
        </Button>
      </Modal.Actions>
    </form>
  )
}

/** D-51 — editar muda só descrição e tag (tipo e início ficam fixos). */
export function EditRecurringDialog({ open, ...props }: EditRecurringDialogProps) {
  return (
    <Modal open={open} title="Editar recorrente" onClose={props.onClose}>
      <EditRecurringForm {...props} />
    </Modal>
  )
}
