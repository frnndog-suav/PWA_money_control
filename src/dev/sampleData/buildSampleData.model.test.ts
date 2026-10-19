import { describe, expect, it } from 'vitest'
import { periodOf } from '@/domain/dates'
import { MAX_AMOUNT_CENTS } from '@/domain/money'
import { buildSampleData } from '@/dev/sampleData/buildSampleData'

// §6.3 / §2 — os dados de exemplo respeitam o modelo de dados e os princípios: centavos
// inteiros dentro do teto do RF-01, datas reais `YYYY-MM-DD`, períodos `YYYY-MM`,
// timestamps ISO 8601, descrição de 1 a 100 caracteres (D-10), parcelas de 2 a 48 (RF-08).

const ISO_8601 = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/
const PERIOD = /^\d{4}-(0[1-9]|1[0-2])$/

// Inclui uma data de referência em 29/02 e outra no início do ano.
describe.each(['2026-10-19', '2028-02-29', '2027-01-01'])('buildSampleData(%s) — §6.3', (today) => {
  const data = buildSampleData(today)

  it('lançamentos dentro do modelo e nenhum com data futura além das parcelas', () => {
    for (const transaction of data.transactions) {
      expect(Number.isSafeInteger(transaction.amountCents)).toBe(true)
      expect(transaction.amountCents).toBeGreaterThan(0)
      expect(transaction.amountCents).toBeLessThanOrEqual(MAX_AMOUNT_CENTS)
      expect(() => periodOf(transaction.date)).not.toThrow() // data real YYYY-MM-DD
      expect(['income', 'expense']).toContain(transaction.type)
      const description = transaction.description.trim()
      expect(description.length).toBeGreaterThanOrEqual(1)
      expect(description.length).toBeLessThanOrEqual(100)
      expect(transaction.createdAt).toMatch(ISO_8601)
      expect(transaction.updatedAt).toMatch(ISO_8601)
      // Vínculos coerentes: ou recorrente, ou parcela, ou avulso.
      expect(transaction.recurringId === null).toBe(transaction.recurringPeriod === null)
      expect(transaction.installmentGroupId === null).toBe(transaction.installmentNumber === null)
      expect(transaction.recurringId !== null && transaction.installmentGroupId !== null).toBe(
        false,
      )
      if (transaction.date > today) expect(transaction.installmentGroupId).not.toBeNull()
    }
  })

  it('recorrentes e parcelamentos dentro do modelo', () => {
    for (const recurring of data.recurrings) {
      expect(recurring.startPeriod).toMatch(PERIOD)
      if (recurring.endPeriod !== null) {
        expect(recurring.endPeriod).toMatch(PERIOD)
        expect(recurring.endPeriod >= recurring.startPeriod).toBe(true)
      }
      for (const amount of recurring.amounts) {
        expect(amount.fromPeriod).toMatch(PERIOD)
        expect(Number.isSafeInteger(amount.amountCents)).toBe(true)
        expect(amount.amountCents).toBeGreaterThan(0)
      }
      recurring.skippedPeriods.forEach((period) => expect(period).toMatch(PERIOD))
      expect(recurring.createdAt).toMatch(ISO_8601)
    }
    for (const group of data.installmentGroups) {
      expect(group.count).toBeGreaterThanOrEqual(2)
      expect(group.count).toBeLessThanOrEqual(48)
      expect(Number.isSafeInteger(group.totalCents)).toBe(true)
      expect(() => periodOf(group.firstDate)).not.toThrow()
      expect(group.createdAt).toMatch(ISO_8601)
    }
  })

  it('tags com nameKey normalizado (minúsculas, sem acentos, sem espaços nas pontas)', () => {
    for (const tag of data.tags) {
      expect(tag.nameKey).toBe(
        tag.name
          .trim()
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, ''),
      )
      expect(tag.color).toMatch(/^#[0-9A-Fa-f]{6}$/)
      expect(tag.createdAt).toMatch(ISO_8601)
    }
  })
})
