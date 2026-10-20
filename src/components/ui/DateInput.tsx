import type { Ref } from 'react'
import { useFieldControl } from '@/components/ui/useFieldControl'
import { TEXT_INPUT_CLASSES } from '@/components/ui/inputClasses'

interface DateInputProps {
  /** `YYYY-MM-DD`, ou `''` quando o usuário limpa o campo. */
  value: string
  onChange: (value: string) => void
  onBlur?: () => void
  name?: string
  ref?: Ref<HTMLInputElement>
}

/**
 * Data com o seletor nativo (`<input type="date">`). O valor do elemento já é `YYYY-MM-DD`
 * no calendário local, então passa direto, sem virar `Date` (princípio 2).
 */
export function DateInput({ value, onChange, onBlur, name, ref }: DateInputProps) {
  const fieldProps = useFieldControl()
  return (
    <input
      ref={ref}
      type="date"
      name={name}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      onBlur={onBlur}
      {...fieldProps}
      // O Safari do iOS centraliza a data e encolhe o campo vazio; alinhado como os outros.
      className={`${TEXT_INPUT_CLASSES} appearance-none text-left [&::-webkit-date-and-time-value]:text-left`}
    />
  )
}
