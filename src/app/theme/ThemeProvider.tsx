import { useEffect, type ReactNode } from 'react'
import { applyThemeToDocument } from '@/app/theme/applyThemeToDocument'
import { useSystemPrefersDark } from '@/app/theme/useSystemPrefersDark'
import { resolveTheme } from '@/lib/theme'
import { ThemeContext } from '@/repositories/ThemeContext'
import { useThemePreference } from '@/repositories/useThemePreference'

interface ThemeProviderProps {
  children: ReactNode
}

// RF-09 — lê a preferência (Dexie, com espelho no localStorage), resolve o tema efetivo
// com o tema do sistema e o aplica ao documento.
export function ThemeProvider({ children }: ThemeProviderProps) {
  const { preference, setPreference } = useThemePreference()
  const systemPrefersDark = useSystemPrefersDark()
  const resolvedTheme = resolveTheme(preference, systemPrefersDark)

  useEffect(() => {
    applyThemeToDocument(resolvedTheme)
  }, [resolvedTheme])

  return (
    <ThemeContext value={{ preference, resolvedTheme, setPreference }}>{children}</ThemeContext>
  )
}
