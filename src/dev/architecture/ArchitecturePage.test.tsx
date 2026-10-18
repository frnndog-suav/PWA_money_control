import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import ArchitecturePage from '@/dev/architecture/ArchitecturePage'
import { renderApp } from '@/test/renderApp'

const SECTION_TITLES = [
  'Visão geral',
  'Camadas',
  'Grafo de módulos',
  'Rotas e telas',
  'PWA e artefatos do build',
  'Composição de componentes',
  'Fluxos de dados e interações',
  'Modelo de dados',
  'Estado de interface',
  'Funções de domínio e lib',
  'Rastreabilidade',
  'Dependências externas',
  'Linha do tempo',
  'Saúde da arquitetura',
]

describe('ArchitecturePage (§6.12)', () => {
  it('renderiza todas as seções', () => {
    render(<ArchitecturePage />)
    for (const title of SECTION_TITLES) {
      expect(screen.getByRole('heading', { level: 2, name: title })).toBeDefined()
    }
  })

  it('tocar num módulo abre o inspetor e "Fechar" o esconde', () => {
    render(<ArchitecturePage />)
    const graph = screen.getByRole('img', { name: /^Grafo com/ })
    fireEvent.click(within(graph).getByRole('button', { name: 'src/lib/theme.ts' }))

    const inspector = screen.getByRole('complementary', { name: 'Inspetor de módulo' })
    expect(within(inspector).getByRole('heading', { name: 'src/lib/theme.ts' })).toBeDefined()

    fireEvent.click(within(inspector).getByRole('button', { name: 'Fechar' }))
    expect(within(inspector).getByRole('heading', { name: 'Inspetor' })).toBeDefined()
  })

  it('a busca encontra hooks e abre o módulo', () => {
    render(<ArchitecturePage />)
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'useTheme' } })
    const results = screen.getByRole('list', { name: 'Resultados da busca' })
    fireEvent.click(within(results).getAllByRole('button')[0])
    const inspector = screen.getByRole('complementary', { name: 'Inspetor de módulo' })
    expect(within(inspector).getByRole('heading', { name: /useTheme/ })).toBeDefined()
  })

  it('o diagrama do PWA abre o módulo das opções no inspetor', () => {
    render(<ArchitecturePage />)
    const diagram = screen.getByRole('img', { name: /^Topologia do PWA/ })
    fireEvent.click(
      within(diagram).getByRole('button', { name: 'Abrir src/app/pwa/pwaOptions.ts no inspetor' }),
    )
    const inspector = screen.getByRole('complementary', { name: 'Inspetor de módulo' })
    expect(
      within(inspector).getByRole('heading', { name: 'src/app/pwa/pwaOptions.ts' }),
    ).toBeDefined()
  })

  // D-17 — em DEV (e nos testes) a rota existe, fora do layout com barra inferior.
  it('a rota /__dev/arquitetura abre a página sem a barra inferior', async () => {
    renderApp(['/__dev/arquitetura'])
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Arquitetura e linha do tempo' }),
    ).toBeDefined()
    expect(screen.queryByRole('navigation', { name: 'Navegação principal' })).toBeNull()
  })
})
