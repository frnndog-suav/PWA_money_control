import { afterEach, describe, expect, it, vi } from 'vitest'
import { THEME_STORAGE_KEY } from '@/lib/theme'
import { readThemePreference, writeThemePreference } from '@/lib/themeStorage'

describe('themeStorage', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  // RF-09 / CA-09.1
  it('devolve Automático quando nada foi salvo', () => {
    expect(readThemePreference()).toBe('system')
  })

  // RF-09 / CA-09.2
  it('grava e lê a preferência na chave combinada com o script do index.html', () => {
    writeThemePreference('dark')
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark')
    expect(readThemePreference()).toBe('dark')
  })

  it('ignora valor inválido salvo', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'neon')
    expect(readThemePreference()).toBe('system')
  })

  it('não quebra quando o localStorage está indisponível', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('bloqueado')
    })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('bloqueado')
    })
    expect(readThemePreference()).toBe('system')
    expect(() => writeThemePreference('light')).not.toThrow()
  })
})
