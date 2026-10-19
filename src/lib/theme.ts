// RF-09 — regras puras do tema (sem React, sem DOM).
// O script inline do index.html repete a chave e as cores abaixo para evitar o "piscar"
// ao abrir (CA-09.3); o teste src/app/theme/indexHtmlThemeScript.test.ts garante a sincronia.

export type ThemePreference = 'system' | 'light' | 'dark'
export type ResolvedTheme = 'light' | 'dark'

export const THEME_PREFERENCES: readonly ThemePreference[] = ['system', 'light', 'dark']
export const DEFAULT_THEME_PREFERENCE: ThemePreference = 'system'

// Chave do espelho em localStorage lido pelo script inline (§6.9). A preferência em si
// vive na tabela `settings` do Dexie (D-28).
export const THEME_STORAGE_KEY = 'theme'

export const DARK_COLOR_SCHEME_QUERY = '(prefers-color-scheme: dark)'

// Cor da barra de status (CA-09.4); igual ao fundo da página em cada tema (index.css).
export const THEME_COLORS: Readonly<Record<ResolvedTheme, string>> = {
  light: '#ffffff',
  dark: '#0f172a',
}

export function isThemePreference(value: unknown): value is ThemePreference {
  return THEME_PREFERENCES.some((preference) => preference === value)
}

export function resolveTheme(
  preference: ThemePreference,
  systemPrefersDark: boolean,
): ResolvedTheme {
  if (preference === 'system') return systemPrefersDark ? 'dark' : 'light'
  return preference
}

export function getThemeColor(theme: ResolvedTheme): string {
  return THEME_COLORS[theme]
}
