import { describe, expect, it } from 'vitest'
import {
  countActiveFilters,
  countVisibleDays,
  effectivePeriod,
  EMPTY_TRANSACTION_FILTERS,
  filterTransactions,
  hasActiveFilters,
  isPeriodInverted,
  summarizeTransactionList,
  type DayGroup,
  type TransactionFilters,
} from '@/domain/transactionFilters'
import { sortByRecency } from '@/domain/transactions'
import type { Transaction } from '@/domain/types'
import { makeTransaction } from '@/test/factories'

const filters = (overrides: Partial<TransactionFilters> = {}): TransactionFilters => ({
  ...EMPTY_TRANSACTION_FILTERS,
  ...overrides,
})

const descriptions = (transactions: readonly Transaction[]) =>
  transactions.map((transaction) => transaction.description)

// Lista fixa usada nos casos de um filtro só.
const SAMPLE: Transaction[] = [
  makeTransaction({ description: 'Mercado', type: 'expense', tagId: 'market', date: '2026-10-20' }),
  makeTransaction({
    description: 'mercado do bairro',
    type: 'expense',
    tagId: 'market',
    date: '2026-10-18',
  }),
  makeTransaction({ description: 'Salário', type: 'income', tagId: 'salary', date: '2026-10-05' }),
  makeTransaction({
    description: 'Farmácia',
    type: 'expense',
    tagId: 'health',
    date: '2026-09-30',
  }),
  makeTransaction({
    description: 'Reembolso do MERCADO',
    type: 'income',
    tagId: 'market',
    date: '2026-11-02',
  }),
]

describe('filtro por texto (RF-04 / CA-04.2)', () => {
  // Roteiro da Fase 5, item 2.
  it('"merc" encontra "Mercado" e "mercado do bairro" (contém, sem diferenciar maiúsculas)', () => {
    expect(descriptions(filterTransactions(SAMPLE, filters({ text: 'merc' })))).toEqual([
      'Mercado',
      'mercado do bairro',
      'Reembolso do MERCADO',
    ])
  })

  it('ignora acentos na busca e na descrição (inclusive NFD)', () => {
    expect(descriptions(filterTransactions(SAMPLE, filters({ text: 'FARMACIA' })))).toEqual([
      'Farmácia',
    ])
    expect(descriptions(filterTransactions(SAMPLE, filters({ text: 'sálario' })))).toEqual([
      'Salário',
    ])
    const nfd = [makeTransaction({ description: 'Pão francês'.normalize('NFD') })]
    expect(filterTransactions(nfd, filters({ text: 'pao fran' }))).toHaveLength(1)
    expect(filterTransactions(nfd, filters({ text: 'Pão'.normalize('NFC') }))).toHaveLength(1)
  })

  it('espaços nas pontas da busca não contam; só espaços = sem filtro de texto', () => {
    expect(filterTransactions(SAMPLE, filters({ text: '  merc  ' }))).toHaveLength(3)
    expect(filterTransactions(SAMPLE, filters({ text: '   ' }))).toHaveLength(SAMPLE.length)
  })

  it('texto que não aparece em nenhuma descrição → nenhum resultado', () => {
    expect(filterTransactions(SAMPLE, filters({ text: 'xyz' }))).toEqual([])
  })
})

