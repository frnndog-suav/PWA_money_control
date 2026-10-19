import { describe, expect, it } from 'vitest'
import { THEME_STORAGE_KEY } from '@/lib/theme'
import { getSetting, setSetting } from '@/repositories/settingsRepository'
import {
  getStoredThemePreference,
  migrateThemePreferenceFromMirror,
  saveThemePreference,
} from '@/repositories/themeRepository'

describe('themeRepository', () => {
  // RF-09 / CA-09.2 — Dexie como fonte da verdade, espelho no localStorage (§6.9).
  it('salva no Dexie e no espelho', async () => {
    await saveThemePreference('dark')
    await expect(getSetting('theme')).resolves.toBe('dark')
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark')
    await expect(getStoredThemePreference()).resolves.toBe('dark')
  })

  it('ignora valor ausente ou inválido no Dexie', async () => {
    await expect(getStoredThemePreference()).resolves.toBeNull()
    await setSetting('theme', 'neon')
    await expect(getStoredThemePreference()).resolves.toBeNull()
  })

  describe('migrateThemePreferenceFromMirror (Fase 0 → Fase 2)', () => {
    it('copia para o Dexie o valor que só existia no localStorage', async () => {
      localStorage.setItem(THEME_STORAGE_KEY, 'light')
      await expect(migrateThemePreferenceFromMirror()).resolves.toBe(true)
      await expect(getSetting('theme')).resolves.toBe('light')
    })

    it('não sobrescreve o valor que já está no Dexie', async () => {
      await setSetting('theme', 'dark')
      localStorage.setItem(THEME_STORAGE_KEY, 'light')
      await expect(migrateThemePreferenceFromMirror()).resolves.toBe(false)
      await expect(getSetting('theme')).resolves.toBe('dark')
    })

    it('não grava nada sem valor válido no localStorage', async () => {
      await expect(migrateThemePreferenceFromMirror()).resolves.toBe(false)
      localStorage.setItem(THEME_STORAGE_KEY, 'neon')
      await expect(migrateThemePreferenceFromMirror()).resolves.toBe(false)
      await expect(getSetting('theme')).resolves.toBeNull()
    })

    it('chamadas simultâneas migram uma única vez', async () => {
      localStorage.setItem(THEME_STORAGE_KEY, 'dark')
      const results = await Promise.all([
        migrateThemePreferenceFromMirror(),
        migrateThemePreferenceFromMirror(),
      ])
      expect(results.filter(Boolean)).toHaveLength(1)
    })
  })
})
