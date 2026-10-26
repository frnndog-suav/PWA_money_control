import type { ReactNode, Ref } from 'react'

interface CheckboxProps {
  checked: boolean
  onChange: (checked: boolean) => void
  onBlur?: () => void
  name?: string
  ref?: Ref<HTMLInputElement>
  children: ReactNode
}

/**
 * Caixa de seleção com o rótulo inteiro tocável (alvo ≥ 44 px — RNF-06). Marcada, o rótulo
 * fica em negrito e com borda, não só pela cor.
 */
export function Checkbox({ checked, onChange, onBlur, name, ref, children }: CheckboxProps) {
  return (
    <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border border-slate-200 px-3 py-2 has-checked:border-blue-600 has-checked:font-semibold dark:border-slate-700 dark:has-checked:border-blue-400">
      <input
        ref={ref}
        type="checkbox"
        name={name}
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        onBlur={onBlur}
        className="size-5 accent-blue-600 dark:accent-blue-400"
      />
      <span>{children}</span>
    </label>
  )
}
