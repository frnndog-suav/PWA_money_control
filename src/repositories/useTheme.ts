import { use } from 'react'
import { ThemeContext, type ThemeContextValue } from '@/repositories/ThemeContext'

/** RF-09 — preferência e tema efetivo, fornecidos pelo ThemeProvider (src/app/theme). */
export function useTheme(): ThemeContextValue {
  const context = use(ThemeContext)
  if (!context) throw new Error('useTheme precisa estar dentro de <ThemeProvider>.')
  return context
}
