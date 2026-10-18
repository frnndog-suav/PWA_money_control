import { screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { setDisplayModeStandalone } from '@/test/matchMedia'
import { renderApp } from '@/test/renderApp'

const INSTALL_HINT =
  'Para seus dados ficarem guardados com segurança, adicione o app à Tela de Início e use sempre pelo ícone.'

function setNavigatorStandalone(value: boolean | undefined) {
  Object.defineProperty(navigator, 'standalone', { value, configurable: true })
}

// RF-11 / CA-11.6
describe('aviso fora do modo instalado', () => {
  afterEach(() => setNavigatorStandalone(undefined))

  it.each(['/', '/lancamentos', '/ajustes/sobre'])(
    'aparece numa aba comum do navegador (%s)',
    async (path) => {
      renderApp([path])
      expect(await screen.findByText(INSTALL_HINT)).toBeDefined()
    },
  )

  it('não aparece no app instalado (display-mode: standalone)', async () => {
    setDisplayModeStandalone(true)
    renderApp(['/'])
    await screen.findByRole('heading', { name: 'Início' })
    expect(screen.queryByText(INSTALL_HINT)).toBeNull()
  })

  it('não aparece no app instalado do iPhone (navigator.standalone)', async () => {
    setNavigatorStandalone(true)
    renderApp(['/'])
    await screen.findByRole('heading', { name: 'Início' })
    expect(screen.queryByText(INSTALL_HINT)).toBeNull()
  })
})
