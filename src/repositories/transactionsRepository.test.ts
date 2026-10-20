import { describe, expect, it } from 'vitest'
import { db } from '@/db/database'
import type { TransactionInput } from '@/domain/transactionSchema'
import { createTag, deleteTag } from '@/repositories/tagsRepository'
import {
  createTransaction,
  deleteTransaction,
  getMonthTotals,
  getOverallBalance,
  getTransaction,
  listRecentTransactions,
  TransactionNotFoundError,
  TransactionTagNotFoundError,
  updateTransaction,
} from '@/repositories/transactionsRepository'
import { makeTransaction } from '@/test/factories'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/

async function makeStoredTag(name = 'Mercado') {
  return createTag({ name, color: '#16A34A' })
}

function input(tagId: string, overrides: Partial<TransactionInput> = {}): TransactionInput {
  return {
    type: 'expense',
    amountCents: 25000,
    date: '2026-10-20',
    tagId,
    description: 'Compra do mês',
    ...overrides,
  }
}

describe('transactionsRepository — criar (RF-01 / CA-01.1)', () => {
  it('grava UUID, datas ISO, descrição sem espaços nas pontas e vínculos nulos', async () => {
    const tag = await makeStoredTag()
    const transaction = await createTransaction(input(tag.id, { description: '  Feira  ' }))

    expect(transaction.id).toMatch(UUID_PATTERN)
    expect(transaction).toMatchObject({
      type: 'expense',
      amountCents: 25000,
      date: '2026-10-20',
      tagId: tag.id,
      description: 'Feira',
      recurringId: null,
      recurringPeriod: null,
      installmentGroupId: null,
      installmentNumber: null,
    })
    expect(new Date(transaction.createdAt).toISOString()).toBe(transaction.createdAt)
    expect(transaction.updatedAt).toBe(transaction.createdAt)
    expect(await getTransaction(transaction.id)).toEqual(transaction)
  })

  it('valida a entrada (CA-01.2): nada é gravado com campo inválido', async () => {
    const tag = await makeStoredTag()
    await expect(createTransaction(input(tag.id, { amountCents: 0 }))).rejects.toThrow()
    await expect(createTransaction(input(tag.id, { description: '  ' }))).rejects.toThrow()
    await expect(createTransaction(input(tag.id, { date: '2026-02-30' }))).rejects.toThrow()
    expect(await db.transactions.count()).toBe(0)
  })

  // D-01 — exatamente uma tag existente.
  it('tag inexistente → TransactionTagNotFoundError', async () => {
    const error = await createTransaction(input('nao-existe')).catch((e: unknown) => e)
    expect(error).toBeInstanceOf(TransactionTagNotFoundError)
    expect((error as Error).name).toBe('TransactionTagNotFoundError')
    expect(await db.transactions.count()).toBe(0)
  })
})

describe('transactionsRepository — editar e excluir (CA-01.5 / CA-01.6)', () => {
  it('altera os campos, mantém id/createdAt/vínculos e atualiza updatedAt', async () => {
    const tag = await makeStoredTag()
    const other = await makeStoredTag('Salário')
    const stored = makeTransaction({
      tagId: tag.id,
      recurringId: 'recurring-1',
      recurringPeriod: '2026-10',
      updatedAt: '2026-01-01T00:00:00.000Z',
    })
    await db.transactions.add(stored)

    const updated = await updateTransaction(
      stored.id,
      input(other.id, { type: 'income', amountCents: 100000, description: ' Salário ' }),
    )

    expect(updated).toMatchObject({
      id: stored.id,
      type: 'income',
      amountCents: 100000,
      tagId: other.id,
      description: 'Salário',
      recurringId: 'recurring-1',
      recurringPeriod: '2026-10',
      createdAt: stored.createdAt,
    })
    expect(updated.updatedAt > stored.updatedAt).toBe(true)
    expect(await getTransaction(stored.id)).toEqual(updated)
  })

  it('lançamento inexistente → TransactionNotFoundError', async () => {
    const tag = await makeStoredTag()
    const error = await updateTransaction('nao-existe', input(tag.id)).catch((e: unknown) => e)
    expect(error).toBeInstanceOf(TransactionNotFoundError)
    expect((error as Error).name).toBe('TransactionNotFoundError')
  })

  it('editar para uma tag inexistente → TransactionTagNotFoundError, sem alterar', async () => {
    const tag = await makeStoredTag()
    const transaction = await createTransaction(input(tag.id))
    await expect(updateTransaction(transaction.id, input('nao-existe'))).rejects.toBeInstanceOf(
      TransactionTagNotFoundError,
    )
    expect(await getTransaction(transaction.id)).toEqual(transaction)
  })

  it('exclui', async () => {
    const tag = await makeStoredTag()
    const transaction = await createTransaction(input(tag.id))
    await deleteTransaction(transaction.id)
    expect(await getTransaction(transaction.id)).toBeUndefined()
  })
})

