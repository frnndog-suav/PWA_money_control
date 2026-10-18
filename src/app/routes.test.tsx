import { act, fireEvent, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { renderApp } from '@/test/renderApp'

describe('rotas (§6.6)', () => {
  it.each([
    ['/', 'Início'],
    ['/lancamentos', 'Lançamentos'],
    ['/lancamentos/novo', 'Novo lançamento'],
    ['/lancamentos/123', 'Lançamento'],
    ['/visoes', 'Visões'],
    ['/graficos', 'Gráficos'],
    ['/ajustes', 'Ajustes'],
    ['/ajustes/tags', 'Tags'],
    ['/ajustes/recorrentes', 'Recorrentes'],
    ['/ajustes/recorrentes/123', 'Recorrente'],
    ['/ajustes/backup', 'Backup'],
    ['/ajustes/sobre', 'Sobre'],
  ])('%s mostra o título "%s"', async (path, title) => {
    renderApp([path])
    expect(await screen.findByRole('heading', { level: 1, name: title })).toBeDefined()
  })

  // D-21
  it('caminho desconhecido redireciona para o Início', async () => {
    const router = renderApp(['/nao-existe'])
    expect(await screen.findByRole('heading', { name: 'Início' })).toBeDefined()
    expect(router.state.location.pathname).toBe('/')
  })

  // CA-13.2
  it('o "voltar" do navegador retorna à aba anterior', async () => {
    const router = renderApp(['/'])
    await screen.findByRole('heading', { name: 'Início' })
    const nav = screen.getByRole('navigation', { name: 'Navegação principal' })

    fireEvent.click(within(nav).getByRole('link', { name: 'Gráficos' }))
    await screen.findByRole('heading', { name: 'Gráficos' })

    await act(() => router.navigate(-1))
    expect(await screen.findByRole('heading', { name: 'Início' })).toBeDefined()
  })

  // RF-13
  it('Ajustes abre as subpáginas', async () => {
    renderApp(['/ajustes'])
    const menu = await screen.findByRole('navigation', { name: 'Ajustes' })
    fireEvent.click(within(menu).getByRole('link', { name: /Tags/ }))
    expect(await screen.findByRole('heading', { name: 'Tags' })).toBeDefined()
  })

  // CA-13.2
  it('o botão Voltar da subpágina volta no histórico, não para a tela pai fixa', async () => {
    const router = renderApp(['/lancamentos', '/ajustes/tags'])
    fireEvent.click(await screen.findByRole('button', { name: 'Voltar' }))
    expect(await screen.findByRole('heading', { name: 'Lançamentos' })).toBeDefined()
    expect(router.state.historyAction).toBe('POP')
  })

  it('subpágina aberta direto pela URL: Voltar vai para a tela pai substituindo a entrada', async () => {
    const router = renderApp(['/ajustes/recorrentes/abc'])
    fireEvent.click(await screen.findByRole('button', { name: 'Voltar' }))
    expect(await screen.findByRole('heading', { name: 'Recorrentes' })).toBeDefined()
    expect(router.state.location.pathname).toBe('/ajustes/recorrentes')
    expect(router.state.historyAction).toBe('REPLACE')
  })
})
