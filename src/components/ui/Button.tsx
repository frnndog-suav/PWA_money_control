import type { ButtonHTMLAttributes, Ref } from 'react'

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'danger-outline'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant: ButtonVariant
  ref?: Ref<HTMLButtonElement>
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: 'bg-blue-700 text-white dark:bg-blue-600',
  secondary: 'border border-slate-300 text-slate-900 dark:border-slate-600 dark:text-slate-100',
  danger: 'bg-red-700 text-white dark:bg-red-600',
  'danger-outline': 'border border-red-300 text-red-700 dark:border-red-800 dark:text-red-300',
}

// Princípio 16 — desabilitado vira cinza neutro em qualquer variante (contraste do texto
// ≥ 4,5:1 nos dois temas), para ficar claro que não dá para tocar sem depender de opacidade.
const DISABLED_CLASSES =
  'disabled:cursor-not-allowed disabled:border-slate-300 disabled:bg-slate-200 disabled:text-slate-600 dark:disabled:border-slate-700 dark:disabled:bg-slate-800 dark:disabled:text-slate-400'

/**
 * Botão de ação com alvo de toque ≥ 44 px (RNF-06). `type="button"` por padrão.
 * Use `disabled` (nativo, anunciado pelo leitor de tela) para o estado indisponível.
 */
export function Button({ variant, type = 'button', className = '', ...props }: ButtonProps) {
  return (
    <button
      type={type}
      className={`min-h-11 rounded-lg px-4 font-semibold ${VARIANT_CLASSES[variant]} ${DISABLED_CLASSES} ${className}`}
      {...props}
    />
  )
}
