import { fireEvent, render, screen } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { describe, expect, it } from 'vitest'
import { BackLink } from '@/components/ui/BackLink'

function renderWithHistory(initialEntries: string[]) {
  const router = createMemoryRouter(
    [
      { path: '/pai', element: <h1>Pai</h1> },
      { path: '/outra', element: <h1>Outra</h1> },
      { path: '/filha', element: <BackLink fallbackTo="/pai" /> },
    ],
    { initialEntries },
  )
  render(<RouterProvider router={router} />)
  return router
}

describe('BackLink', () => {
  // O alvo de toque de 44 px (RNF-06) é garantido pelo próprio componente; o jsdom
  // não calcula layout, então aqui só conferimos o contrato acessível.
  it('é um botão com nome acessível "Voltar"', () => {
    renderWithHistory(['/filha'])
    const button = screen.getByRole('button', { name: 'Voltar' })
    expect(button.getAttribute('type')).toBe('button')
  })

  // CA-13.2
  it('volta para a entrada anterior do histórico', async () => {
    const router = renderWithHistory(['/outra', '/filha'])
    fireEvent.click(screen.getByRole('button', { name: 'Voltar' }))
    expect(await screen.findByRole('heading', { name: 'Outra' })).toBeDefined()
    expect(router.state.historyAction).toBe('POP')
  })

  it('sem entrada anterior, vai para a tela pai com replace', async () => {
    const router = renderWithHistory(['/filha'])
    fireEvent.click(screen.getByRole('button', { name: 'Voltar' }))
    expect(await screen.findByRole('heading', { name: 'Pai' })).toBeDefined()
    expect(router.state.historyAction).toBe('REPLACE')
  })
})
