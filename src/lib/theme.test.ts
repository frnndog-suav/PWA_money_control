import { describe, expect, it } from 'vitest'
import {
  DEFAULT_THEME_PREFERENCE,
  getThemeColor,
  isThemePreference,
  parseThemePreference,
  resolveTheme,
  THEME_COLORS,
  THEME_PREFERENCES,
} from '@/lib/theme'

describe('theme', () => {
  // RF-09 / CA-09.1
  it('oferece as três preferências com Automático como padrão', () => {
    expect(THEME_PREFERENCES).toEqual(['system', 'light', 'dark'])
    expect(DEFAULT_THEME_PREFERENCE).toBe('system')
  })

  describe('isThemePreference', () => {
    it.each(['system', 'light', 'dark'])('aceita %s', (value) => {
      expect(isThemePreference(value)).toBe(true)
    })

    it.each([null, undefined, '', 'Dark', 'auto', 1])('rejeita %s', (value) => {
      expect(isThemePreference(value)).toBe(false)
    })
  })

  describe('parseThemePreference', () => {
    // RF-09 / CA-09.2
    it('devolve o valor salvo quando válido', () => {
      expect(parseThemePreference('dark')).toBe('dark')
      expect(parseThemePreference('light')).toBe('light')
      expect(parseThemePreference('system')).toBe('system')
    })

    it('cai no padrão Automático quando ausente ou inválido', () => {
      expect(parseThemePreference(null)).toBe('system')
      expect(parseThemePreference('roxo')).toBe('system')
    })
  })

  describe('resolveTheme', () => {
    it('Automático segue o sistema', () => {
      expect(resolveTheme('system', true)).toBe('dark')
      expect(resolveTheme('system', false)).toBe('light')
    })

    it('Claro e Escuro ignoram o sistema', () => {
      expect(resolveTheme('light', true)).toBe('light')
      expect(resolveTheme('dark', false)).toBe('dark')
    })
  })

  // RF-09 / CA-09.4
  it('getThemeColor devolve a cor da barra de status de cada tema', () => {
    expect(getThemeColor('light')).toBe(THEME_COLORS.light)
    expect(getThemeColor('dark')).toBe(THEME_COLORS.dark)
    expect(THEME_COLORS.light).not.toBe(THEME_COLORS.dark)
  })
})
