import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { formatBRL } from '@/domain/money'
import type { Transaction } from '@/domain/types'
import { createTag } from '@/repositories/tagsRepository'
import * as transactionsRepository from '@/repositories/transactionsRepository'
import { renderApp } from '@/test/renderApp'
import {
  amountInput,
  clearAmount,
  dateInput,
  descriptionInput,
  expectSubmitEnabled,
  submit,
  typeAmount,
} from '@/test/transactionForm'

vi.mock('@/repositories/transactionsRepository', async (importOriginal) => {
  const actual = await importOriginal<typeof transactionsRepository>()
  return { ...actual, deleteTransaction: vi.fn(actual.deleteTransaction) }
})

const { createTransaction, getTransaction } = transactionsRepository
const deleteTransaction = vi.mocked(transactionsRepository.deleteTransaction)

afterEach(() => {
  vi.clearAllMocks()
})

async function seedTransaction(): Promise<Transaction> {
  const tag = await createTag({ name: 'Mercado', color: '#16A34A' })
  await createTag({ name: 'Lazer', color: '#9333EA' })
  return createTransaction({
    type: 'expense',
    amountCents: 25000,
    date: '2026-10-15',
    tagId: tag.id,
    description: 'Feira',
  })
}

// Aberto a partir do Início, para o "voltar" ter para onde ir.
async function openDetail(id: string) {
  const router = renderApp(['/', `/lancamentos/${id}`])
  await screen.findByRole('heading', { level: 1, name: 'Lançamento' })
  return router
}

describe('TransactionDetailPage (CA-01.5 / CA-01.6)', () => {
  it('abre com os dados do lançamento e "Salvar" já ativo', async () => {
    const transaction = await seedTransaction()
    await openDetail(transaction.id)

    await waitFor(() => expect(amountInput().value).toBe(formatBRL(25000)))
    expect(dateInput().value).toBe('2026-10-15')
    expect(descriptionInput().value).toBe('Feira')
    expect(screen.getByRole<HTMLInputElement>('radio', { name: 'Saída' }).checked).toBe(true)
    expect((await screen.findByRole<HTMLInputElement>('radio', { name: 'Mercado' })).checked).toBe(
      true,
    )
    expect(screen.queryByRole('button', { name: 'Lançar' })).toBeNull()
    await expectSubmitEnabled('Salvar', true)
  })

  // Roteiro, item 4 — editar o valor atualiza os saldos.
  it('salvar grava as alterações e volta para a tela anterior', async () => {
    const transaction = await seedTransaction()
    const router = await openDetail(transaction.id)
    await waitFor(() => expect(amountInput().value).toBe(formatBRL(25000)))

    clearAmount()
    await expectSubmitEnabled('Salvar', false)
    typeAmount('30000')
    fireEvent.click(await screen.findByRole('radio', { name: 'Lazer' }))
    await submit('Salvar')

    expect(await screen.findByRole('heading', { level: 1, name: 'Início' })).toBeDefined()
    expect(router.state.location.pathname).toBe('/')
    expect(await getTransaction(transaction.id)).toMatchObject({ amountCents: 30000 })
  })

  // Roteiro, item 5.
  it('excluir pede confirmação, remove e volta para a tela anterior', async () => {
    const transaction = await seedTransaction()
    const router = await openDetail(transaction.id)

    fireEvent.click(await screen.findByRole('button', { name: 'Excluir' }))
    const dialog = screen.getByRole('dialog', { name: 'Excluir lançamento?' })
    expect(within(dialog).getByText(/“Feira” será excluído/)).toBeDefined()

    fireEvent.click(within(dialog).getByRole('button', { name: 'Excluir' }))

    expect(await screen.findByRole('heading', { level: 1, name: 'Início' })).toBeDefined()
    expect(router.state.location.pathname).toBe('/')
    expect(await getTransaction(transaction.id)).toBeUndefined()
  })

  it('cancelar a exclusão mantém o lançamento', async () => {
    const transaction = await seedTransaction()
    await openDetail(transaction.id)

    fireEvent.click(await screen.findByRole('button', { name: 'Excluir' }))
    const dialog = screen.getByRole('dialog', { name: 'Excluir lançamento?' })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancelar' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(await getTransaction(transaction.id)).toBeDefined()
  })

  it('falha ao excluir mostra a mensagem no modal e permite tentar de novo', async () => {
    const transaction = await seedTransaction()
    deleteTransaction.mockRejectedValueOnce(new Error('IndexedDB indisponível'))
    await openDetail(transaction.id)

    fireEvent.click(await screen.findByRole('button', { name: 'Excluir' }))
    const dialog = screen.getByRole('dialog', { name: 'Excluir lançamento?' })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Excluir' }))

    expect((await within(dialog).findByRole('alert')).textContent).toBe(
      'Não foi possível excluir o lançamento. Tente de novo.',
    )
    const retry = within(dialog).getByRole<HTMLButtonElement>('button', { name: 'Excluir' })
    await waitFor(() => expect(retry.disabled).toBe(false))
    fireEvent.click(retry)
    expect(await screen.findByRole('heading', { level: 1, name: 'Início' })).toBeDefined()
  })

  // Fase 11 — id excluído ou inexistente aberto pela URL
  it('id inexistente → "Lançamento não encontrado"', async () => {
    renderApp(['/lancamentos/nao-existe'])
    expect(
      await screen.findByText('Lançamento não encontrado. Ele pode ter sido excluído.'),
    ).toBeDefined()
    expect(screen.queryByRole('button', { name: 'Salvar' })).toBeNull()
  })
})

describe('NewTransactionPage (RF-01)', () => {
  it('tem o formulário completo com "Lançar" e continua na tela depois de lançar', async () => {
    await createTag({ name: 'Mercado', color: '#16A34A' })
    const router = renderApp(['/lancamentos/novo'])
    await screen.findByRole('heading', { level: 1, name: 'Novo lançamento' })

    typeAmount('500')
    fireEvent.click(await screen.findByRole('radio', { name: 'Mercado' }))
    fireEvent.change(descriptionInput(), { target: { value: 'Café' } })
    await submit('Lançar')

    expect(await screen.findByText('Lançamento salvo')).toBeDefined()
    expect(router.state.location.pathname).toBe('/lancamentos/novo')
  })
})
