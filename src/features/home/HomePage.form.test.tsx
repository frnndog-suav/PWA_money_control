import { act, fireEvent, screen, waitFor, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { formatBRL } from '@/domain/money'
import { createTag } from '@/repositories/tagsRepository'
import * as transactionsRepository from '@/repositories/transactionsRepository'
import { renderApp } from '@/test/renderApp'
import { readAllTags } from '@/test/seedDatabase'
import {
  amountInput,
  chooseDate,
  dateInput,
  descriptionInput,
  expectSubmitEnabled,
  fillTransactionForm,
  submit,
  typeAmount,
  typeDescription,
} from '@/test/transactionForm'

vi.mock('@/repositories/transactionsRepository', async (importOriginal) => {
  const actual = await importOriginal<typeof transactionsRepository>()
  return { ...actual, createTransaction: vi.fn(actual.createTransaction) }
})

const createTransaction = vi.mocked(transactionsRepository.createTransaction)

afterEach(() => {
  vi.clearAllMocks()
  vi.useRealTimers()
})

async function openHome() {
  renderApp(['/'])
  await screen.findByRole('heading', { level: 1, name: 'Início' })
}

// CA-01.7 — sem tags: orienta e cria a tag sem perder o que foi digitado.
describe('formulário de lançamento — nenhuma tag (CA-01.7)', () => {
  it('orienta a criar uma tag e, criada pelo atalho, ela já fica escolhida', async () => {
    await openHome()
    expect(await screen.findByText(/Você ainda não tem nenhuma tag/)).toBeDefined()

    typeAmount('1999')
    typeDescription('Feira do sábado')
    fireEvent.click(screen.getByRole('button', { name: 'Criar tag' }))

    const dialog = screen.getByRole('dialog', { name: 'Nova tag' })
    fireEvent.change(within(dialog).getByLabelText('Nome'), { target: { value: 'Mercado' } })
    const save = within(dialog).getByRole<HTMLButtonElement>('button', { name: 'Salvar' })
    await waitFor(() => expect(save.disabled).toBe(false))
    fireEvent.click(save)

    const tagRadio = await screen.findByRole<HTMLInputElement>('radio', { name: 'Mercado' })
    await waitFor(() => expect(tagRadio.checked).toBe(true))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(amountInput().value).toBe(formatBRL(1999))
    expect(descriptionInput().value).toBe('Feira do sábado')
    expect(await readAllTags()).toMatchObject([{ name: 'Mercado' }])

    await submit('Lançar')
    expect(await screen.findByText('Lançamento salvo')).toBeDefined()
  })

  it('cancelar a criação da tag mantém o que foi digitado', async () => {
    await openHome()
    typeDescription('Cinema')
    fireEvent.click(await screen.findByRole('button', { name: 'Criar tag' }))
    const dialog = screen.getByRole('dialog', { name: 'Nova tag' })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancelar' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(descriptionInput().value).toBe('Cinema')
    await expectSubmitEnabled('Lançar', false)
  })
})

// D-36 — falha genérica: mensagem à parte, botão continua ativo para tentar de novo.
describe('formulário de lançamento — falha ao gravar (D-36)', () => {
  it('mostra a mensagem, mantém os dados e permite tentar de novo', async () => {
    await createTag({ name: 'Mercado', color: '#16A34A' })
    createTransaction.mockRejectedValueOnce(new Error('IndexedDB indisponível'))
    await openHome()

    await fillTransactionForm({ digits: '1000', tag: 'Mercado', description: 'Pão' })
    await submit('Lançar')

    const alert = await screen.findByRole('alert')
    expect(alert.textContent).toBe('Não foi possível salvar o lançamento. Tente de novo.')
    expect(descriptionInput().value).toBe('Pão')
    await expectSubmitEnabled('Lançar', true)

    await submit('Lançar')
    expect(await screen.findByText('Lançamento salvo')).toBeDefined()
    await waitFor(() => expect(screen.queryByRole('alert')).toBeNull())
  })

  it('tag excluída em outra aba → mensagem específica', async () => {
    await createTag({ name: 'Mercado', color: '#16A34A' })
    createTransaction.mockRejectedValueOnce(
      new transactionsRepository.TransactionTagNotFoundError('tag-x'),
    )
    await openHome()
    await fillTransactionForm({ digits: '1000', tag: 'Mercado', description: 'Pão' })
    await submit('Lançar')
    expect((await screen.findByRole('alert')).textContent).toBe(
      'A tag escolhida não existe mais. Escolha outra.',
    )
  })
})

// CA-02.2 — app aberto de um dia para o outro: a data acompanha o novo "hoje".
describe('formulário de lançamento — virada do dia (CA-02.2)', () => {
  function becomeVisibleAt(date: Date) {
    vi.setSystemTime(date)
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'))
    })
  }

  it('sem o usuário mexer na data, ela passa para o novo dia ao voltar a ficar visível', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 9, 20, 23, 50))
    await openHome()
    expect(dateInput().value).toBe('2026-10-20')

    becomeVisibleAt(new Date(2026, 9, 21, 8, 0))
    await waitFor(() => expect(dateInput().value).toBe('2026-10-21'))
    expect(screen.getByRole('heading', { name: 'Saldo de outubro de 2026' })).toBeDefined()

    becomeVisibleAt(new Date(2026, 10, 1, 8, 0))
    await waitFor(() => expect(dateInput().value).toBe('2026-11-01'))
    expect(screen.getByRole('heading', { name: 'Saldo de novembro de 2026' })).toBeDefined()
  })

  it('uma data escolhida pelo usuário não é trocada', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 9, 20, 23, 50))
    await openHome()
    chooseDate('2026-10-15')

    becomeVisibleAt(new Date(2026, 9, 21, 8, 0))
    await waitFor(() =>
      expect(screen.getByRole('heading', { name: 'Saldo de outubro de 2026' })).toBeDefined(),
    )
    expect(dateInput().value).toBe('2026-10-15')
  })
})
