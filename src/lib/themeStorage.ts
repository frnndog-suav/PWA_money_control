import { parseThemePreference, THEME_STORAGE_KEY, type ThemePreference } from '@/lib/theme'

// RF-09 / CA-09.2 — único ponto de leitura/escrita da preferência de tema.
// Persistência temporária em localStorage; migra para o Dexie na Fase 2.
// localStorage pode lançar exceção (modo privado, armazenamento bloqueado): nesse caso
// o app segue com o padrão em vez de quebrar.

export function readThemePreference(): ThemePreference {
  try {
    return parseThemePreference(localStorage.getItem(THEME_STORAGE_KEY))
  } catch {
    return parseThemePreference(null)
  }
}

export function writeThemePreference(preference: ThemePreference): void {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, preference)
  } catch {
    // Sem armazenamento disponível a escolha vale só para esta sessão.
  }
}
