import { isThemePreference, THEME_STORAGE_KEY, type ThemePreference } from '@/lib/theme'

// RF-09 / §6.9 — espelho da preferência de tema em localStorage. A fonte da verdade é a
// tabela `settings` do Dexie (src/repositories/themeRepository.ts); o espelho existe só
// para o script inline do index.html aplicar o tema antes da primeira renderização, sem
// "piscar" (CA-09.3), já que o IndexedDB é assíncrono.
// localStorage pode lançar exceção (modo privado, armazenamento bloqueado): nesse caso
// o app segue sem o espelho em vez de quebrar.

/** Preferência espelhada, ou `null` se não houver valor válido (ou se o acesso falhar). */
export function readThemeMirror(): ThemePreference | null {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY)
    return isThemePreference(stored) ? stored : null
  } catch {
    return null
  }
}

export function writeThemeMirror(preference: ThemePreference): void {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, preference)
  } catch {
    // Sem localStorage o tema ainda é salvo no Dexie; só o "anti-piscar" fica de fora.
  }
}
