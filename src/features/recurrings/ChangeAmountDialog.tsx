import { Controller } from 'react-hook-form'
import { Button } from '@/components/ui/Button'
import { ErrorAlert } from '@/components/ui/ErrorAlert'
import { Field } from '@/components/ui/Field'
import { Modal } from '@/components/ui/Modal'
import { MoneyInput } from '@/components/ui/MoneyInput'
import { MonthInput } from '@/components/ui/MonthInput'
import { AmountAfterEndError, AmountBeforeStartError } from '@/domain/recurring'
import { amountChangeSchema } from '@/domain/recurringSchema'
import type { PeriodString, Recurring } from '@/domain/types'
import {
  fromAfterEndMessage,
  fromBeforeStartMessage,
  SAVE_RECURRING_FAILED_MESSAGE,
} from '@/features/recurrings/recurringsTexts'
import { useRecurringForm } from '@/features/recurrings/useRecurringForm'
import { changeRecurringAmount } from '@/repositories/recurringsRepository'

interface ChangeAmountDialogProps {
  open: boolean
  recurring: Recurring
  currentPeriod: PeriodString
  onClose: () => void
  onSaved: () => void
}

/** O mês do novo valor precisa estar entre o início e o término (§6.5 `setAmountFrom`). */
function amountChangeSchemaFor(recurring: Recurring) {
  const { startPeriod, endPeriod } = recurring
  const afterStart = amountChangeSchema.refine((input) => input.fromPeriod >= startPeriod, {
    message: fromBeforeStartMessage(startPeriod),
    path: ['fromPeriod'],
  })
  // Sem término, não há limite depois do início.
  if (endPeriod === null) return afterStart
  return afterStart.refine((input) => input.fromPeriod <= endPeriod, {
    message: fromAfterEndMessage(endPeriod),
    path: ['fromPeriod'],
  })
}

function ChangeAmountForm({
  recurring,
  currentPeriod,
  onClose,
  onSaved,
}: Omit<ChangeAmountDialogProps, 'open'>) {
  // RF-07 — padrão: o mês atual (ou o início, se o recorrente ainda não começou).
  const fromPeriod = currentPeriod < recurring.startPeriod ? recurring.startPeriod : currentPeriod
  const { form, submit, saveError, canSubmit } = useRecurringForm({
    schema: amountChangeSchemaFor(recurring),
    defaultValues: { amountCents: 0, fromPeriod },
    save: async (values) => {
      await changeRecurringAmount(recurring.id, values)
      onSaved()
    },
    // Outra aba pode ter encerrado o recorrente depois de o modal abrir.
    toErrorMessage: (error) => {
      if (error instanceof AmountBeforeStartError) return fromBeforeStartMessage(error.startPeriod)
      if (error instanceof AmountAfterEndError) return fromAfterEndMessage(error.endPeriod)
      return SAVE_RECURRING_FAILED_MESSAGE
    },
  })
  const { control } = form

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4">
      <p className="text-sm text-slate-600 dark:text-slate-300">
        O novo valor vale para o mês escolhido e os seguintes. Lançamentos já confirmados não mudam.
      </p>
      <Controller
        control={control}
        name="amountCents"
        render={({ field, fieldState }) => (
          <Field error={fieldState.error?.message}>
            <Field.Label>Novo valor</Field.Label>
            <MoneyInput {...field} />
            <Field.Error />
          </Field>
        )}
      />
      <Controller
        control={control}
        name="fromPeriod"
        render={({ field, fieldState }) => (
          <Field error={fieldState.error?.message}>
            <Field.Label>A partir de</Field.Label>
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
        <Button variant="primary" type="submit" disabled={!canSubmit}>
          Alterar valor
        </Button>
      </Modal.Actions>
    </form>
  )
}

/** RF-07 / CA-07.3 — "Alterar valor para o futuro". */
export function ChangeAmountDialog({ open, ...props }: ChangeAmountDialogProps) {
  return (
    <Modal open={open} title="Alterar valor" onClose={props.onClose}>
      <ChangeAmountForm {...props} />
    </Modal>
  )
}
