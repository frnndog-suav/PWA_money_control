import { describe, expect, it } from 'vitest'
import { signedAmount, totals } from '@/domain/balances'
import { MAX_AMOUNT_CENTS } from '@/domain/money'
import { expense, income } from '@/test/factories'

// CA-02.1 — entradas positivas, saídas negativas; o sinal é o que a tela usa para cor e "+/−".
describe('signedAmount (CA-02.1)', () => {
  it.each([
    [income(12000, '2026-10-20'), 12000],
    [expense(4590, '2026-10-20'), -4590],
    [income(1, '2026-10-20'), 1],
    [expense(1, '2026-10-20'), -1],
    [income(MAX_AMOUNT_CENTS, '2026-10-20'), MAX_AMOUNT_CENTS],
    [expense(MAX_AMOUNT_CENTS, '2026-10-20'), -MAX_AMOUNT_CENTS],
  ])('%#: valor com sinal %d', (transaction, expected) => {
    expect(signedAmount(transaction)).toBe(expected)
    expect(Number.isSafeInteger(signedAmount(transaction))).toBe(true)
  })

  it('a soma dos valores com sinal é o resultado de totals', () => {
    const list = [
      income(100000, '2026-10-20'),
      expense(25000, '2026-10-20'),
      expense(1, '2026-10-21'),
    ]
    const sum = list.reduce((acc, transaction) => acc + signedAmount(transaction), 0)
    expect(sum).toBe(totals(list).resultCents)
    expect(sum).toBe(74999)
  })
})
