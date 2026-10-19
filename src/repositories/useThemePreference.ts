import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useState } from 'react'
import { DEFAULT_THEME_PREFERENCE, type ThemePreference } from '@/lib/theme'
import { readThemeMirror, writeThemeMirror } from '@/lib/themeStorage'
import {
  getStoredThemePreference,
  migrateThemePreferenceFromMirror,
  saveThemePreference,
} from '@/repositories/themeRepository'

export interface ThemePreferenceState {
  preference: ThemePreference
  setPreference: (preference: ThemePreference) => void
}

// Falha do IndexedDB (ex.: armazenamento bloqueado) não pode derrubar o app: a escolha
// continua valendo na sessão e no espelho.
function ignoreStorageError(): void {}

/**
 * RF-09 — preferência de tema com o Dexie como fonte da verdade (§6.7).
 * Enquanto o IndexedDB carrega, usa o espelho do localStorage, o mesmo valor que o script
 * do index.html já aplicou; assim a primeira renderização não troca o tema (CA-09.3).
 */
export function useThemePreference(): ThemePreferenceState {
  // undefined = carregando; null = nada salvo no Dexie.
  const storedPreference = useLiveQuery(getStoredThemePreference)
  const [mirroredPreference] = useState(readThemeMirror)
  // Escolha feita nesta sessão: vale na hora (CA-09.3), sem esperar a gravação no Dexie.
  const [chosenPreference, setChosenPreference] = useState<ThemePreference | null>(null)

  useEffect(() => {
    migrateThemePreferenceFromMirror().catch(ignoreStorageError)
  }, [])

  // Mantém o espelho igual ao Dexie (ex.: localStorage apagado e IndexedDB preservado).
  useEffect(() => {
    if (storedPreference) writeThemeMirror(storedPreference)
  }, [storedPreference])

  function setPreference(next: ThemePreference) {
    setChosenPreference(next)
    saveThemePreference(next).catch(ignoreStorageError)
  }

  return {
    preference:
      chosenPreference ?? storedPreference ?? mirroredPreference ?? DEFAULT_THEME_PREFERENCE,
    setPreference,
  }
}
