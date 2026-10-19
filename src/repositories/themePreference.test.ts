import { act, renderHook, waitFor } from '@testing-library/react'
import { createElement, type ReactNode } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { db } from '@/db/database'
import { THEME_STORAGE_KEY } from '@/lib/theme'
import { getSetting, setSetting } from '@/repositories/settingsRepository'
import { ThemeContext, type ThemeContextValue } from '@/repositories/ThemeContext'
import { migrateThemePreferenceFromMirror } from '@/repositories/themeRepository'
import { useTheme } from '@/repositories/useTheme'
import { useThemePreference } from '@/repositories/useThemePreference'

// RF-09 / D-28 — tema com o Dexie como fonte da verdade e o localStorage como espelho.

afterEach(() => {
  vi.restoreAllMocks()
})

describe('migrateThemePreferenceFromMirror — uma única vez (D-28)', () => {
  it('depois de migrar, não volta a copiar o espelho por cima do Dexie', async () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'light')
    await expect(migrateThemePreferenceFromMirror()).resolves.toBe(true)

    // O Dexie muda depois (ex.: escolha em outra aba) e o espelho fica para trás.
    await setSetting('theme', 'dark')
    await expect(migrateThemePreferenceFromMirror()).resolves.toBe(false)
    await expect(getSetting('theme')).resolves.toBe('dark')
  })

  it('três chamadas simultâneas gravam uma vez só', async () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'dark')
    const results = await Promise.all([
      migrateThemePreferenceFromMirror(),
      migrateThemePreferenceFromMirror(),
      migrateThemePreferenceFromMirror(),
    ])
    expect(results.filter(Boolean)).toHaveLength(1)
    await expect(getSetting('theme')).resolves.toBe('dark')
  })
})

describe('useThemePreference (RF-09 / CA-09.2 / CA-09.3 / D-28)', () => {
  it('sem nada salvo usa Automático', async () => {
    const { result } = renderHook(() => useThemePreference())
    expect(result.current.preference).toBe('system')
    // Continua Automático depois que o Dexie carrega (vazio).
    await waitFor(() => expect(result.current.preference).toBe('system'))
    await expect(getSetting('theme')).resolves.toBeNull()
  })

  // D-28 — valor que só existe no localStorage (Fase 0) é copiado para o Dexie ao abrir.
  it('migra o valor da Fase 0 do localStorage para o Dexie', async () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'light')
    const { result } = renderHook(() => useThemePreference())
    expect(result.current.preference).toBe('light')
    await waitFor(async () => expect(await getSetting('theme')).toBe('light'))
    expect(result.current.preference).toBe('light')
  })

  // D-28 / CA-09.3 — enquanto o IndexedDB carrega vale o espelho (o que o script do
  // index.html aplicou); quando o Dexie carrega, ele vence e o espelho é corrigido.
  it('quando o Dexie diverge do espelho, o Dexie vence e o espelho é corrigido', async () => {
    await setSetting('theme', 'dark')
    localStorage.setItem(THEME_STORAGE_KEY, 'light')

    const { result } = renderHook(() => useThemePreference())
    expect(result.current.preference).toBe('light') // primeira renderização: espelho

    await waitFor(() => expect(result.current.preference).toBe('dark'))
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark')
    await expect(getSetting('theme')).resolves.toBe('dark') // a migração não sobrescreveu
  })

  it('recria o espelho apagado a partir do Dexie', async () => {
    await setSetting('theme', 'dark')
    const { result } = renderHook(() => useThemePreference())
    expect(result.current.preference).toBe('system') // sem espelho, padrão até carregar
    await waitFor(() => expect(result.current.preference).toBe('dark'))
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark')
  })

  // CA-09.2 / CA-09.3 — a escolha vale na hora e é gravada no Dexie e no espelho.
  it('setPreference aplica na hora e grava no Dexie e no espelho', async () => {
    const { result } = renderHook(() => useThemePreference())
    act(() => result.current.setPreference('dark'))
    expect(result.current.preference).toBe('dark')
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark')
    await waitFor(async () => expect(await getSetting('theme')).toBe('dark'))
  })

  it('falha do IndexedDB não derruba a escolha da sessão', async () => {
    vi.spyOn(db.settings, 'put').mockRejectedValue(new Error('armazenamento bloqueado'))
    const { result } = renderHook(() => useThemePreference())
    act(() => result.current.setPreference('light'))
    expect(result.current.preference).toBe('light')
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('light')
    await waitFor(() => expect(db.settings.put).toHaveBeenCalled())
    expect(result.current.preference).toBe('light')
  })
})

describe('useTheme (D-22)', () => {
  it('falha fora do ThemeProvider', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(() => renderHook(() => useTheme())).toThrow(/ThemeProvider/)
  })

  it('devolve o valor do contexto', () => {
    const value: ThemeContextValue = {
      preference: 'dark',
      resolvedTheme: 'dark',
      setPreference: vi.fn(),
    }
    const wrapper = ({ children }: { children: ReactNode }) =>
      createElement(ThemeContext, { value }, children)
    const { result } = renderHook(() => useTheme(), { wrapper })
    expect(result.current).toBe(value)
  })
})
