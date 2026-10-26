import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import {
  ALREADY_CONFIRMED_MESSAGE,
  CONFIRM_FAILED_MESSAGE,
  NOT_PENDING_MESSAGE,
  RECURRING_TAG_NOT_FOUND_MESSAGE,
} from '@/components/recurrings/recurringTexts'
import { periodOf } from '@/domain/dates'
import type { PendingOccurrence } from '@/domain/recurring'
import {
  confirmOccurrenceSchema,
  type ConfirmOccurrenceInput,
  type ConfirmOccurrenceValues,
} from '@/domain/recurringSchema'
import type { DateString, Transaction } from '@/domain/types'
import { canSubmitForm, LIVE_VALIDATION } from '@/lib/formSubmit'
import {
  confirmOccurrence,
  OccurrenceAlreadyConfirmedError,
  OccurrenceNotPendingError,
  RecurringTagNotFoundError,
} from '@/repositories/recurringsRepository'

/**
 * RF-07 "Confirmar" — data padrão: hoje se a ocorrência é do mês atual; senão, o dia 1 do mês
 * da ocorrência.
 */
export function defaultOccurrenceDate(period: string, today: DateString): DateString {
  return periodOf(today) === period ? today : `${period}-01`
}

function confirmErrorMessage(error: unknown): string {
  if (error instanceof OccurrenceAlreadyConfirmedError) return ALREADY_CONFIRMED_MESSAGE
  if (error instanceof OccurrenceNotPendingError) return NOT_PENDING_MESSAGE
  if (error instanceof RecurringTagNotFoundError) return RECURRING_TAG_NOT_FOUND_MESSAGE
  return CONFIRM_FAILED_MESSAGE
}

/**
 * RF-07 / CA-07.2 — formulário de confirmação, preenchido com o valor vigente, a descrição e
 * a tag do recorrente. Princípio 16: abre válido, então "Confirmar" já começa ativo.
 */
export function useConfirmOccurrenceForm(
  occurrence: PendingOccurrence,
  today: DateString,
  onConfirmed: (transaction: Transaction) => void,
) {
  const { recurring, period, amountCents } = occurrence
  const schema = confirmOccurrenceSchema(period)
  const defaultValues: ConfirmOccurrenceInput = {
    amountCents,
    date: defaultOccurrenceDate(period, today),
    tagId: recurring.tagId,
    description: recurring.description,
  }
  const form = useForm<ConfirmOccurrenceInput, unknown, ConfirmOccurrenceValues>({
    ...LIVE_VALIDATION,
    resolver: zodResolver(schema),
    defaultValues,
  })
  const startsValid = schema.safeParse(defaultValues).success
  const [saveError, setSaveError] = useState<string | null>(null)

  const submit = form.handleSubmit(async (values) => {
    setSaveError(null)
    try {
      onConfirmed(await confirmOccurrence(recurring.id, period, values))
    } catch (error) {
      setSaveError(confirmErrorMessage(error))
    }
  })

  return {
    form,
    submit,
    saveError,
    isCurrentMonth: periodOf(today) === period,
    canSubmit: canSubmitForm(form.formState, { startsValid }),
  }
}
