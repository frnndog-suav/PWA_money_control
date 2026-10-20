import { describe, expect, it } from 'vitest'
import { formatTagUsage, formatTransactionCount } from '@/features/tags/tagTexts'

describe('formatTransactionCount (CA-03.5)', () => {
  it.each([
    [0, 'Nenhum lançamento'],
    [1, '1 lançamento'],
    [2, '2 lançamentos'],
    [5000, '5.000 lançamentos'],
  ])('%i → %s', (count, expected) => {
    expect(formatTransactionCount(count)).toBe(expected)
  })
})

describe('formatTagUsage (CA-03.2)', () => {
  it.each([
    [{ transactions: 3, recurrings: 0, installmentGroups: 0 }, '3 lançamentos'],
    [{ transactions: 1, recurrings: 1, installmentGroups: 0 }, '1 lançamento e 1 recorrente'],
    [
      { transactions: 3, recurrings: 2, installmentGroups: 1 },
      '3 lançamentos, 2 recorrentes e 1 parcelamento',
    ],
    [{ transactions: 0, recurrings: 0, installmentGroups: 4 }, '4 parcelamentos'],
  ])('%o → %s', (usage, expected) => {
    expect(formatTagUsage(usage)).toBe(expected)
  })
})

// Auditoria da Fase 3 — singular/plural e números em pt-BR (princípio 4).
describe('formatTransactionCount — números em pt-BR (CA-03.5)', () => {
  it.each([
    [10, '10 lançamentos'],
    [999, '999 lançamentos'],
    [1000, '1.000 lançamentos'],
    [10000, '10.000 lançamentos'],
    [1234567, '1.234.567 lançamentos'],
  ])('%i → %s', (count, expected) => {
    expect(formatTransactionCount(count)).toBe(expected)
  })
})

describe('formatTagUsage — singular, plural e combinações (CA-03.2)', () => {
  it.each([
    [{ transactions: 1, recurrings: 0, installmentGroups: 0 }, '1 lançamento'],
    [{ transactions: 2, recurrings: 0, installmentGroups: 0 }, '2 lançamentos'],
    [{ transactions: 0, recurrings: 1, installmentGroups: 0 }, '1 recorrente'],
    [{ transactions: 0, recurrings: 2, installmentGroups: 0 }, '2 recorrentes'],
    [{ transactions: 0, recurrings: 0, installmentGroups: 1 }, '1 parcelamento'],
    [{ transactions: 0, recurrings: 0, installmentGroups: 2 }, '2 parcelamentos'],
    [{ transactions: 2, recurrings: 0, installmentGroups: 1 }, '2 lançamentos e 1 parcelamento'],
    [{ transactions: 0, recurrings: 1, installmentGroups: 1 }, '1 recorrente e 1 parcelamento'],
    [
      { transactions: 1, recurrings: 1, installmentGroups: 1 },
      '1 lançamento, 1 recorrente e 1 parcelamento',
    ],
    [
      { transactions: 5000, recurrings: 2, installmentGroups: 3 },
      '5.000 lançamentos, 2 recorrentes e 3 parcelamentos',
    ],
    [
      { transactions: 1000, recurrings: 1000, installmentGroups: 1000 },
      '1.000 lançamentos, 1.000 recorrentes e 1.000 parcelamentos',
    ],
  ])('%o → %s', (usage, expected) => {
    expect(formatTagUsage(usage)).toBe(expected)
  })
})
