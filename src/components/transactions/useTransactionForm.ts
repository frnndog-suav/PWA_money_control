import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { dateOutsidePeriodMessage } from '@/domain/recurringSchema'
import {
  SAVE_TRANSACTION_FAILED_MESSAGE,
  TRANSACTION_NOT_FOUND_MESSAGE,
  TRANSACTION_SAVED_MESSAGE,
  TRANSACTION_TAG_NOT_FOUND_MESSAGE,
  TYPE_LOCKED_MESSAGE,
} from '@/components/transactions/transactionTexts'
import { useToast } from '@/components/ui/useToast'
import { useToday } from '@/components/ui/useToday'
import {
  transactionInputSchema,
  type TransactionInput,
  type TransactionValues,
} from '@/domain/transactionSchema'
import { isDateInPeriod } from '@/domain/dates'
import type { DateString, PeriodString, Transaction } from '@/domain/types'
import { canSubmitForm, LIVE_VALIDATION } from '@/lib/formSubmit'
import {
  createTransaction,
  OccurrenceDateOutsidePeriodError,
  OccurrenceTypeChangeError,
  TransactionNotFoundError,
  TransactionTagNotFoundError,
  updateTransaction,
} from '@/repositories/transactionsRepository'

interface UseTransactionFormOptions {
  /** Lançamento em edição; ausente ao criar. */
  transaction?: Transaction
  /** Chamado depois de gravar a edição (ex.: voltar para a tela anterior). */
  onUpdated?: (transaction: Transaction) => void
}

// RF-01 — padrões do lançamento novo: Saída e a data de hoje (CA-02.2).
function emptyValues(type: TransactionInput['type'], date: DateString): TransactionInput {
  return { type, amountCents: 0, date, tagId: '', description: '' }
}

function toFormValues(transaction: Transaction): TransactionInput {
  const { type, amountCents, date, tagId, description } = transaction
  return { type, amountCents, date, tagId, description }
}

function saveErrorMessage(error: unknown): string {
  if (error instanceof OccurrenceTypeChangeError) return TYPE_LOCKED_MESSAGE
  if (error instanceof OccurrenceDateOutsidePeriodError) {
    return dateOutsidePeriodMessage(error.period)
  }
  if (error instanceof TransactionTagNotFoundError) return TRANSACTION_TAG_NOT_FOUND_MESSAGE
  if (error instanceof TransactionNotFoundError) return TRANSACTION_NOT_FOUND_MESSAGE
  return SAVE_TRANSACTION_FAILED_MESSAGE
}

/**
 * D-51 — o lançamento confirmado de um recorrente continua no mês da ocorrência: a data é
 * validada como no formulário de confirmação (CA-07.8).
 */
function schemaFor(occurrencePeriod: PeriodString | null) {
  if (occurrencePeriod === null) return transactionInputSchema
  return transactionInputSchema.refine((input) => isDateInPeriod(input.date, occurrencePeriod), {
    message: dateOutsidePeriodMessage(occurrencePeriod),
    path: ['date'],
  })
}

/** RF-01 / princípio 16 — formulário de criar/editar lançamento (React Hook Form + Zod). */
export function useTransactionForm({ transaction, onUpdated }: UseTransactionFormOptions = {}) {
  const todayDate = useToday()
  const defaultValues = transaction ? toFormValues(transaction) : emptyValues('expense', todayDate)
  const occurrencePeriod = transaction?.recurringPeriod ?? null
  const schema = schemaFor(occurrencePeriod)
  const form = useForm<TransactionInput, unknown, TransactionValues>({
    ...LIVE_VALIDATION,
    resolver: zodResolver(schema),
    defaultValues,
  })
  // Edição abre com dados válidos: o "Salvar" já começa ativo (princípio 16).
  const startsValid = schema.safeParse(defaultValues).success
  // Falha ao gravar não é erro de campo: fica fora do `setError` para o botão continuar
  // ativo e o usuário poder tentar de novo (D-36).
  const [saveError, setSaveError] = useState<string | null>(null)
  const toast = useToast()

  // CA-02.2 — o app aberto de um dia para o outro: se a data ainda é a preenchida
  // automaticamente (o usuário não a trocou), ela passa para o novo "hoje".
  const autoFilledDate = useRef(todayDate)
  useEffect(() => {
    if (transaction || autoFilledDate.current === todayDate) return
    if (form.getValues('date') === autoFilledDate.current) {
      form.setValue('date', todayDate, { shouldValidate: true })
    }
    autoFilledDate.current = todayDate
  }, [form, transaction, todayDate])

  const submit = form.handleSubmit(async (values) => {
    setSaveError(null)
    try {
      if (transaction) {
        onUpdated?.(await updateTransaction(transaction.id, values))
        return
      }
      await createTransaction(values)
      // CA-01.1 — limpa o formulário mantendo tipo e data, para lançar o próximo.
      form.reset(emptyValues(values.type, values.date))
      toast.show(TRANSACTION_SAVED_MESSAGE)
    } catch (error) {
      setSaveError(saveErrorMessage(error))
    }
  })

  return {
    form,
    submit,
    saveError,
    savedMessage: toast.message,
    isEditing: transaction !== undefined,
    /** Mês da ocorrência, quando o lançamento veio de um recorrente (D-51). */
    occurrencePeriod,
    /** D-51 — o lançamento de um recorrente mantém o tipo do recorrente. */
    isTypeLocked: transaction?.recurringId != null,
    canSubmit: canSubmitForm(form.formState, { startsValid }),
  }
}
