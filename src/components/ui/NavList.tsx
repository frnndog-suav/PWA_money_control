import type { ReactNode } from 'react'
import { Link } from 'react-router'

interface NavListProps {
  children: ReactNode
}

interface NavListLinkProps {
  to: string
  children: ReactNode
}

function NavListLink({ to, children }: NavListLinkProps) {
  return (
    <li>
      <Link to={to} className="flex min-h-11 items-center justify-between px-4 py-2">
        <span>{children}</span>
        <span aria-hidden="true" className="text-slate-400">
          ›
        </span>
      </Link>
    </li>
  )
}

export function NavList({ children }: NavListProps) {
  return (
    <ul className="divide-y divide-slate-200 rounded-lg border border-slate-200 dark:divide-slate-700 dark:border-slate-700">
      {children}
    </ul>
  )
}

NavList.Link = NavListLink
