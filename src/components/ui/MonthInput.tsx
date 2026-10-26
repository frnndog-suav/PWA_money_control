import type { Ref } from 'react'
import { useFieldControl } from '@/components/ui/useFieldControl'
import { TEXT_INPUT_CLASSES } from '@/components/ui/inputClasses'

interface MonthInputProps {
  /** `YYYY-MM`, ou `''` quando vazio. */
  value: string
  onChange: (value: string) => void
  onBlur?: () => void
  name?: string
  ref?: Ref<HTMLInputElement>
}

/**
 * Mês com o seletor nativo (`<input type="month">`, roda de mês/ano no iPhone). O valor do
 * elemento já é `YYYY-MM`, então passa direto, sem virar `Date` (princípio 2).
 */
export function MonthInput({ value, onChange, onBlur, name, ref }: MonthInputProps) {
  const fieldProps = useFieldControl()
  return (
    <input
      ref={ref}
      type="month"
      name={name}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      onBlur={onBlur}
      {...fieldProps}
      // Mesmo ajuste do DateInput para o Safari do iOS não centralizar nem encolher o campo.
      className={`${TEXT_INPUT_CLASSES} appearance-none text-left [&::-webkit-date-and-time-value]:text-left`}
    />
  )
}
