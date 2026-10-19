import { db } from '@/db/database'
import { isThemePreference, type ThemePreference } from '@/lib/theme'
import { readThemeMirror, writeThemeMirror } from '@/lib/themeStorage'
import { getSetting, setSetting } from '@/repositories/settingsRepository'

// RF-09 / §6.7 / §6.9 — a preferência de tema vive na tabela `settings` (chave `theme`).
// O localStorage guarda só um espelho, lido pelo script inline do index.html para
// aplicar o tema antes da primeira renderização (CA-09.3).

const THEME_SETTING_KEY = 'theme'

/** Preferência salva no Dexie, ou `null` se não houver valor válido. */
export async function getStoredThemePreference(): Promise<ThemePreference | null> {
  const stored = await getSetting(THEME_SETTING_KEY)
  return isThemePreference(stored) ? stored : null
}

/** Atualiza o espelho na hora (próxima abertura sem piscar) e grava no Dexie. */
export async function saveThemePreference(preference: ThemePreference): Promise<void> {
  writeThemeMirror(preference)
  await setSetting(THEME_SETTING_KEY, preference)
}

/**
 * Fase 0 → Fase 2: a preferência ficava só no localStorage. Se o Dexie ainda não tem
 * tema e o localStorage tem um valor válido, copia esse valor para o Dexie. Não faz nada
 * nas aberturas seguintes. Devolve se migrou.
 */
export async function migrateThemePreferenceFromMirror(): Promise<boolean> {
  const mirrored = readThemeMirror()
  if (!mirrored) return false

  // Leitura e escrita na mesma transação: duas chamadas simultâneas (StrictMode) não
  // sobrescrevem um valor gravado no meio do caminho.
  return db.transaction('rw', db.settings, async () => {
    if (await db.settings.get(THEME_SETTING_KEY)) return false
    await db.settings.put({ key: THEME_SETTING_KEY, value: mirrored })
    return true
  })
}
