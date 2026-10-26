import { createContext, use, useId, type ReactNode } from 'react'

/** `list`: opções empilhadas (ex.: tema); `segmented`: alternador lado a lado (ex.: Saída/Entrada). */
export type RadioGroupVariant = 'list' | 'segmented'

interface RadioGroupContextValue<T extends string> {
  name: string
  value: T
  onValueChange: (value: T) => void
  variant: RadioGroupVariant
}

export interface RadioGroupRootProps<T extends string> {
  legend: ReactNode
  value: T
  onValueChange: (value: T) => void
  variant?: RadioGroupVariant
  /** Grupo só para leitura (ex.: tipo do lançamento vindo de um recorrente — D-51). */
  disabled?: boolean
  children: ReactNode
}

export interface RadioGroupOptionProps<T extends string> {
  value: T
  children: ReactNode
}

const VARIANT_CLASSES: Record<
  RadioGroupVariant,
  { fieldset: string; legend: string; options: string; option: string; radio: string }
> = {
  list: {
    fieldset: 'flex flex-col gap-2',
    legend: 'mb-2 text-lg font-semibold',
    options: 'contents',
    option:
      'flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border border-slate-200 px-3 py-2 has-checked:border-blue-600 has-checked:font-semibold dark:border-slate-700 dark:has-checked:border-blue-400',
    radio: 'size-5 accent-blue-600 dark:accent-blue-400',
  },
  // A opção marcada fica preenchida e em negrito (não só pela cor — RNF-06); o foco do
  // teclado aparece no rótulo, porque o rádio fica oculto.
  segmented: {
    fieldset: 'flex flex-col gap-1',
    legend: 'mb-1 font-semibold',
    options:
      'flex rounded-lg border border-slate-300 p-1 dark:border-slate-600 has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-blue-600 dark:has-focus-visible:outline-blue-400',
    option:
      'flex min-h-11 flex-1 cursor-pointer items-center justify-center rounded-md px-3 text-slate-700 has-checked:bg-blue-700 has-checked:font-semibold has-checked:text-white dark:text-slate-200 dark:has-checked:bg-blue-600',
    radio: 'sr-only',
  },
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

  function Root({
    legend,
    value,
    onValueChange,
    variant = 'list',
    disabled = false,
    children,
  }: RadioGroupRootProps<T>) {
    const name = useId()
    const classes = VARIANT_CLASSES[variant]
    return (
      <fieldset disabled={disabled} className={`${classes.fieldset} disabled:opacity-60`}>
        <legend className={classes.legend}>{legend}</legend>
        <div className={classes.options}>
          <RadioGroupContext value={{ name, value, onValueChange, variant }}>
            {children}
          </RadioGroupContext>
        </div>
      </fieldset>
    )
  }

  function Option({ value, children }: RadioGroupOptionProps<T>) {
    const group = use(RadioGroupContext)
    if (!group) throw new Error('<Option> precisa estar dentro do <Root> do mesmo grupo.')
    const classes = VARIANT_CLASSES[group.variant]

    return (
      <label className={classes.option}>
        <input
          type="radio"
          name={group.name}
          value={value}
          checked={group.value === value}
          onChange={() => group.onValueChange(value)}
          className={classes.radio}
        />
        <span>{children}</span>
      </label>
    )
  }

  return { Root, Option }
}
