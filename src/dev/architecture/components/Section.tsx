import type { ReactNode } from 'react'

interface SectionProps {
  id: string
  title: string
  /** Uma ou duas frases explicando o que a seção mostra e de onde vêm os dados. */
  description?: ReactNode
  children: ReactNode
}

export function Section({ id, title, description, children }: SectionProps) {
  return (
    <section id={id} aria-labelledby={`${id}-titulo`} className="flex scroll-mt-44 flex-col gap-4">
      <header className="flex flex-col gap-1 border-b border-slate-200 pb-2 dark:border-slate-700">
        <h2 id={`${id}-titulo`} className="text-xl font-bold">
          {title}
        </h2>
        {description && <p className="text-sm text-slate-600 dark:text-slate-400">{description}</p>}
      </header>
      {children}
    </section>
  )
}
