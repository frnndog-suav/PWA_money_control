import { useId, type ReactNode } from 'react'
import { FieldContext, useFieldContext } from '@/components/ui/useFieldControl'

interface FieldProps {
  /** Mensagem de erro do campo; ausente quando o campo está válido. */
  error?: string
  children: ReactNode
}

interface FieldPartProps {
  children: ReactNode
}

function FieldLabel({ children }: FieldPartProps) {
  const { controlId } = useFieldContext('Field.Label')
  return (
    <label htmlFor={controlId} className="font-semibold">
      {children}
    </label>
  )
}

function FieldError() {
  const { errorId, error } = useFieldContext('Field.Error')
  if (!error) return null
  return (
    <p id={errorId} className="text-sm text-red-700 dark:text-red-300">
      {error}
    </p>
  )
}

/**
 * Campo de formulário composto: `<Field error>` com `<Field.Label>`, o controle (que usa
 * `useFieldControl`) e `<Field.Error>`. O erro aparece abaixo do campo (CA-01.2) e é
 * anunciado junto com ele pelo `aria-describedby`.
 */
export function Field({ error, children }: FieldProps) {
  const controlId = useId()
  const errorId = useId()
  return (
    <div className="flex flex-col gap-1">
      <FieldContext value={{ controlId, errorId, error }}>{children}</FieldContext>
    </div>
  )
}

Field.Label = FieldLabel
Field.Error = FieldError
