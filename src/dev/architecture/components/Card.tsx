import type { ReactNode } from 'react'

type CardTone = 'default' | 'danger' | 'warn'

interface CardProps {
  children: ReactNode
  /** Destaca o cartão (ex.: problema encontrado). */
  tone?: CardTone
  id?: string
}

interface CardTitleProps {
  children: ReactNode
  /** Elementos ao lado do título (etiquetas). */
  trailing?: ReactNode
}

const TONE_CLASSES: Readonly<Record<CardTone, string>> = {
  default: 'border-slate-200 dark:border-slate-700',
  danger: 'border-red-500 dark:border-red-400',
  warn: 'border-amber-500 dark:border-amber-400',
}

function CardTitle({ children, trailing }: CardTitleProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <h3 className="font-semibold">{children}</h3>
      {trailing}
    </div>
  )
}

export function Card({ children, tone = 'default', id }: CardProps) {
  return (
    <div
      id={id}
      className={`flex min-w-0 scroll-mt-44 flex-col gap-2 rounded-lg border p-3 ${TONE_CLASSES[tone]}`}
    >
      {children}
    </div>
  )
}

Card.Title = CardTitle
