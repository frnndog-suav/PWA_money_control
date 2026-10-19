import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { ThemeProvider } from '@/app/theme/ThemeProvider'
import { ThemeSection } from '@/features/settings/ThemeSection'
import { THEME_COLORS, THEME_STORAGE_KEY } from '@/lib/theme'
import { getSetting, setSetting } from '@/repositories/settingsRepository'
import { setSystemPrefersDark } from '@/test/matchMedia'
import { addThemeColorMeta } from '@/test/renderApp'

function renderThemeSection() {
  render(
    <ThemeProvider>
      <ThemeSection />
    </ThemeProvider>,
  )
}

function getOption(name: string) {
  return screen.getByRole<HTMLInputElement>('radio', { name })
}

const isDarkApplied = () => document.documentElement.classList.contains('dark')

describe('ThemeSection (RF-09)', () => {
  let themeColorMeta: HTMLMetaElement

  beforeEach(() => {
    themeColorMeta = addThemeColorMeta()
  })

  // CA-09.1
  it('mostra as três opções com Automático marcado por padrão', () => {
    renderThemeSection()
    expect(screen.getByRole('group', { name: 'Tema' })).toBeDefined()
    expect(getOption('Automático (segue o sistema)').checked).toBe(true)
    expect(getOption('Claro').checked).toBe(false)
    expect(getOption('Escuro').checked).toBe(false)
  })

  // CA-09.3 / CA-09.4
  it('troca o tema na hora e acompanha o theme-color', () => {
    renderThemeSection()

    fireEvent.click(getOption('Escuro'))
    expect(isDarkApplied()).toBe(true)
    expect(themeColorMeta.content).toBe(THEME_COLORS.dark)

    fireEvent.click(getOption('Claro'))
    expect(isDarkApplied()).toBe(false)
    expect(themeColorMeta.content).toBe(THEME_COLORS.light)
  })

  // CA-09.2 / §6.7 — salva no Dexie (settings.theme) e no espelho do localStorage (§6.9).
  it('persiste a escolha no Dexie e no espelho', async () => {
    renderThemeSection()
    fireEvent.click(getOption('Escuro'))
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark')
    await waitFor(async () => expect(await getSetting('theme')).toBe('dark'))
  })

  // CA-09.2 / CA-09.3 — o espelho dá o valor da primeira renderização, sem piscar.
  it('abre com a escolha espelhada no localStorage já na primeira renderização', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'light')
    renderThemeSection()
    expect(getOption('Claro').checked).toBe(true)
  })

  // CA-09.2 — o Dexie é a fonte da verdade e corrige o espelho.
  it('abre com a escolha salva no Dexie e atualiza o espelho', async () => {
    await setSetting('theme', 'dark')
    renderThemeSection()
    await waitFor(() => expect(getOption('Escuro').checked).toBe(true))
    expect(isDarkApplied()).toBe(true)
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark')
  })

  // Fase 2 — migração do valor que só existia no localStorage (Fase 0).
  it('migra para o Dexie a escolha que só existia no localStorage', async () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'dark')
    renderThemeSection()
    await waitFor(async () => expect(await getSetting('theme')).toBe('dark'))
    expect(getOption('Escuro').checked).toBe(true)
  })

  // CA-09.1 — Automático segue o sistema, inclusive com o app aberto.
  it('no modo Automático reage à troca de tema do sistema', () => {
    renderThemeSection()
    expect(isDarkApplied()).toBe(false)

    act(() => setSystemPrefersDark(true))
    expect(isDarkApplied()).toBe(true)
    expect(themeColorMeta.content).toBe(THEME_COLORS.dark)

    act(() => setSystemPrefersDark(false))
    expect(isDarkApplied()).toBe(false)
  })

  it('com Claro escolhido, ignora o tema do sistema', () => {
    localStorage.setItem(THEME_STORAGE_KEY, 'light')
    renderThemeSection()
    act(() => setSystemPrefersDark(true))
    expect(isDarkApplied()).toBe(false)
  })
})
