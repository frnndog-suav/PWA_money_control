import { lazy } from 'react'
import { fireEvent, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type * as lazyPages from '@/app/lazyPages'
import { renderApp } from '@/test/renderApp'

// Fase 11 / D-54 — uma tela lazy que não carrega (ex.: pacote antigo removido do servidor)
// mostra a tela de erro dentro do layout; "Tentar de novo" recarrega o app.
vi.mock('@/app/lazyPages', async (importOriginal) => {
  const actual = await importOriginal<typeof lazyPages>()
  return {
    ...actual,
    ChartsPage: lazy(() => Promise.reject(new Error('Falha ao carregar o módulo'))),
  }
})

beforeEach(() => {
  // O React e o React Router registram o erro no console; aqui ele é esperado.
  vi.spyOn(console, 'error').mockImplementation(() => {})
  vi.spyOn(console, 'warn').mockImplementation(() => {})
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe('RouteErrorPage — tela lazy que não carregou (Fase 11)', () => {
  it('mostra a mensagem dentro do layout, com a barra inferior', async () => {
    renderApp(['/graficos'])

    expect(await screen.findByRole('heading', { level: 1, name: 'Algo deu errado' })).toBeDefined()
    expect(screen.getByRole('navigation', { name: 'Navegação principal' })).toBeDefined()
  })

  it('"Tentar de novo" recarrega o app', async () => {
    renderApp(['/graficos'])
    await screen.findByRole('heading', { level: 1, name: 'Algo deu errado' })
    const reload = vi.fn()
    vi.stubGlobal('location', { ...window.location, reload })

    fireEvent.click(screen.getByRole('button', { name: 'Tentar de novo' }))

    expect(reload).toHaveBeenCalledOnce()
  })
})
