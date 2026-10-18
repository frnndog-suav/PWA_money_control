import type { ReactNode } from 'react'

interface PageProps {
  children: ReactNode
}

interface PageHeaderProps {
  /** Elemento antes do título, ex.: `<BackLink />` nas subpáginas. */
  leading?: ReactNode
  children: ReactNode
}

function PageHeader({ leading, children }: PageHeaderProps) {
  return (
    <header className="flex min-h-11 items-center gap-1">
      {leading}
      <h1 className="text-2xl font-bold">{children}</h1>
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
