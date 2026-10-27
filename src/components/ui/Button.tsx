import type { ButtonHTMLAttributes, Ref } from 'react'
import { buttonVariantClasses, type ButtonVariant } from '@/components/ui/buttonClasses'

export type { ButtonVariant }

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant: ButtonVariant
  ref?: Ref<HTMLButtonElement>
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
      className={`${buttonVariantClasses(variant)} ${DISABLED_CLASSES} ${className}`}
      {...props}
    />
  )
}
