import { act, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useUiStore } from '@/stores/uiStore'
import { renderApp } from '@/test/renderApp'

// CA-11.3 / §2.10 — o aviso de nova versão é fixo acima da barra inferior; enquanto
// aparece, o conteúdo reserva a altura dele (--update-notice-height) para não ser coberto.
describe('AppLayout: espaço do aviso de nova versão', () => {
  it('sem versão nova, reserva só a barra inferior', async () => {
    renderApp(['/'])
    await screen.findByRole('heading', { name: 'Início' })
    const main = screen.getByRole('main')
    expect(main.classList.contains('pb-below-nav')).toBe(true)
    expect(main.classList.contains('reserve-update-notice')).toBe(false)
  })

  it('com versão nova, reserva também a altura do aviso', async () => {
    renderApp(['/'])
    await screen.findByRole('heading', { name: 'Início' })

    act(() => useUiStore.getState().setUpdateAvailable(true))

    const main = screen.getByRole('main')
    expect(main.classList.contains('pb-below-nav')).toBe(true)
    expect(main.classList.contains('reserve-update-notice')).toBe(true)
  })

  it('o aviso ocupa exatamente a altura reservada', async () => {
    renderApp(['/'])
    act(() => useUiStore.getState().setUpdateAvailable(true))
    const button = await screen.findByRole('button', { name: 'Atualizar' })
    expect(button.closest('[class~="h-(--update-notice-height)"]')).not.toBeNull()
  })
})
