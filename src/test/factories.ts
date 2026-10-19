import type { Transaction } from '@/domain/types'

let sequence = 0

/** Lançamento válido para testes; sobrescreva só os campos que importam no caso. */
export function makeTransaction(overrides: Partial<Transaction> = {}): Transaction {
  sequence += 1
  return {
    id: `transaction-${sequence}`,
    type: 'expense',
    amountCents: 1000,
    date: '2026-10-19',
    description: 'Lançamento de teste',
    tagId: 'tag-1',
    recurringId: null,
    recurringPeriod: null,
    installmentGroupId: null,
    installmentNumber: null,
    createdAt: '2026-10-19T12:00:00.000Z',
    updatedAt: '2026-10-19T12:00:00.000Z',
    ...overrides,
  }
}

export const income = (amountCents: number, date: string, tagId = 'tag-1'): Transaction =>
  makeTransaction({ type: 'income', amountCents, date, tagId })

export const expense = (amountCents: number, date: string, tagId = 'tag-1'): Transaction =>
  makeTransaction({ type: 'expense', amountCents, date, tagId })
