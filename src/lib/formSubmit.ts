import type { FieldValues, FormState, UseFormProps } from 'react-hook-form'

// Princípio 16 / D-36 — padrão de todos os formulários do app (React Hook Form):
//   useForm({ ...LIVE_VALIDATION, resolver }) e
//   <Button type="submit" disabled={!canSubmitForm(formState, { startsValid })}>.
// Erros que não são de campo (ex.: falha ao gravar) ficam fora de `setError`, porque o
// `setError` força `isValid = false` e desabilitaria o botão sem o usuário poder tentar de novo.

/** Valida a cada alteração: o erro de um campo aparece enquanto o usuário digita. */
export const LIVE_VALIDATION = { mode: 'onChange' } as const satisfies UseFormProps

type SubmitState = Pick<FormState<FieldValues>, 'isValid' | 'isSubmitting' | 'isDirty' | 'errors'>

interface CanSubmitOptions {
  /** Os valores iniciais já são válidos (ex.: edição de um registro salvo). */
  startsValid?: boolean
}

/** O botão de envio só fica ativo com o formulário válido e fora do envio. */
export function canSubmitForm(
  { isValid, isSubmitting, isDirty, errors }: SubmitState,
  { startsValid = false }: CanSubmitOptions = {},
): boolean {
  if (isSubmitting) return false
  // O RHF só calcula `isValid` depois da 1ª renderização (começa `false`); sem isto o
  // "Salvar" da edição piscaria desabilitado ao abrir.
  const isUntouchedAndValid = startsValid && !isDirty && Object.keys(errors).length === 0
  return isValid || isUntouchedAndValid
}
