import type { ReactNode } from 'react'

export type NoticeVariant = 'accent' | 'subtle'

interface NoticeProps {
  /** `accent`: chama atenção e costuma ter ação; `subtle`: aviso discreto, só texto. */
  variant: NoticeVariant
  children: ReactNode
}

interface NoticeMessageProps {
  children: ReactNode
}

interface NoticeActionProps {
  onClick: () => void
  children: ReactNode
}

const VARIANT_CLASSES: Record<NoticeVariant, string> = {
  accent: 'bg-blue-700 text-white shadow-lg dark:bg-blue-600',
  subtle:
    'border border-slate-200 bg-slate-50 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200',
}

function NoticeMessage({ children }: NoticeMessageProps) {
  return <p className="flex-1">{children}</p>
}

// Alvo de toque ≥ 44 px (RNF-06); feito para ficar sobre o fundo da variante `accent`.
// Foco branco: o anel azul global some sobre o fundo azul, nos dois temas (RNF-06).
function NoticeAction({ onClick, children }: NoticeActionProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="min-h-11 shrink-0 rounded-md bg-white px-4 font-semibold text-blue-700 focus-visible:outline-white dark:focus-visible:outline-white"
    >
      {children}
    </button>
  )
}

/** Faixa de aviso em linha. Quem usa decide a região viva (`role="status"`) e a posição. */
export function Notice({ variant, children }: NoticeProps) {
  return (
    <div className={`flex items-center gap-3 rounded-lg px-4 py-2 ${VARIANT_CLASSES[variant]}`}>
      {children}
    </div>
  )
}

Notice.Message = NoticeMessage
Notice.Action = NoticeAction
