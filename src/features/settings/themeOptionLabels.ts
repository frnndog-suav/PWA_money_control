import type { ThemePreference } from '@/lib/theme'

// RF-09 / CA-09.1 — rótulos exatos da spec.
export const THEME_OPTION_LABELS: Readonly<Record<ThemePreference, string>> = {
  system: 'Automático (segue o sistema)',
  light: 'Claro',
  dark: 'Escuro',
}
