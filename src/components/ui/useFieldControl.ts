import { createContext, use } from 'react'

export interface FieldContextValue {
  controlId: string
  errorId: string
  error: string | undefined
  /** Linha de ajuda sempre visível (ex.: "Escolha um dia de novembro de 2026."), ou `undefined`. */
  hint: string | undefined
  hintId: string
}

/** Ligação entre as partes de um `<Field>` (rótulo, controle e erro). */
export const FieldContext = createContext<FieldContextValue | null>(null)

/** Atributos que ligam o controle ao rótulo e ao erro (RNF-06). */
export interface FieldControlProps {
  id: string
  'aria-invalid': true | undefined
  'aria-describedby': string | undefined
}

export function useFieldContext(part: string): FieldContextValue {
  const field = use(FieldContext)
  if (!field) throw new Error(`<${part}> precisa estar dentro de <Field>.`)
  return field
}

/** Para controles dentro de `<Field>`: `id`, `aria-invalid` e `aria-describedby` (ajuda e erro). */
export function useFieldControl(): FieldControlProps {
  const { controlId, errorId, error, hint, hintId } = useFieldContext('Field.Control')
  const describedBy = [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(' ')
  return {
    id: controlId,
    'aria-invalid': error ? true : undefined,
    'aria-describedby': describedBy || undefined,
  }
}
