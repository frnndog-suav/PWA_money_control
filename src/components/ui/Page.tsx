import type { ReactNode } from 'react'

interface PageProps {
  children: ReactNode
}

interface PageHeaderProps {
  /** Elemento antes do título, ex.: `<BackLink />` nas subpáginas. */
  leading?: ReactNode
  /** Ação no fim da linha do título, ex.: o atalho "Novo" da lista de lançamentos. */
  trailing?: ReactNode
  children: ReactNode
}

function PageHeader({ leading, trailing, children }: PageHeaderProps) {
  return (
    <header className="flex min-h-11 items-center gap-1">
      {leading}
      <h1 className="flex-1 text-2xl font-bold">{children}</h1>
      {trailing}
    </header>
  )
}

function PageBody({ children }: PageProps) {
  return <div className="flex flex-col gap-6">{children}</div>
}

export function Page({ children }: PageProps) {
  return <div className="flex flex-col gap-4">{children}</div>
}

Page.Header = PageHeader
Page.Body = PageBody
