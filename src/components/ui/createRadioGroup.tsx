import { createContext, use, useId, type ReactNode } from 'react'

interface RadioGroupContextValue<T extends string> {
  name: string
  value: T
  onValueChange: (value: T) => void
}

export interface RadioGroupRootProps<T extends string> {
  legend: ReactNode
  value: T
  onValueChange: (value: T) => void
  children: ReactNode
}

export interface RadioGroupOptionProps<T extends string> {
  value: T
  children: ReactNode
}

/**
 * Cria um grupo de opções exclusivas tipado pelo conjunto de valores `T`.
 * Cada fábrica tem seu próprio contexto, então `Option` só aceita valores de `T`
 * e `onValueChange` recebe `T` sem cast.
 *
 * Uso: `const ThemeRadio = createRadioGroup<ThemePreference>()` no nível do módulo.
 */
export function createRadioGroup<T extends string>() {
  const RadioGroupContext = createContext<RadioGroupContextValue<T> | null>(null)

  function Root({ legend, value, onValueChange, children }: RadioGroupRootProps<T>) {
    const name = useId()
    return (
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-lg font-semibold">{legend}</legend>
        <RadioGroupContext value={{ name, value, onValueChange }}>{children}</RadioGroupContext>
      </fieldset>
    )
  }

  function Option({ value, children }: RadioGroupOptionProps<T>) {
    const group = use(RadioGroupContext)
    if (!group) throw new Error('<Option> precisa estar dentro do <Root> do mesmo grupo.')

    return (
      <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border border-slate-200 px-3 py-2 has-checked:border-blue-600 has-checked:font-semibold dark:border-slate-700 dark:has-checked:border-blue-400">
        <input
          type="radio"
          name={group.name}
          value={value}
          checked={group.value === value}
          onChange={() => group.onValueChange(value)}
          className="size-5 accent-blue-600 dark:accent-blue-400"
        />
        <span>{children}</span>
      </label>
    )
  }

  return { Root, Option }
}
