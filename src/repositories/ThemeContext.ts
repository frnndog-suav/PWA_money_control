import { createContext } from 'react'
import type { ResolvedTheme, ThemePreference } from '@/lib/theme'

// D-22 — fica em repositories (e não em app/) para que as features possam usar o tema
// sem importar de src/app. O provider que aplica o tema ao documento continua em app/.

export interface ThemeContextValue {
  preference: ThemePreference
  resolvedTheme: ResolvedTheme
  setPreference: (preference: ThemePreference) => void
}

export const ThemeContext = createContext<ThemeContextValue | null>(null)
