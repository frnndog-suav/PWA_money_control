import { screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { writeThemeMirror } from '@/lib/themeStorage'
import * as themeRepository from '@/repositories/themeRepository'
import { renderApp } from '@/test/renderApp'

// Fase 11 / RF-09 — o ThemeProvider fica acima do roteador (e da tela de erro das rotas): se a
// leitura do tema no Dexie falhar, o app abre com o tema do espelho em vez de ficar em branco.
vi.mock('@/repositories/themeRepository', async (importOriginal) => {
  const actual = await importOriginal<typeof themeRepository>()
  return { ...actual, getStoredThemePreference: vi.fn(actual.getStoredThemePreference) }
})

const getStoredThemePreference = vi.mocked(themeRepository.getStoredThemePreference)

afterEach(() => {
  getStoredThemePreference.mockReset()
})

describe('ThemeProvider com o IndexedDB falhando', () => {
  it('abre o Início com o tema do espelho do localStorage', async () => {
    writeThemeMirror('dark')
    getStoredThemePreference.mockRejectedValue(new Error('IndexedDB indisponível'))

    renderApp(['/'])

    expect(await screen.findByRole('heading', { level: 1, name: 'Início' })).toBeDefined()
    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })
})
