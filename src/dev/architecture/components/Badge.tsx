import type { ReactNode } from 'react'

export type BadgeVariant = 'neutral' | 'info' | 'ok' | 'warn' | 'danger' | 'dev'

const VARIANT_CLASSES: Readonly<Record<BadgeVariant, string>> = {
  neutral: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200',
  info: 'bg-blue-100 text-blue-900 dark:bg-blue-900/60 dark:text-blue-100',
  ok: 'bg-emerald-100 text-emerald-900 dark:bg-emerald-900/60 dark:text-emerald-100',
  warn: 'bg-amber-100 text-amber-900 dark:bg-amber-900/60 dark:text-amber-100',
  danger: 'bg-red-100 text-red-900 dark:bg-red-900/60 dark:text-red-100',
  dev: 'bg-fuchsia-100 text-fuchsia-900 dark:bg-fuchsia-900/60 dark:text-fuchsia-100',
}

interface BadgeProps {
  variant?: BadgeVariant
  /** Classes de cor prontas (ex.: cor da camada); substituem a variante. */
  colorClassName?: string
  children: ReactNode
}

export function Badge({ variant = 'neutral', colorClassName, children }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium whitespace-nowrap ${colorClassName ?? VARIANT_CLASSES[variant]}`}
    >
      {children}
    </span>
  )
}
