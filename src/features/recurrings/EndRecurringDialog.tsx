import { Controller } from 'react-hook-form'
import { Button } from '@/components/ui/Button'
import { ErrorAlert } from '@/components/ui/ErrorAlert'
import { Field } from '@/components/ui/Field'
import { Modal } from '@/components/ui/Modal'
import { MonthInput } from '@/components/ui/MonthInput'
import { EndBeforeConfirmedError, EndBeforeStartError } from '@/domain/recurring'
import { endRecurringSchema } from '@/domain/recurringSchema'
import type { PeriodString, Recurring } from '@/domain/types'
import {
  endBeforeConfirmedMessage,
  endBeforeStartMessage,
  SAVE_RECURRING_FAILED_MESSAGE,
} from '@/features/recurrings/recurringsTexts'
import { useRecurringForm } from '@/features/recurrings/useRecurringForm'
import { endRecurringAt } from '@/repositories/recurringsRepository'

interface EndRecurringDialogProps {
  open: boolean
  recurring: Recurring
  currentPeriod: PeriodString
  /** Último mês confirmado: o término não pode ser antes dele (D-51). */
  lastConfirmedPeriod: PeriodString | null
  onClose: () => void
  onSaved: () => void
}

function endSchemaFor(recurring: Recurring, lastConfirmed: PeriodString | null) {
  const afterStart = endRecurringSchema.refine(
    (input) => input.endPeriod >= recurring.startPeriod,
    { message: endBeforeStartMessage(recurring.startPeriod), path: ['endPeriod'] },
  )
  // Sem nenhum mês confirmado, só o início limita o término.
  if (lastConfirmed === null) return afterStart
  return afterStart.refine((input) => input.endPeriod >= lastConfirmed, {
    message: endBeforeConfirmedMessage(lastConfirmed),
    path: ['endPeriod'],
  })
}

/** RF-07 — padrão: o mês atual, sem ficar antes do início nem do último mês confirmado. */
function defaultEndPeriod(
  recurring: Recurring,
  currentPeriod: PeriodString,
  lastConfirmed: PeriodString | null,
): PeriodString {
  return [recurring.endPeriod ?? currentPeriod, recurring.startPeriod, lastConfirmed ?? ''].reduce(
    (latest, period) => (period > latest ? period : latest),
  )
}

function EndRecurringForm({
  recurring,
  currentPeriod,
  lastConfirmedPeriod,
  onClose,
  onSaved,
}: Omit<EndRecurringDialogProps, 'open'>) {
  const { form, submit, saveError, canSubmit } = useRecurringForm({
    schema: endSchemaFor(recurring, lastConfirmedPeriod),
    defaultValues: {
      endPeriod: defaultEndPeriod(recurring, currentPeriod, lastConfirmedPeriod),
    },
    save: async (values) => {
      await endRecurringAt(recurring.id, values)
      onSaved()
    },
    // Outra aba pode ter confirmado um mês depois de o modal abrir.
    toErrorMessage: (error) => {
      if (error instanceof EndBeforeConfirmedError) {
        return endBeforeConfirmedMessage(error.lastConfirmedPeriod)
      }
      if (error instanceof EndBeforeStartError) return endBeforeStartMessage(error.startPeriod)
      return SAVE_RECURRING_FAILED_MESSAGE
    },
  })

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4">
      <p className="text-sm text-slate-600 dark:text-slate-300">
        O recorrente vale até o mês escolhido (inclusive). Os meses seguintes deixam de aparecer; os
        lançamentos confirmados continuam.
      </p>
      <Controller
        control={form.control}
        name="endPeriod"
        render={({ field, fieldState }) => (
          <Field error={fieldState.error?.message}>
            <Field.Label>Último mês</Field.Label>
            <MonthInput {...field} />
            <Field.Error />
          </Field>
        )}
      />
      {saveError && <ErrorAlert>{saveError}</ErrorAlert>}
      <Modal.Actions>
        <Button variant="secondary" onClick={onClose}>
          Cancelar
        </Button>
        <Button variant="danger" type="submit" disabled={!canSubmit}>
          Encerrar
        </Button>
      </Modal.Actions>
    </form>
  )
}

/** RF-07 "Encerrar" — define o mês de término (D-51: não antes do último mês confirmado). */
export function EndRecurringDialog({ open, ...props }: EndRecurringDialogProps) {
  return (
    <Modal open={open} title="Encerrar recorrente" onClose={props.onClose}>
      <EndRecurringForm {...props} />
    </Modal>
  )
}
