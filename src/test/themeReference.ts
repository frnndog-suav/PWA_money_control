import { DEFAULT_THEME_PREFERENCE, isThemePreference, type ThemePreference } from '@/lib/theme'

/**
 * Referência de teste: como o script inline do index.html interpreta o valor espelhado em
 * localStorage (inválido ou ausente → Automático). Fica fora do código de produção, que lê
 * o espelho por src/lib/themeStorage.ts.
 */
export function parseStoredThemePreference(raw: string | null): ThemePreference {
  return isThemePreference(raw) ? raw : DEFAULT_THEME_PREFERENCE
}
