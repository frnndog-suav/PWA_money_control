import { describe, expect, it } from 'vitest'
import { addMonthsClamped, periodOf } from '@/domain/dates'
import { buildSampleData, SAMPLE_TRANSACTION_COUNT } from '@/dev/sampleData/buildSampleData'

const TODAY = '2026-10-19'
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/
const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/

describe('buildSampleData (§6.11)', () => {
  const data = buildSampleData(TODAY)

  it('gera 12 tags, 5.000 lançamentos, 4 recorrentes e 3 parcelamentos', () => {
    expect(data.tags).toHaveLength(12)
    expect(data.transactions).toHaveLength(SAMPLE_TRANSACTION_COUNT)
    expect(data.recurrings).toHaveLength(4)
    expect(data.installmentGroups).toHaveLength(3)
  })

  it('é determinístico para a mesma semente e a mesma data', () => {
    expect(buildSampleData(TODAY)).toEqual(data)
    expect(buildSampleData(TODAY, 1).transactions[0]).not.toEqual(data.transactions[0])
  })

  it('usa UUIDs v4 únicos', () => {
    const ids = [
      ...data.tags,
      ...data.transactions,
      ...data.recurrings,
      ...data.installmentGroups,
    ].map((record) => record.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(ids.every((id) => UUID_V4.test(id))).toBe(true)
  })

  // RF-03 — nameKey normalizado e único.
  it('tags com nameKey único, sem acentos, e cor #RRGGBB', () => {
    const keys = data.tags.map((tag) => tag.nameKey)
    expect(new Set(keys).size).toBe(12)
    expect(data.tags.find((tag) => tag.name === 'Saúde')?.nameKey).toBe('saude')
    expect(data.tags.every((tag) => /^#[0-9A-F]{6}$/i.test(tag.color))).toBe(true)
  })

  // Princípios 1 e 2 / RF-01 — centavos inteiros > 0, datas YYYY-MM-DD, tag existente.
  it('lançamentos válidos, cobrindo 3 anos', () => {
    const tagIds = new Set(data.tags.map((tag) => tag.id))
    for (const transaction of data.transactions) {
      expect(Number.isSafeInteger(transaction.amountCents)).toBe(true)
      expect(transaction.amountCents).toBeGreaterThan(0)
      expect(transaction.date).toMatch(DATE_PATTERN)
      expect(tagIds.has(transaction.tagId)).toBe(true)
      expect(transaction.description.length).toBeGreaterThan(0)
    }
    const dates = data.transactions.map((transaction) => transaction.date).sort()
    expect(dates[0] >= addMonthsClamped(TODAY, -36)).toBe(true)
  })

  // RF-07 — ocorrências coerentes com o recorrente.
  it('ocorrências de recorrentes coerentes', () => {
    const byId = new Map(data.recurrings.map((recurring) => [recurring.id, recurring]))
    const occurrences = data.transactions.filter((transaction) => transaction.recurringId)
    expect(occurrences.length).toBeGreaterThan(0)

    for (const occurrence of occurrences) {
      const recurring = byId.get(occurrence.recurringId ?? '')
      expect(recurring).toBeDefined()
      if (!recurring) continue
      expect(occurrence.recurringPeriod).toBe(periodOf(occurrence.date))
      const period = occurrence.recurringPeriod ?? ''
      expect(period >= recurring.startPeriod).toBe(true)
      expect(recurring.endPeriod === null || period <= recurring.endPeriod).toBe(true)
      expect(recurring.skippedPeriods).not.toContain(period)
      expect(occurrence.type).toBe(recurring.type)
      expect(occurrence.tagId).toBe(recurring.tagId)
      expect(occurrence.date < TODAY.slice(0, 7)).toBe(true) // mês atual fica pendente
      expect(occurrence.installmentGroupId).toBeNull()
    }

    for (const recurring of data.recurrings) {
      expect(recurring.amounts[0].fromPeriod).toBe(recurring.startPeriod)
      const periods = recurring.amounts.map((amount) => amount.fromPeriod)
      expect(periods).toEqual([...periods].sort())
    }
    const ids = occurrences.map((o) => `${o.recurringId}|${o.recurringPeriod}`)
    expect(new Set(ids).size).toBe(ids.length)
  })

  // RF-08 / D-06 — parcelas com addMonthsClamped, resto na 1ª, soma igual ao total.
  it('parcelas coerentes com o parcelamento', () => {
    for (const group of data.installmentGroups) {
      const installments = data.transactions
        .filter((transaction) => transaction.installmentGroupId === group.id)
        .sort((a, b) => (a.installmentNumber ?? 0) - (b.installmentNumber ?? 0))

      expect(installments).toHaveLength(group.count)
      expect(installments.reduce((sum, item) => sum + item.amountCents, 0)).toBe(group.totalCents)
      installments.forEach((installment, index) => {
        expect(installment.installmentNumber).toBe(index + 1)
        expect(installment.date).toBe(addMonthsClamped(group.firstDate, index))
        expect(installment.type).toBe('expense')
        expect(installment.description).toBe(group.description)
        expect(installment.recurringId).toBeNull()
      })
    }

    const notebook = data.installmentGroups.find((group) => group.description === 'Notebook')
    expect(notebook?.firstDate).toBe('2026-01-31')
    const notebookDates = data.transactions
      .filter((transaction) => transaction.installmentGroupId === notebook?.id)
      .map((transaction) => transaction.date)
    expect(notebookDates).toContain('2026-02-28')
    expect(notebookDates).toContain('2026-04-30')

    const fridge = data.installmentGroups.find((group) => group.description === 'Geladeira')
    const firstFridge = data.transactions.find(
      (t) => t.installmentGroupId === fridge?.id && t.installmentNumber === 1,
    )
    expect(firstFridge?.amountCents).toBe(39008)
  })
})
