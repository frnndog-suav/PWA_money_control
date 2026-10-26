import { Controller } from 'react-hook-form'
import { TagPicker } from '@/components/tags/TagPicker'
import {
  CONFIRM_LABEL,
  DATE_INFO_LABEL,
  dateHintText,
  dateInfoText,
} from '@/components/recurrings/recurringTexts'
import { useConfirmOccurrenceForm } from '@/components/recurrings/useConfirmOccurrenceForm'
import { Button } from '@/components/ui/Button'
import { DateInput } from '@/components/ui/DateInput'
import { ErrorAlert } from '@/components/ui/ErrorAlert'
import { Field } from '@/components/ui/Field'
import { InfoPopover } from '@/components/ui/InfoPopover'
import { Modal } from '@/components/ui/Modal'
import { MoneyInput } from '@/components/ui/MoneyInput'
import { TextInput } from '@/components/ui/TextInput'
import { useToday } from '@/components/ui/useToday'
import { formatMonthLabel } from '@/domain/dates'
import type { PendingOccurrence } from '@/domain/recurring'
import type { Transaction } from '@/domain/types'
import { useTags } from '@/repositories/tagsRepository'

interface ConfirmOccurrenceDialogProps {
  /** Ocorrência sendo confirmada; `null` fecha o modal. */
  occurrence: PendingOccurrence | null
  onClose: () => void
  onConfirmed: (transaction: Transaction) => void
}

const TYPE_LABELS = { income: 'Entrada', expense: 'Saída' } as const

interface ConfirmOccurrenceFormProps {
  occurrence: PendingOccurrence
  onCancel: () => void
  onConfirmed: (transaction: Transaction) => void
}

function ConfirmOccurrenceForm({ occurrence, onCancel, onConfirmed }: ConfirmOccurrenceFormProps) {
  const today = useToday()
  const { form, submit, saveError, isCurrentMonth, canSubmit } = useConfirmOccurrenceForm(
    occurrence,
    today,
    onConfirmed,
  )
  const { control } = form
  const tags = useTags()
  const { period, recurring } = occurrence

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4">
      <p className="text-sm text-slate-600 dark:text-slate-300 first-letter:uppercase">
        {TYPE_LABELS[recurring.type]} · {formatMonthLabel(period)}
      </p>

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

      {/* CA-07.8 — "ⓘ" ao lado da data, linha de ajuda sempre visível e erro fora do mês. */}
      <Controller
        control={control}
        name="date"
        render={({ field, fieldState }) => (
          <Field error={fieldState.error?.message} hint={dateHintText(period)}>
            <div className="flex items-center gap-1">
              <Field.Label>Data</Field.Label>
              <InfoPopover label={DATE_INFO_LABEL}>
                {dateInfoText(period, isCurrentMonth)}
              </InfoPopover>
            </div>
            <DateInput {...field} />
            <Field.Hint />
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
              // Recorrente sempre tem tag (D-02): a lista de tags nunca fica vazia aqui.
              emptyState={null}
            />
          )}
        />
      )}

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

      {saveError && <ErrorAlert>{saveError}</ErrorAlert>}

      <Modal.Actions>
        <Button variant="secondary" onClick={onCancel}>
          Cancelar
        </Button>
        <Button variant="primary" type="submit" disabled={!canSubmit}>
          {CONFIRM_LABEL}
        </Button>
      </Modal.Actions>
    </form>
  )
}

/**
 * RF-07 "Confirmar" — modal que transforma a ocorrência pendente num lançamento (CA-07.2). O
 * usuário pode mudar valor, data, descrição e tag só para esta ocorrência; a data fica no mês
 * dela (CA-07.8).
 */
export function ConfirmOccurrenceDialog({
  occurrence,
  onClose,
  onConfirmed,
}: ConfirmOccurrenceDialogProps) {
  return (
    <Modal
      open={occurrence !== null}
      title={occurrence ? `Confirmar “${occurrence.recurring.description}”` : CONFIRM_LABEL}
      onClose={onClose}
    >
      {occurrence && (
        <ConfirmOccurrenceForm
          key={`${occurrence.recurring.id}|${occurrence.period}`}
          occurrence={occurrence}
          onCancel={onClose}
          onConfirmed={onConfirmed}
        />
      )}
    </Modal>
  )
}
