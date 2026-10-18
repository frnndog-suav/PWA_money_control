import { useEffect, useState, type ReactNode } from 'react'
import { applyThemeToDocument } from '@/app/theme/applyThemeToDocument'
import { ThemeContext } from '@/app/theme/ThemeContext'
import { useSystemPrefersDark } from '@/app/theme/useSystemPrefersDark'
import { resolveTheme, type ThemePreference } from '@/lib/theme'
import { readThemePreference, writeThemePreference } from '@/lib/themeStorage'

interface ThemeProviderProps {
  children: ReactNode
}

// RF-09 — guarda a preferência, resolve o tema efetivo e o aplica ao documento.
export function ThemeProvider({ children }: ThemeProviderProps) {
  const [preference, setPreferenceState] = useState(readThemePreference)
  const systemPrefersDark = useSystemPrefersDark()
  const resolvedTheme = resolveTheme(preference, systemPrefersDark)

  useEffect(() => {
    applyThemeToDocument(resolvedTheme)
  }, [resolvedTheme])

  function setPreference(next: ThemePreference) {
    writeThemePreference(next)
    setPreferenceState(next)
  }

  return (
    <ThemeContext value={{ preference, resolvedTheme, setPreference }}>{children}</ThemeContext>
  )
}