describe('filtros de tipo, tag e período (RF-04 / CA-04.2)', () => {
  it('sem filtros devolve todos, na mesma ordem', () => {
    expect(filterTransactions(SAMPLE, EMPTY_TRANSACTION_FILTERS)).toEqual(SAMPLE)
  })

  it('tipo: entradas ou saídas', () => {
    expect(descriptions(filterTransactions(SAMPLE, filters({ type: 'income' })))).toEqual([
      'Salário',
      'Reembolso do MERCADO',
    ])
    expect(filterTransactions(SAMPLE, filters({ type: 'expense' }))).toHaveLength(3)
  })

  it('tag: só a escolhida', () => {
    expect(descriptions(filterTransactions(SAMPLE, filters({ tagId: 'health' })))).toEqual([
      'Farmácia',
    ])
  })

  it('período inclusivo nas duas pontas', () => {
    const period = filters({ from: '2026-10-05', to: '2026-10-20' })
    expect(descriptions(filterTransactions(SAMPLE, period))).toEqual([
      'Mercado',
      'mercado do bairro',
      'Salário',
    ])
  })

  it('só data inicial ou só data final', () => {
    expect(filterTransactions(SAMPLE, filters({ from: '2026-10-20' }))).toHaveLength(2)
    expect(descriptions(filterTransactions(SAMPLE, filters({ to: '2026-09-30' })))).toEqual([
      'Farmácia',
    ])
  })

  it('data inicial depois da final: o período não é aplicado', () => {
    const inverted = filters({ from: '2026-10-20', to: '2026-10-01' })
    expect(isPeriodInverted(inverted)).toBe(true)
    expect(effectivePeriod(inverted)).toEqual({ from: null, to: null })
    expect(filterTransactions(SAMPLE, inverted)).toEqual(SAMPLE)
    // Os outros filtros continuam valendo.
    expect(filterTransactions(SAMPLE, { ...inverted, type: 'income' })).toHaveLength(2)
  })

  it('mesma data inicial e final = só aquele dia', () => {
    const sameDay = filters({ from: '2026-10-18', to: '2026-10-18' })
    expect(isPeriodInverted(sameDay)).toBe(false)
    expect(effectivePeriod(sameDay)).toEqual({ from: '2026-10-18', to: '2026-10-18' })
    expect(descriptions(filterTransactions(SAMPLE, sameDay))).toEqual(['mercado do bairro'])
  })

  // Roteiro da Fase 5, item 3 — tag + período.
  it('combina tag, período, tipo e texto ao mesmo tempo', () => {
    const combined = filters({
      text: 'mercado',
      type: 'expense',
      tagId: 'market',
      from: '2026-10-19',
      to: '2026-10-31',
    })
    expect(descriptions(filterTransactions(SAMPLE, combined))).toEqual(['Mercado'])
  })
})

describe('todas as combinações de filtros (CA-04.2)', () => {
  // Referência ingênua, escrita de outro jeito, para comparar com o critério combinado.
  const fold = (value: string) => value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
  function reference(transactions: Transaction[], f: TransactionFilters): Transaction[] {
    let result = transactions
    if (f.text.trim())
      result = result.filter((t) => fold(t.description).includes(fold(f.text.trim())))
    if (f.type !== 'all') result = result.filter((t) => t.type === f.type)
    if (f.tagId) result = result.filter((t) => t.tagId === f.tagId)
    if (!(f.from && f.to && f.from > f.to)) {
      if (f.from) result = result.filter((t) => t.date >= (f.from as string))
      if (f.to) result = result.filter((t) => t.date <= (f.to as string))
    }
    return result
  }

  const words = ['Mercado', 'Padaria', 'Farmácia', 'Salário', 'Açougue', 'Posto']
  const data = Array.from({ length: 120 }, (_, index) =>
    makeTransaction({
      description: `${words[index % words.length]} ${index}`,
      type: index % 3 === 0 ? 'income' : 'expense',
      tagId: `tag-${index % 4}`,
      date: `2026-${String((index % 12) + 1).padStart(2, '0')}-${String((index % 28) + 1).padStart(2, '0')}`,
    }),
  )
  const values: Partial<TransactionFilters> = {
    text: 'acou',
    type: 'expense',
    tagId: 'tag-1',
    from: '2026-03-01',
    to: '2026-09-30',
  }
  const keys = Object.keys(values) as (keyof TransactionFilters)[]

  for (let mask = 0; mask < 2 ** keys.length; mask++) {
    const active = keys.filter((_, bit) => mask & (1 << bit))
    const combination = filters(Object.fromEntries(active.map((key) => [key, values[key]])))
    it(`[${active.join(' + ') || 'nenhum'}]`, () => {
      expect(filterTransactions(data, combination)).toEqual(reference(data, combination))
      expect(countActiveFilters(combination)).toBe(
        active.filter((key) => key !== 'to' || !active.includes('from')).length,
      )
    })
  }
})

describe('filtros ativos (CA-04.3 / CA-04.4)', () => {
  it('sem filtros → 0 e inativo', () => {
    expect(countActiveFilters(EMPTY_TRANSACTION_FILTERS)).toBe(0)
    expect(hasActiveFilters(EMPTY_TRANSACTION_FILTERS)).toBe(false)
    expect(hasActiveFilters(filters({ text: '   ' }))).toBe(false)
  })

  it('cada campo conta; o período conta uma vez, mesmo inválido', () => {
    expect(countActiveFilters(filters({ text: 'a' }))).toBe(1)
    expect(countActiveFilters(filters({ type: 'income' }))).toBe(1)
    expect(countActiveFilters(filters({ tagId: 'tag-1' }))).toBe(1)
    expect(countActiveFilters(filters({ to: '2026-10-01' }))).toBe(1)
    expect(countActiveFilters(filters({ from: '2026-10-20', to: '2026-10-01' }))).toBe(1)
    expect(
      countActiveFilters(
        filters({ text: 'a', type: 'expense', tagId: 't', from: '2026-01-01', to: '2026-12-31' }),
      ),
    ).toBe(4)
  })
})

