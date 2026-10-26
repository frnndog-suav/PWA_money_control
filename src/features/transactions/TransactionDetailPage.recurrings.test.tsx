import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Transaction } from '@/domain/types'
import {
  confirmOccurrence,
  listPendingOccurrences,
  listRecurrings,
} from '@/repositories/recurringsRepository'
import { getTransaction } from '@/repositories/transactionsRepository'
import { freezeToday, openDialog, seedLightBill } from '@/test/recurrings'
import { renderApp } from '@/test/renderApp'
import { dateInput, submitButton } from '@/test/transactionForm'

// RF-07 / D-51 — lançamento confirmado de um recorrente na edição (Fase 9).

beforeEach(() => freezeToday())
afterEach(() => vi.useRealTimers())

async function seedConfirmed(): Promise<Transaction> {
  const { tag, light } = await seedLightBill()
  return confirmOccurrence(light.id, '2026-11', {
    amountCents: 18740,
    date: '2026-11-17',
    tagId: tag.id,
    description: 'Conta de luz',
  })
}

async function openEdit(transaction: Transaction) {
  const router = renderApp(['/lancamentos', `/lancamentos/${transaction.id}`])
  await screen.findByRole('heading', { level: 1, name: 'Lançamento' })
  await waitFor(() => expect(dateInput().value).toBe(transaction.date))
  return router
}

async function pendingNovember() {
  return (await listPendingOccurrences(['2026-11'])).get('2026-11') ?? []
}

describe('Edição do lançamento confirmado (D-51 / CA-07.8)', () => {
  it('a data fica no mês da ocorrência: ajuda visível, erro fora do mês e "Salvar" desabilitado', async () => {
    const transaction = await seedConfirmed()
    await openEdit(transaction)
    expect(screen.getByText('Escolha um dia de novembro de 2026.')).toBeTruthy()

    fireEvent.change(dateInput(), { target: { value: '2026-12-01' } })
    expect(await screen.findByText('A data precisa estar em novembro de 2026.')).toBeTruthy()
    expect(submitButton('Salvar').disabled).toBe(true)

    fireEvent.change(dateInput(), { target: { value: '2026-11-30' } })
    await waitFor(() => expect(submitButton('Salvar').disabled).toBe(false))
    fireEvent.click(submitButton('Salvar'))
    await waitFor(async () =>
      expect((await getTransaction(transaction.id))?.date).toBe('2026-11-30'),
    )
  })
})

describe('Tipo do lançamento confirmado (D-51)', () => {
  it('Saída/Entrada ficam desabilitados e a razão aparece escrita', async () => {
    const transaction = await seedConfirmed()
    await openEdit(transaction)

    const expense = screen.getByRole<HTMLInputElement>('radio', { name: 'Saída' })
    const income = screen.getByRole<HTMLInputElement>('radio', { name: 'Entrada' })
    expect(expense.checked).toBe(true)
    // O <fieldset disabled> desabilita as opções (o atributo de cada uma não muda).
    expect(expense.matches(':disabled')).toBe(true)
    expect(income.matches(':disabled')).toBe(true)
    expect(screen.getByText('O tipo segue o do recorrente e não pode ser trocado.')).toBeTruthy()
  })

  it('lançamento avulso continua com o tipo editável', async () => {
    const { tag } = await seedLightBill()
    const { createTransaction } = await import('@/repositories/transactionsRepository')
    const loose = await createTransaction({
      type: 'expense',
      amountCents: 100,
      date: '2026-10-20',
      tagId: tag.id,
      description: 'Avulso',
    })
    await openEdit(loose)
    expect(screen.getByRole('radio', { name: 'Entrada' }).matches(':disabled')).toBe(false)
    expect(screen.queryByText('O tipo segue o do recorrente e não pode ser trocado.')).toBeNull()
  })
})

describe('Excluir lançamento confirmado (RF-07)', () => {
  it('"voltar a pendente": o lançamento some e a ocorrência volta', async () => {
    const transaction = await seedConfirmed()
    await openEdit(transaction)

    fireEvent.click(screen.getByRole('button', { name: 'Excluir' }))
    const dialog = await openDialog('Excluir lançamento?')
    expect(within(dialog).getByText(/confirmou o recorrente em novembro de 2026/)).toBeTruthy()
    fireEvent.click(within(dialog).getByRole('button', { name: 'Excluir e voltar a pendente' }))

    await waitFor(async () => expect(await getTransaction(transaction.id)).toBeUndefined())
    expect(await pendingNovember()).toHaveLength(1)
  })

  it('"pular este mês": o lançamento some e o mês fica pulado', async () => {
    const transaction = await seedConfirmed()
    await openEdit(transaction)

    fireEvent.click(screen.getByRole('button', { name: 'Excluir' }))
    const dialog = await openDialog('Excluir lançamento?')
    fireEvent.click(within(dialog).getByRole('button', { name: 'Excluir e pular este mês' }))

    await waitFor(async () => expect(await getTransaction(transaction.id)).toBeUndefined())
    expect(await pendingNovember()).toEqual([])
    expect((await listRecurrings())[0].skippedPeriods).toEqual(['2026-11'])
  })
})
