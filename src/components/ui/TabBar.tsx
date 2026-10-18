import type { ReactNode } from 'react'
import { NavLink } from 'react-router'

interface TabBarProps {
  /** Nome acessível da navegação. */
  label: string
  children: ReactNode
}

interface TabBarLinkProps {
  to: string
  /** Ativo só na rota exata (necessário para "/"). */
  end?: boolean
  children: ReactNode
}

function TabBarLink({ to, end, children }: TabBarLinkProps) {
  return (
    <li className="flex flex-1">
      {/* Item ativo: negrito + traço superior, não só cor (RNF-06). */}
      <NavLink
        to={to}
        end={end}
        className="flex min-h-11 flex-1 items-center justify-center border-t-2 border-transparent px-1 text-xs text-slate-600 aria-[current=page]:border-blue-600 aria-[current=page]:font-semibold aria-[current=page]:text-blue-700 dark:text-slate-300 dark:aria-[current=page]:border-blue-400 dark:aria-[current=page]:text-blue-300"
      >
        {children}
      </NavLink>
    </li>
  )
}

// CA-13.1 — fixa no rodapé, com a área segura do iPhone abaixo dos itens.
export function TabBar({ label, children }: TabBarProps) {
  return (
    <nav
      aria-label={label}
      className="px-safe pb-safe fixed inset-x-0 bottom-0 border-t border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900"
    >
      <ul className="mx-auto flex h-(--bottom-nav-height) max-w-2xl">{children}</ul>
    </nav>
  )
}

TabBar.Link = TabBarLink
