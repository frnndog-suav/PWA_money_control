import { useLayoutEffect, useRef, type Ref, type SyntheticEvent } from 'react'
import { useFieldControl } from '@/components/ui/useFieldControl'
import { TEXT_INPUT_CLASSES } from '@/components/ui/inputClasses'
import { digitsToCents, formatBRL } from '@/domain/money'
import type { Cents } from '@/domain/types'

interface MoneyInputProps {
  /** Valor em centavos inteiros (princípio 1); `0` deixa o campo vazio. */
  value: Cents
  onChange: (cents: Cents) => void
  onBlur?: () => void
  name?: string
  ref?: Ref<HTMLInputElement>
}

const NON_DIGITS = /\D/g
// "R$ 0,01" tem dígitos "001": os zeros à esquerda não contam no limite de 10 dígitos.
const LEADING_ZEROS = /^0+/

function textToCents(text: string): Cents {
  return digitsToCents(text.replace(NON_DIGITS, '').replace(LEADING_ZEROS, ''))
}

function moveCaretToEnd(input: HTMLInputElement): void {
  const end = input.value.length
  input.setSelectionRange(end, end)
}

/**
 * CA-01.3 / CA-01.4 / D-31 — valor com máscara de app de banco: os dígitos entram pela
 * direita (1, 9, 9, 9 → "R$ 19,99" e 1999), apagar tira o último dígito, colar aproveita só
 * os dígitos e o 11º dígito é ignorado. O valor sai sempre do texto inteiro do campo, então
 * qualquer edição (inclusive colar ou selecionar tudo e digitar) dá um resultado coerente.
 */
export function MoneyInput({ value, onChange, onBlur, name, ref }: MoneyInputProps) {
  const fieldProps = useFieldControl()
  const inputRef = useRef<HTMLInputElement>(null)
  const text = value === 0 ? '' : formatBRL(value)

  // O cursor fica sempre no fim, onde os dígitos entram (no iOS o toque o põe onde tocou).
  useLayoutEffect(() => {
    const input = inputRef.current
    if (input && document.activeElement === input) moveCaretToEnd(input)
  }, [text])

  const keepCaretAtEnd = (event: SyntheticEvent<HTMLInputElement>) => {
    const input = event.currentTarget
    // Uma seleção de verdade (ex.: selecionar tudo para substituir) é respeitada.
    if (input.selectionStart !== input.selectionEnd) return
    if (input.selectionStart !== input.value.length) moveCaretToEnd(input)
  }

  return (
    <input
      ref={(element) => {
        inputRef.current = element
        if (typeof ref === 'function') ref(element)
        else if (ref) ref.current = element
      }}
      type="text"
      inputMode="numeric"
      autoComplete="off"
      enterKeyHint="next"
      placeholder={formatBRL(0)}
      name={name}
      value={text}
      onChange={(event) => onChange(textToCents(event.target.value))}
      onSelect={keepCaretAtEnd}
      onBlur={onBlur}
      {...fieldProps}
      className={`${TEXT_INPUT_CLASSES} text-right tabular-nums`}
    />
  )
}
