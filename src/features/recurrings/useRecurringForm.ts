import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm, type DefaultValues, type FieldValues } from 'react-hook-form'
import type { z } from 'zod'
import { canSubmitForm, LIVE_VALIDATION } from '@/lib/formSubmit'

interface UseRecurringFormOptions<TInput extends FieldValues, TOutput> {
  schema: z.ZodType<TOutput, TInput>
  defaultValues: TInput
  /** Grava; um erro lançado vira a mensagem de `toErrorMessage`. */
  save: (values: TOutput) => Promise<void>
  toErrorMessage: (error: unknown) => string
}

/**
 * RF-07 / princípio 16 — padrão dos formulários de recorrentes (React Hook Form + Zod): erro
 * do campo enquanto digita, botão ativo só com o formulário válido e fora do envio, e falha ao
 * gravar fora do `setError` para o usuário poder tentar de novo (D-36).
 */
export function useRecurringForm<TInput extends FieldValues, TOutput>({
  schema,
  defaultValues,
  save,
  toErrorMessage,
}: UseRecurringFormOptions<TInput, TOutput>) {
  const form = useForm<TInput, unknown, TOutput>({
    ...LIVE_VALIDATION,
    resolver: zodResolver(schema),
    defaultValues: defaultValues as DefaultValues<TInput>,
  })
  const startsValid = schema.safeParse(defaultValues).success
  const [saveError, setSaveError] = useState<string | null>(null)

  const submit = form.handleSubmit(async (values) => {
    setSaveError(null)
    try {
      await save(values)
    } catch (error) {
      setSaveError(toErrorMessage(error))
    }
  })

  return { form, submit, saveError, canSubmit: canSubmitForm(form.formState, { startsValid }) }
}
