import type { ReactNode } from 'react'

interface ErrorAlertProps {
  children: ReactNode
}

/** Mensagem de erro anunciada pelo leitor de tela assim que aparece (ex.: falha ao salvar). */
export function ErrorAlert({ children }: ErrorAlertProps) {
  return (
    <p role="alert" className="text-sm text-red-700 dark:text-red-300">
      {children}
    </p>
  )
}
