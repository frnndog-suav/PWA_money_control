import { afterEach, describe, expect, it, vi } from 'vitest'
import { THEME_STORAGE_KEY } from '@/lib/theme'
import { readThemeMirror, writeThemeMirror } from '@/lib/themeStorage'

describe('themeStorage (espelho do tema em localStorage)', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  // RF-09 / §6.9
  it('devolve null quando nada foi espelhado', () => {
    expect(readThemeMirror()).toBeNull()
  })

  // RF-09 / CA-09.3 — mesma chave lida pelo script do index.html.
  it('grava e lê a preferência na chave combinada com o script do index.html', () => {
    writeThemeMirror('dark')
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark')
    expect(readThemeMirror()).toBe('dark')
  })

  it('ignora valor inválido salvo', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'neon')
    expect(readThemeMirror()).toBeNull()
  })

  it('não quebra quando o localStorage está indisponível', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('bloqueado')
    })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('bloqueado')
    })
    expect(readThemeMirror()).toBeNull()
    expect(() => writeThemeMirror('light')).not.toThrow()
  })
})
