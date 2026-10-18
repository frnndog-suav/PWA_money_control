import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { renderApp } from '@/test/renderApp'

function getBottomNav() {
  return screen.getByRole('navigation', { name: 'Navegação principal' })
}

describe('BottomNav', () => {
  // RF-13
  it('mostra os 5 itens em pt-BR, na ordem da spec', async () => {
    renderApp(['/'])
    await screen.findByRole('heading', { name: 'Início' })
    const labels = within(getBottomNav())
      .getAllByRole('link')
      .map((link) => link.textContent)
    expect(labels).toEqual(['Início', 'Lançamentos', 'Visões', 'Gráficos', 'Ajustes'])
  })

  it.each([
    ['/', 'Início'],
    ['/lancamentos', 'Lançamentos'],
    ['/visoes', 'Visões'],
    ['/graficos', 'Gráficos'],
    ['/ajustes', 'Ajustes'],
    // Sub-rotas mantêm a aba pai ativa.
    ['/lancamentos/novo', 'Lançamentos'],
    ['/lancamentos/abc', 'Lançamentos'],
    ['/ajustes/tags', 'Ajustes'],
    ['/ajustes/recorrentes/abc', 'Ajustes'],
  ])('em %s só o item "%s" fica ativo', async (path, activeLabel) => {
    renderApp([path])
    const nav = getBottomNav()
    const active = await within(nav).findByRole('link', { current: 'page' })
    expect(active.textContent).toBe(activeLabel)
    expect(within(nav).getAllByRole('link', { current: 'page' })).toHaveLength(1)
  })
})
