import { fireEvent, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import * as pwaUpdate from '@/app/pwa/usePwaUpdate'
import * as tagsRepository from '@/repositories/tagsRepository'
import { renderApp } from '@/test/renderApp'

// Fase 11 — uma leitura do Dexie que falha (o useLiveQuery relança o erro na renderização) ou
// uma tela lazy que não carrega mostram uma tela de erro em pt-BR, nunca uma tela branca nem
// a tela padrão (em inglês) do React Router.
vi.mock('@/repositories/tagsRepository', async (importOriginal) => {
  const actual = await importOriginal<typeof tagsRepository>()
  return { ...actual, useTagsWithTransactionCount: vi.fn(actual.useTagsWithTransactionCount) }
})

vi.mock('@/app/pwa/usePwaUpdate', async (importOriginal) => {
  const actual = await importOriginal<typeof pwaUpdate>()
  return { ...actual, usePwaUpdate: vi.fn(actual.usePwaUpdate) }
})

const useTagsWithTransactionCount = vi.mocked(tagsRepository.useTagsWithTransactionCount)
const usePwaUpdate = vi.mocked(pwaUpdate.usePwaUpdate)

function failRead(): never {
  throw new Error('IndexedDB indisponível')
}

beforeEach(() => {
  // O React e o React Router registram o erro no console; aqui ele é esperado.
  vi.spyOn(console, 'error').mockImplementation(() => {})
  vi.spyOn(console, 'warn').mockImplementation(() => {})
})

afterEach(() => {
  vi.restoreAllMocks()
  useTagsWithTransactionCount.mockReset()
  usePwaUpdate.mockReset()
})

describe('RouteErrorPage (Fase 11)', () => {
  it('falha ao ler os dados de uma tela: mensagem dentro do layout, com a barra inferior', async () => {
    useTagsWithTransactionCount.mockImplementation(failRead)
    renderApp(['/ajustes/tags'])

    expect(await screen.findByRole('heading', { level: 1, name: 'Algo deu errado' })).toBeDefined()
    expect(screen.getByRole('alert').textContent).toBe(
      'Não foi possível abrir esta tela. Tente de novo; se o problema continuar, feche e abra o app.',
    )
    expect(screen.getByRole('button', { name: 'Tentar de novo' })).toBeDefined()
    expect(screen.getByRole('link', { name: 'Ir para o Início' }).getAttribute('href')).toBe('/')
    expect(screen.getByRole('navigation', { name: 'Navegação principal' })).toBeDefined()
  })

  it('a barra inferior sai da tela de erro', async () => {
    useTagsWithTransactionCount.mockImplementation(failRead)
    renderApp(['/ajustes/tags'])
    await screen.findByRole('heading', { level: 1, name: 'Algo deu errado' })

    const nav = screen.getByRole('navigation', { name: 'Navegação principal' })
    fireEvent.click(within(nav).getByRole('link', { name: 'Visões' }))

    expect(await screen.findByRole('heading', { level: 1, name: 'Visões' })).toBeDefined()
    expect(screen.queryByRole('heading', { name: 'Algo deu errado' })).toBeNull()
  })

  it('falha no próprio layout: tela de erro sozinha, com o conteúdo na região principal', async () => {
    usePwaUpdate.mockImplementation(failRead)
    renderApp(['/'])

    const heading = await screen.findByRole('heading', { level: 1, name: 'Algo deu errado' })
    expect(screen.getByRole('main').contains(heading)).toBe(true)
    expect(screen.queryByRole('navigation', { name: 'Navegação principal' })).toBeNull()
    expect(screen.getByRole('button', { name: 'Tentar de novo' })).toBeDefined()
  })
})
