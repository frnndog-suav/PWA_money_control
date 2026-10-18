import type { ReactNode } from 'react'

interface FieldsProps {
  children: ReactNode
}

interface FieldsItemProps {
  label: string
  children: ReactNode
}

function FieldsItem({ label, children }: FieldsItemProps) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <dt className="text-xs font-semibold tracking-wide text-slate-500 uppercase dark:text-slate-400">
        {label}
      </dt>
      <dd className="min-w-0 text-sm">{children}</dd>
    </div>
  )
}

/** Lista de pares rótulo/valor (inspetor, cartões de rota). */
export function Fields({ children }: FieldsProps) {
  return <dl className="flex flex-col gap-3">{children}</dl>
}

Fields.Item = FieldsItem