describe('summarizeTransactionList (CA-04.1 / CA-04.3)', () => {
  const list = sortByRecency([
    makeTransaction({
      type: 'income',
      amountCents: 100000,
      date: '2026-10-20',
      description: 'Salário',
    }),
    makeTransaction({
      type: 'expense',
      amountCents: 2550,
      date: '2026-10-20',
      description: 'Mercado',
    }),
    makeTransaction({
      type: 'expense',
      amountCents: 1000,
      date: '2026-10-18',
      description: 'Padaria',
    }),
    makeTransaction({
      type: 'expense',
      amountCents: 4000,
      date: '2026-11-03',
      description: 'Mercado futuro',
    }),
    makeTransaction({ type: 'income', amountCents: 500, date: '2026-10-18', description: 'Pix' }),
  ])

  it('agrupa por dia do mais recente para o mais antigo, inclusive datas futuras', () => {
    const summary = summarizeTransactionList(list, EMPTY_TRANSACTION_FILTERS)
    expect(summary.days.map((day) => day.date)).toEqual(['2026-11-03', '2026-10-20', '2026-10-18'])
    expect(descriptions(summary.days[1].transactions).toSorted()).toEqual(['Mercado', 'Salário'])
  })

  it('totais de entrada e saída de cada dia', () => {
    const [future, day20, day18] = summarizeTransactionList(list, EMPTY_TRANSACTION_FILTERS).days
    expect(future).toMatchObject({ incomeCents: 0, expenseCents: 4000, resultCents: -4000 })
    expect(day20).toMatchObject({ incomeCents: 100000, expenseCents: 2550, resultCents: 97450 })
    expect(day18).toMatchObject({ incomeCents: 500, expenseCents: 1000, resultCents: -500 })
  })

  it('totais e quantidade do conjunto filtrado', () => {
    const summary = summarizeTransactionList(list, filters({ text: 'merc' }))
    expect(summary.count).toBe(2)
    expect(summary.totals).toEqual({ incomeCents: 0, expenseCents: 6550, resultCents: -6550 })
    expect(summary.days.map((day) => day.date)).toEqual(['2026-11-03', '2026-10-20'])

    const all = summarizeTransactionList(list, EMPTY_TRANSACTION_FILTERS)
    expect(all.count).toBe(5)
    expect(all.totals).toEqual({ incomeCents: 100500, expenseCents: 7550, resultCents: 92950 })
  })

  it('sem resultados → sem dias e totais zerados', () => {
    expect(summarizeTransactionList(list, filters({ text: 'nada' }))).toEqual({
      days: [],
      totals: { incomeCents: 0, expenseCents: 0, resultCents: 0 },
      count: 0,
    })
    expect(summarizeTransactionList([], EMPTY_TRANSACTION_FILTERS).count).toBe(0)
  })
})

describe('countVisibleDays (CA-04.6)', () => {
  const day = (date: string, size: number): DayGroup => ({
    date,
    incomeCents: 0,
    expenseCents: 0,
    resultCents: 0,
    transactions: Array.from({ length: size }, () => makeTransaction({ date })),
  })
  const days = [
    day('2026-10-05', 20),
    day('2026-10-04', 25),
    day('2026-10-03', 10),
    day('2026-10-02', 70),
    day('2026-10-01', 3),
  ]

  it('dias inteiros até alcançar a meta de itens', () => {
    expect(countVisibleDays(days, 50)).toEqual({ dayCount: 3, itemCount: 55 })
    expect(countVisibleDays(days, 45)).toEqual({ dayCount: 2, itemCount: 45 })
    expect(countVisibleDays(days, 1)).toEqual({ dayCount: 1, itemCount: 20 })
  })

  it('a próxima página (itemCount + página) sempre acrescenta ao menos um dia', () => {
    const first = countVisibleDays(days, 50)
    // O dia seguinte tem 70 itens, mais que uma página: entra inteiro.
    expect(countVisibleDays(days, first.itemCount + 50)).toEqual({ dayCount: 4, itemCount: 125 })
    expect(countVisibleDays(days, 125 + 50)).toEqual({ dayCount: 5, itemCount: 128 })
  })

  it('meta zero ou lista vazia', () => {
    expect(countVisibleDays(days, 0)).toEqual({ dayCount: 0, itemCount: 0 })
    expect(countVisibleDays([], 50)).toEqual({ dayCount: 0, itemCount: 0 })
  })
})
