import { toTagNameKey } from '@/domain/tags'
import type { InstallmentGroup, Recurring, Tag, Transaction } from '@/domain/types'

let sequence = 0

function nextId(prefix: string): string {
  sequence += 1
  return `${prefix}-${sequence}`
}

const TIMESTAMP = '2026-10-19T12:00:00.000Z'

/**
 * Tag válida para testes; sobrescreva só os campos que importam no caso. Sem `nameKey`
 * explícito, ele é derivado do nome (§6.3), como no repositório.
 */
export function makeTag(overrides: Partial<Tag> = {}): Tag {
  const id = nextId('tag')
  const name = overrides.name ?? `Tag ${id}`
  return {
    id,
    name,
    nameKey: toTagNameKey(name),
    color: '#16A34A',
    createdAt: TIMESTAMP,
    updatedAt: TIMESTAMP,
    ...overrides,
  }
}

/** Lançamento válido para testes; sobrescreva só os campos que importam no caso. */
export function makeTransaction(overrides: Partial<Transaction> = {}): Transaction {
  return {
    id: nextId('transaction'),
    type: 'expense',
    amountCents: 1000,
    date: '2026-10-19',
    description: 'Lançamento de teste',
    tagId: 'tag-1',
    recurringId: null,
    recurringPeriod: null,
    installmentGroupId: null,
    installmentNumber: null,
    createdAt: TIMESTAMP,
    updatedAt: TIMESTAMP,
    ...overrides,
  }
}

/** Recorrente válido para testes. */
export function makeRecurring(overrides: Partial<Recurring> = {}): Recurring {
  return {
    id: nextId('recurring'),
    type: 'expense',
    description: 'Recorrente de teste',
    tagId: 'tag-1',
    startPeriod: '2026-01',
    endPeriod: null,
    amounts: [{ fromPeriod: '2026-01', amountCents: 5000 }],
    skippedPeriods: [],
    createdAt: TIMESTAMP,
    updatedAt: TIMESTAMP,
    ...overrides,
  }
}

/** Parcelamento válido para testes. */
export function makeInstallmentGroup(overrides: Partial<InstallmentGroup> = {}): InstallmentGroup {
  return {
    id: nextId('installment-group'),
    description: 'Parcelamento de teste',
    tagId: 'tag-1',
    totalCents: 30000,
    count: 3,
    firstDate: '2026-10-19',
    createdAt: TIMESTAMP,
    ...overrides,
  }
}

export const income = (amountCents: number, date: string, tagId = 'tag-1'): Transaction =>
  makeTransaction({ type: 'income', amountCents, date, tagId })

export const expense = (amountCents: number, date: string, tagId = 'tag-1'): Transaction =>
  makeTransaction({ type: 'expense', amountCents, date, tagId })
