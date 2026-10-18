import { createContext } from 'react'

export interface InspectorContextValue {
  selectedId: string | null
  /** Abre o inspetor no módulo (ou fecha, com null). */
  select: (moduleId: string | null) => void
}

// Evita passar `select` por várias camadas: qualquer caminho clicável da página abre o inspetor.
export const InspectorContext = createContext<InspectorContextValue | null>(null)
