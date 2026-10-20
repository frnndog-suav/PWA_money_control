import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import * as tagsRepository from '@/repositories/tagsRepository'
import { renderApp } from '@/test/renderApp'

// Falhas do IndexedDB ao conferir o uso ou excluir (RF-03 / CA-03.2 / CA-03.3): a tela
// mostra uma mensagem em pt-BR no modal em vez de deixar a promessa sem tratamento.
vi.mock('@/repositories/tagsRepository', async (importOriginal) => {
  const actual = await importOriginal<typeof tagsRepository>()
  return {
    ...actual,
    getTagUsage: vi.fn(actual.getTagUsage),
    deleteTag: vi.fn(actual.deleteTag),
  }
})

const getTagUsage = vi.mocked(tagsRepository.getTagUsage)
const deleteTag = vi.mocked(tagsRepository.deleteTag)

async function openEditDialog(tagName: string) {
  renderApp(['/ajustes/tags'])
  fireEvent.click(await screen.findByRole('button', { name: new RegExp(`^${tagName}`) }))
  return screen.getByRole('dialog', { name: 'Editar tag' })
}

afterEach(() => {
  vi.clearAllMocks()
})

describe('TagsPage — falhas ao excluir (RF-03)', () => {
  it('falha ao conferir o uso: mensagem no modal de edição e a tag continua', async () => {
    await tagsRepository.createTag({ name: 'Lazer', color: '#9333EA' })
    getTagUsage.mockRejectedValueOnce(new Error('IndexedDB indisponível'))
    const dialog = await openEditDialog('Lazer')

    fireEvent.click(within(dialog).getByRole('button', { name: 'Excluir tag' }))

    expect(await within(dialog).findByRole('alert')).toHaveProperty(
      'textContent',
      'Não foi possível verificar se a tag está em uso. Tente de novo.',
    )
    expect(
      within(dialog).getByRole<HTMLButtonElement>('button', { name: 'Excluir tag' }).disabled,
    ).toBe(false)
    expect(screen.queryByRole('dialog', { name: 'Excluir tag?' })).toBeNull()
  })

  it('"Excluir tag" fica desabilitado enquanto confere o uso', async () => {
    await tagsRepository.createTag({ name: 'Lazer', color: '#9333EA' })
    let finishCheck = () => {}
    getTagUsage.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finishCheck = () => resolve({ transactions: 0, recurrings: 0, installmentGroups: 0 })
        }),
    )
    const dialog = await openEditDialog('Lazer')
    const deleteButton = within(dialog).getByRole<HTMLButtonElement>('button', {
      name: 'Excluir tag',
    })

    fireEvent.click(deleteButton)
    await waitFor(() => expect(deleteButton.disabled).toBe(true))

    finishCheck()
    expect(await screen.findByRole('dialog', { name: 'Excluir tag?' })).toBeDefined()
  })

  it('falha ao excluir: mensagem na confirmação e a tag continua na lista', async () => {
    await tagsRepository.createTag({ name: 'Diversão', color: '#DB2777' })
    deleteTag.mockRejectedValueOnce(new Error('IndexedDB indisponível'))
    const dialog = await openEditDialog('Diversão')
    fireEvent.click(within(dialog).getByRole('button', { name: 'Excluir tag' }))
    const confirm = await screen.findByRole('dialog', { name: 'Excluir tag?' })

    fireEvent.click(within(confirm).getByRole('button', { name: 'Excluir' }))

    expect(await within(confirm).findByRole('alert')).toHaveProperty(
      'textContent',
      'Não foi possível excluir a tag. Tente de novo.',
    )
    expect(
      within(confirm).getByRole<HTMLButtonElement>('button', { name: 'Excluir' }).disabled,
    ).toBe(false)
    expect(await tagsRepository.listTagsWithTransactionCount()).toHaveLength(1)
  })

  it('a mensagem de erro some ao fechar e abrir de novo', async () => {
    await tagsRepository.createTag({ name: 'Lazer', color: '#9333EA' })
    getTagUsage.mockRejectedValueOnce(new Error('IndexedDB indisponível'))
    const dialog = await openEditDialog('Lazer')
    fireEvent.click(within(dialog).getByRole('button', { name: 'Excluir tag' }))
    await within(dialog).findByRole('alert')

    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancelar' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    fireEvent.click(screen.getByRole('button', { name: /^Lazer/ }))

    const reopened = screen.getByRole('dialog', { name: 'Editar tag' })
    expect(within(reopened).queryByRole('alert')).toBeNull()
  })
})
