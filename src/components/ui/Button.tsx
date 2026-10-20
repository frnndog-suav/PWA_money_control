import type { ButtonHTMLAttributes } from 'react'

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'danger-outline'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant: ButtonVariant
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: 'bg-blue-700 text-white dark:bg-blue-600',
  secondary: 'border border-slate-300 text-slate-900 dark:border-slate-600 dark:text-slate-100',
  danger: 'bg-red-700 text-white dark:bg-red-600',
  'danger-outline': 'border border-red-300 text-red-700 dark:border-red-800 dark:text-red-300',
}

/** Botão de ação com alvo de toque ≥ 44 px (RNF-06). `type="button"` por padrão. */
export function Button({ variant, type = 'button', className = '', ...props }: ButtonProps) {
  return (
    <button
      type={type}
      className={`min-h-11 rounded-lg px-4 font-semibold disabled:opacity-60 ${VARIANT_CLASSES[variant]} ${className}`}
      {...props}
    />
  )
}
