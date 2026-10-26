import { useState } from 'react'
import { Controller } from 'react-hook-form'
import { CreateTagDialog } from '@/components/tags/CreateTagDialog'
import { TagPicker } from '@/components/tags/TagPicker'
import { NoTagsNotice } from '@/components/transactions/NoTagsNotice'
import { Button } from '@/components/ui/Button'
import { createRadioGroup } from '@/components/ui/createRadioGroup'
import { ErrorAlert } from '@/components/ui/ErrorAlert'
import { Field } from '@/components/ui/Field'
import { Modal } from '@/components/ui/Modal'
import { MoneyInput } from '@/components/ui/MoneyInput'
import { MonthInput } from '@/components/ui/MonthInput'
import { TextInput } from '@/components/ui/TextInput'
import { useToday } from '@/components/ui/useToday'
import { periodOf } from '@/domain/dates'
import { recurringInputSchema, type RecurringInput } from '@/domain/recurringSchema'
import type { Recurring, TransactionType } from '@/domain/types'
import {
  NEW_RECURRING_LABEL,
  SAVE_RECURRING_FAILED_MESSAGE,
} from '@/features/recurrings/recurringsTexts'
import { useRecurringForm } from '@/features/recurrings/useRecurringForm'
import { createRecurring, RecurringTagNotFoundError } from '@/repositories/recurringsRepository'
import { RECURRING_TAG_NOT_FOUND_MESSAGE } from '@/components/recurrings/recurringTexts'
import { useTags } from '@/repositories/tagsRepository'

const TypeRadio = createRadioGroup<TransactionType>()

interface NewRecurringDialogProps {
  open: boolean
  onClose: () => void
  onCreated: (recurring: Recurring) => void
}

interface NewRecurringFormProps {
  onCancel: () => void
  onCreated: (recurring: Recurring) => void
}

function NewRecurringForm({ onCancel, onCreated }: NewRecurringFormProps) {
  // RF-07 — padrões: Saída e o mês atual como início, sem término.
  const defaultValues: RecurringInput = {
    type: 'expense',
    description: '',
    tagId: '',
    amountCents: 0,
    startPeriod: periodOf(useToday()),
    endPeriod: '',
  }
  const { form, submit, saveError, canSubmit } = useRecurringForm({
    schema: recurringInputSchema,
    defaultValues,
    save: async (values) => onCreated(await createRecurring(values)),
    toErrorMessage: (error) =>
      error instanceof RecurringTagNotFoundError
        ? RECURRING_TAG_NOT_FOUND_MESSAGE
        : SAVE_RECURRING_FAILED_MESSAGE,
  })
  const { control } = form
  const tags = useTags()
  const [isCreatingTag, setIsCreatingTag] = useState(false)

  return (
    <>
      <form onSubmit={submit} noValidate className="flex flex-col gap-4">
        <Controller
          control={control}
          name="type"
          render={({ field }) => (
            <TypeRadio.Root
              variant="segmented"
              legend="Tipo"
              value={field.value}
              onValueChange={field.onChange}
            >
              <TypeRadio.Option value="expense">Saída</TypeRadio.Option>
              <TypeRadio.Option value="income">Entrada</TypeRadio.Option>
            </TypeRadio.Root>
          )}
        />
        <Controller
          control={control}
          name="description"
          render={({ field, fieldState }) => (
            <Field error={fieldState.error?.message}>
              <Field.Label>Descrição</Field.Label>
              <TextInput autoComplete="off" enterKeyHint="next" {...field} />
              <Field.Error />
            </Field>
          )}
        />
        {tags && (
          <Controller
            control={control}
            name="tagId"
            render={({ field, fieldState }) => (
              <TagPicker
                {...field}
                tags={tags}
                error={fieldState.error?.message}
                emptyState={<NoTagsNotice onCreateTag={() => setIsCreatingTag(true)} />}
              />
            )}
          />
        )}
        <Controller
          control={control}
          name="amountCents"
          render={({ field, fieldState }) => (
            <Field error={fieldState.error?.message}>
              <Field.Label>Valor</Field.Label>
              <MoneyInput {...field} />
              <Field.Error />
            </Field>
          )}
        />
        <Controller
          control={control}
          name="startPeriod"
          render={({ field, fieldState }) => (
            <Field error={fieldState.error?.message}>
              <Field.Label>Mês de início</Field.Label>
              <MonthInput {...field} />
              <Field.Error />
            </Field>
          )}
        />
        <Controller
          control={control}
          name="endPeriod"
          render={({ field, fieldState }) => (
            <Field error={fieldState.error?.message} hint="Deixe vazio se não tiver término.">
              <Field.Label>Mês de término (opcional)</Field.Label>
              <MonthInput {...field} />
              <Field.Hint />
              <Field.Error />
            </Field>
          )}
        />

        {saveError && <ErrorAlert>{saveError}</ErrorAlert>}

        <Modal.Actions>
          <Button variant="secondary" onClick={onCancel}>
            Cancelar
          </Button>
          <Button variant="primary" type="submit" disabled={!canSubmit}>
            Criar
          </Button>
        </Modal.Actions>
      </form>
      <CreateTagDialog
        open={isCreatingTag}
        onCreated={(tag) => {
          setIsCreatingTag(false)
          form.setValue('tagId', tag.id, { shouldDirty: true, shouldValidate: true })
        }}
        onClose={() => setIsCreatingTag(false)}
      />
    </>
  )
}

/** RF-07 / CA-07.6 — "Novo recorrente": tipo, descrição, tag, valor, início e término. */
export function NewRecurringDialog({ open, onClose, onCreated }: NewRecurringDialogProps) {
  return (
    <Modal open={open} title={NEW_RECURRING_LABEL} onClose={onClose}>
      <NewRecurringForm onCancel={onClose} onCreated={onCreated} />
    </Modal>
  )
}
