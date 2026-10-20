import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import {
  SAVE_TRANSACTION_FAILED_MESSAGE,
  TRANSACTION_NOT_FOUND_MESSAGE,
  TRANSACTION_SAVED_MESSAGE,
  TRANSACTION_TAG_NOT_FOUND_MESSAGE,
} from '@/components/transactions/transactionTexts'
import { useToast } from '@/components/ui/useToast'
import { useToday } from '@/components/ui/useToday'
import {
  transactionInputSchema,
  type TransactionInput,
  type TransactionValues,
} from '@/domain/transactionSchema'
import type { DateString, Transaction } from '@/domain/types'
import { canSubmitForm, LIVE_VALIDATION } from '@/lib/formSubmit'
import {
  createTransaction,
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
  if (error instanceof TransactionTagNotFoundError) return TRANSACTION_TAG_NOT_FOUND_MESSAGE
  if (error instanceof TransactionNotFoundError) return TRANSACTION_NOT_FOUND_MESSAGE
  return SAVE_TRANSACTION_FAILED_MESSAGE
}

/** RF-01 / princípio 16 — formulário de criar/editar lançamento (React Hook Form + Zod). */
export function useTransactionForm({ transaction, onUpdated }: UseTransactionFormOptions = {}) {
  const todayDate = useToday()
  const defaultValues = transaction ? toFormValues(transaction) : emptyValues('expense', todayDate)
  const form = useForm<TransactionInput, unknown, TransactionValues>({
    ...LIVE_VALIDATION,
    resolver: zodResolver(transactionInputSchema),
    defaultValues,
  })
  // Edição abre com dados válidos: o "Salvar" já começa ativo (princípio 16).
  const startsValid = transactionInputSchema.safeParse(defaultValues).success
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
    canSubmit: canSubmitForm(form.formState, { startsValid }),
  }
}