describe('transactionsRepository — saldos (RF-02 / D-03 / CA-02.3)', () => {
  const TODAY = '2026-10-20'

  // Roteiro da Fase 4: +1.000,00 e −250,00 hoje, −80,00 amanhã; mais +500,00 no mês
  // passado e −40,00 no mês que vem.
  async function seedRoteiro() {
    await db.transactions.bulkAdd([
      makeTransaction({ type: 'income', amountCents: 100000, date: TODAY }),
      makeTransaction({ type: 'expense', amountCents: 25000, date: TODAY }),
      makeTransaction({ type: 'expense', amountCents: 8000, date: '2026-10-21' }),
      makeTransaction({ type: 'income', amountCents: 50000, date: '2026-09-30' }),
      makeTransaction({ type: 'expense', amountCents: 4000, date: '2026-11-01' }),
    ])
  }

  it('saldo geral só considera datas até hoje (inclusive)', async () => {
    await seedRoteiro()
    expect(await getOverallBalance(TODAY)).toBe(100000 - 25000 + 50000)
  })

  it('saldo do mês inclui as datas futuras do mês e exclui outros meses', async () => {
    await seedRoteiro()
    expect(await getMonthTotals('2026-10')).toEqual({
      incomeCents: 100000,
      expenseCents: 33000,
      resultCents: 67000,
    })
  })

  it('sem lançamentos → zero', async () => {
    expect(await getOverallBalance(TODAY)).toBe(0)
    expect(await getMonthTotals('2026-10')).toEqual({
      incomeCents: 0,
      expenseCents: 0,
      resultCents: 0,
    })
  })

  it('o 1º e o último dia do mês entram no saldo do mês', async () => {
    await db.transactions.bulkAdd([
      makeTransaction({ type: 'income', amountCents: 100, date: '2026-10-01' }),
      makeTransaction({ type: 'income', amountCents: 200, date: '2026-10-31' }),
    ])
    expect((await getMonthTotals('2026-10')).resultCents).toBe(300)
  })
})

describe('transactionsRepository — últimos lançamentos (RF-02 item 5)', () => {
  it('os 5 mais recentes por data e, no mesmo dia, por criação', async () => {
    const at = (hour: number) => `2026-10-20T${String(hour).padStart(2, '0')}:00:00.000Z`
    await db.transactions.bulkAdd([
      makeTransaction({ description: 'antigo', date: '2026-09-01' }),
      makeTransaction({ description: 'd18', date: '2026-10-18' }),
      makeTransaction({ description: 'd19', date: '2026-10-19' }),
      makeTransaction({ description: 'd20-a', date: '2026-10-20', createdAt: at(8) }),
      makeTransaction({ description: 'd20-b', date: '2026-10-20', createdAt: at(9) }),
      makeTransaction({ description: 'd20-c', date: '2026-10-20', createdAt: at(10) }),
      makeTransaction({ description: 'd17', date: '2026-10-17' }),
    ])

    const recent = await listRecentTransactions(5)
    expect(recent.map((t) => t.description)).toEqual(['d20-c', 'd20-b', 'd20-a', 'd19', 'd18'])
  })

  // O índice só ordena por data: o desempate por criação vale também no dia de corte.
  it('no dia de corte, escolhe os criados por último', async () => {
    const at = (minute: number) => `2026-10-10T12:${String(minute).padStart(2, '0')}:00.000Z`
    await db.transactions.bulkAdd(
      [5, 1, 4, 2, 3, 6, 0].map((minute) =>
        makeTransaction({ description: `m${minute}`, date: '2026-10-10', createdAt: at(minute) }),
      ),
    )
    const recent = await listRecentTransactions(5)
    expect(recent.map((t) => t.description)).toEqual(['m6', 'm5', 'm4', 'm3', 'm2'])
  })

  it('menos de 5 lançamentos → todos, em ordem', async () => {
    await db.transactions.bulkAdd([
      makeTransaction({ description: 'a', date: '2026-10-01' }),
      makeTransaction({ description: 'b', date: '2026-10-02' }),
    ])
    expect((await listRecentTransactions(5)).map((t) => t.description)).toEqual(['b', 'a'])
  })
})

// CA-03.2 — completo: um lançamento real bloqueia a exclusão da tag.
describe('CA-03.2 com lançamentos do repositório', () => {
  it('tag usada por um lançamento não pode ser excluída; sem uso, pode', async () => {
    const tag = await makeStoredTag()
    const transaction = await createTransaction(input(tag.id))

    expect(await deleteTag(tag.id)).toEqual({
      status: 'in-use',
      usage: { transactions: 1, recurrings: 0, installmentGroups: 0 },
    })
    expect(await db.tags.get(tag.id)).toBeDefined()

    await deleteTransaction(transaction.id)
    expect(await deleteTag(tag.id)).toEqual({ status: 'deleted' })
  })
})
