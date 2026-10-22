import { afterEach, describe, expect, it, vi } from 'vitest'
import { totals } from '@/domain/balances'
import { addCents, MAX_AMOUNT_CENTS } from '@/domain/money'
import {
  countVisibleDays,
  effectivePeriod,
  EMPTY_TRANSACTION_FILTERS,
  filterTransactions,
  isPeriodInverted,
  summarizeTransactionList,
  type DayGroup,
  type TransactionFilters,
} from '@/domain/transactionFilters'
import { compareByRecency, sortByRecency } from '@/domain/transactions'
import type { Transaction } from '@/domain/types'
import { makeTransaction } from '@/test/factories'
import { createTestRandom, daysInMonth, toDateString } from '@/test/propertyHelpers'

// Auditoria da Fase 5 — RF-04 (CA-04.1, CA-04.2, CA-04.3, CA-04.6), D-44 (b), (c) e (d).

const filters = (overrides: Partial<TransactionFilters> = {}): TransactionFilters => ({
  ...EMPTY_TRANSACTION_FILTERS,
  ...overrides,
})

const descriptions = (list: readonly Transaction[]) => list.map((t) => t.description)

afterEach(() => {
  vi.useRealTimers()
})

describe('período: virada de ano e lançamentos futuros (CA-04.2)', () => {
  const list = [
    makeTransaction({ description: 'dez-30', date: '2026-12-30' }),
    makeTransaction({ description: 'dez-31', date: '2026-12-31' }),
    makeTransaction({ description: 'jan-01', date: '2027-01-01' }),
    makeTransaction({ description: 'jan-02', date: '2027-01-02' }),
  ]

  it('período de 31/12 a 01/01 pega os dois anos, inclusivo nas pontas', () => {
    expect(
      descriptions(filterTransactions(list, filters({ from: '2026-12-31', to: '2027-01-01' }))),
    ).toEqual(['dez-31', 'jan-01'])
  })

  it('só data inicial em 01/01 exclui o ano anterior; só data final em 31/12 exclui o seguinte', () => {
    expect(descriptions(filterTransactions(list, filters({ from: '2027-01-01' })))).toEqual([
      'jan-01',
      'jan-02',
    ])
    expect(descriptions(filterTransactions(list, filters({ to: '2026-12-31' })))).toEqual([
      'dez-30',
      'dez-31',
    ])
  })

  it('01/01 → 31/12 do ano anterior é período invertido e não é aplicado (D-44(b))', () => {
    const inverted = { from: '2027-01-01', to: '2026-12-31' }
    expect(isPeriodInverted(inverted)).toBe(true)
    expect(effectivePeriod(inverted)).toEqual({ from: null, to: null })
    expect(filterTransactions(list, filters(inverted))).toEqual(list)
  })

  it('effectivePeriod devolve o período informado quando válido (inclusive parcial)', () => {
    expect(effectivePeriod({ from: '2026-01-01', to: null })).toEqual({
      from: '2026-01-01',
      to: null,
    })
    expect(effectivePeriod({ from: null, to: '2026-01-01' })).toEqual({
      from: null,
      to: '2026-01-01',
    })
    expect(isPeriodInverted({ from: '2026-01-01', to: null })).toBe(false)
    expect(isPeriodInverted({ from: null, to: '2026-01-01' })).toBe(false)
  })

  // A D-40 (só datas até hoje) vale apenas para "Últimos lançamentos" da tela inicial.
  it('lançamentos com data futura entram na lista e nos totais', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 9, 21, 12))
    const withFuture = sortByRecency([
      makeTransaction({ description: 'hoje', date: '2026-10-21', amountCents: 100 }),
      makeTransaction({ description: 'amanhã', date: '2026-10-22', amountCents: 200 }),
      makeTransaction({ description: 'ano que vem', date: '2027-06-01', amountCents: 300 }),
    ])
    expect(descriptions(filterTransactions(withFuture, EMPTY_TRANSACTION_FILTERS))).toEqual([
      'ano que vem',
      'amanhã',
      'hoje',
    ])
    const summary = summarizeTransactionList(withFuture, filters({ from: '2026-10-21' }))
    expect(summary.count).toBe(3)
    expect(summary.totals.expenseCents).toBe(600)
    expect(summary.days.map((day) => day.date)).toEqual(['2027-06-01', '2026-10-22', '2026-10-21'])
  })
})

// ---------------------------------------------------------------------------------------------
// Propriedade: filterTransactions = implementação de referência ingênua (CA-04.2).

const WORDS = [
  'Mercado',
  'mercado do bairro',
  'Supermercado',
  'Padaria São João',
  'Farmácia',
  'Salário',
  'Açougue',
  'Açaí',
  'acai',
  'CAFÉ',
]
const SEARCHES = ['', '   ', 'merc', ' MERC ', 'são', 'sao', 'açai', 'ACAI', 'cafe', 'xyz', 'do b']
const DATES = [null, '2025-12-31', '2026-01-01', '2026-06-15', '2026-12-31', '2027-01-01']

function randomData(seed: number, count: number): Transaction[] {
  const random = createTestRandom(seed)
  return Array.from({ length: count }, () => {
    const year = random.int(2025, 2027)
    const month = random.int(1, 12)
    const word = WORDS[random.int(0, WORDS.length - 1)]
    return makeTransaction({
      type: random.next() < 0.5 ? 'income' : 'expense',
      amountCents: random.int(1, 1_000_000),
      date: toDateString(year, month, random.int(1, daysInMonth(year, month))),
      // Metade em NFD, como pode vir de outra fonte; o iPhone grava em NFC.
      description: random.next() < 0.5 ? word.normalize('NFD') : word.normalize('NFC'),
      tagId: `tag-${random.int(1, 4)}`,
    })
  })
}

function randomFilters(seed: number): TransactionFilters {
  const random = createTestRandom(seed)
  const pick = <T>(options: readonly T[]): T => options[random.int(0, options.length - 1)]
  return {
    text: pick(SEARCHES),
    type: pick(['all', 'income', 'expense'] as const),
    tagId: pick([null, 'tag-1', 'tag-2', 'tag-9']),
    from: pick(DATES),
    to: pick(DATES),
  }
}

// Escrita de outro jeito: tira acentos por uma tabela, sem regex Unicode.
const ACCENTS: Record<string, string> = {
  á: 'a',
  à: 'a',
  â: 'a',
  ã: 'a',
  é: 'e',
  ê: 'e',
  í: 'i',
  ó: 'o',
  ô: 'o',
  õ: 'o',
  ú: 'u',
  ü: 'u',
  ç: 'c',
}
function naiveFold(value: string): string {
  let result = ''
  for (const char of value.normalize('NFC').toLowerCase()) result += ACCENTS[char] ?? char
  return result
}

function referenceFilter(list: readonly Transaction[], f: TransactionFilters): Transaction[] {
  const result: Transaction[] = []
  const needle = naiveFold(f.text.trim())
  const periodValid = f.from === null || f.to === null || f.from <= f.to
  for (const t of list) {
    if (f.type !== 'all' && t.type !== f.type) continue
    if (f.tagId !== null && t.tagId !== f.tagId) continue
    if (periodValid && f.from !== null && t.date < f.from) continue
    if (periodValid && f.to !== null && t.date > f.to) continue
    if (needle !== '' && !naiveFold(t.description).includes(needle)) continue
    result.push(t)
  }
  return result
}

describe('propriedade: filterTransactions = referência ingênua (CA-04.2)', () => {
  for (let seed = 1; seed <= 150; seed++) {
    it(`semente ${seed}`, () => {
      const data = randomData(seed, 200)
      const f = randomFilters(seed * 104729)
      expect(filterTransactions(data, f)).toEqual(referenceFilter(data, f))
    })
  }
})

// ---------------------------------------------------------------------------------------------
// summarizeTransactionList (CA-04.1 / CA-04.3).

describe('summarizeTransactionList — ordem dentro do dia (CA-04.1)', () => {
  it('itens do dia seguem compareByRecency (criado por último primeiro; empate pelo id)', () => {
    const at = (hour: number) => `2026-10-20T${String(hour).padStart(2, '0')}:00:00.000Z`
    const list = sortByRecency([
      makeTransaction({ id: 'a', description: '08h', date: '2026-10-20', createdAt: at(8) }),
      makeTransaction({ id: 'c', description: '10h-c', date: '2026-10-20', createdAt: at(10) }),
      makeTransaction({ id: 'b', description: '10h-b', date: '2026-10-20', createdAt: at(10) }),
      makeTransaction({ id: 'd', description: 'dia 19', date: '2026-10-19', createdAt: at(23) }),
    ])
    const [day20, day19] = summarizeTransactionList(list, EMPTY_TRANSACTION_FILTERS).days
    expect(descriptions(day20.transactions)).toEqual(['10h-c', '10h-b', '08h'])
    expect(descriptions(day19.transactions)).toEqual(['dia 19'])
  })
})

describe('summarizeTransactionList — valores no teto (princípio 1 / RF-01)', () => {
  it('1.000 lançamentos de MAX_AMOUNT_CENTS somam inteiros seguros e exatos', () => {
    const list = sortByRecency(
      Array.from({ length: 1000 }, (_, index) =>
        makeTransaction({
          type: index % 2 === 0 ? 'income' : 'expense',
          amountCents: MAX_AMOUNT_CENTS,
          date: toDateString(2026, (index % 12) + 1, (index % 28) + 1),
        }),
      ),
    )
    const summary = summarizeTransactionList(list, EMPTY_TRANSACTION_FILTERS)
    expect(summary.totals).toEqual({
      incomeCents: 500 * MAX_AMOUNT_CENTS,
      expenseCents: 500 * MAX_AMOUNT_CENTS,
      resultCents: 0,
    })
    expect(Number.isSafeInteger(summary.totals.incomeCents)).toBe(true)
    for (const day of summary.days) {
      expect(Number.isSafeInteger(day.incomeCents)).toBe(true)
      expect(Number.isSafeInteger(day.expenseCents)).toBe(true)
      expect(Number.isSafeInteger(day.resultCents)).toBe(true)
    }
    const onlyExpenses = summarizeTransactionList(list, filters({ type: 'expense' }))
    expect(onlyExpenses.totals.resultCents).toBe(-500 * MAX_AMOUNT_CENTS)
    expect(onlyExpenses.count).toBe(500)
  })
})

describe('propriedade: totais dos dias = total do conjunto filtrado (CA-04.3)', () => {
  for (let seed = 1; seed <= 60; seed++) {
    it(`semente ${seed}`, () => {
      const data = sortByRecency(randomData(seed * 7, 250))
      const f = randomFilters(seed * 15485863)
      const expected = referenceFilter(data, f)
      const summary = summarizeTransactionList(data, f)

      expect(summary.count).toBe(expected.length)
      expect(summary.totals).toEqual(totals(expected))

      let income = 0
      let expense = 0
      let result = 0
      for (const day of summary.days) {
        income = addCents(income, day.incomeCents)
        expense = addCents(expense, day.expenseCents)
        result = addCents(result, day.resultCents)
        // Dias únicos, todos os itens daquele dia, em compareByRecency.
        expect(day.transactions.every((t) => t.date === day.date)).toBe(true)
        expect(day.transactions).toEqual(day.transactions.toSorted(compareByRecency))
      }
      expect({ incomeCents: income, expenseCents: expense, resultCents: result }).toEqual(
        summary.totals,
      )
      const dates = summary.days.map((day) => day.date)
      expect(dates).toEqual(dates.toSorted().reverse())
      expect(new Set(dates).size).toBe(dates.length)
    })
  }
})

// ---------------------------------------------------------------------------------------------
// countVisibleDays — paginação por dias inteiros (CA-04.6 / D-44(d)).

const PAGE = 50

function day(date: string, size: number): DayGroup {
  return {
    date,
    incomeCents: 0,
    expenseCents: 0,
    resultCents: 0,
    transactions: Array.from({ length: size }, () => makeTransaction({ date })),
  }
}

/** Simula a tela: 1ª página com PAGE e depois `itemCount + PAGE` a cada "Carregar mais". */
function paginate(days: readonly DayGroup[]): DayGroup[][] {
  const pages: DayGroup[][] = []
  let shownDays = 0
  let target = PAGE
  while (shownDays < days.length) {
    const visible = countVisibleDays(days, target)
    pages.push(days.slice(shownDays, visible.dayCount))
    shownDays = visible.dayCount
    target = visible.itemCount + PAGE
  }
  return pages
}

describe('countVisibleDays — casos (CA-04.6 / D-44(d))', () => {
  it('um dia com mais de 50 itens entra inteiro na 1ª página', () => {
    const days = [day('2026-10-20', 120), day('2026-10-19', 5)]
    expect(countVisibleDays(days, PAGE)).toEqual({ dayCount: 1, itemCount: 120 })
    expect(paginate(days).map((page) => page.length)).toEqual([1, 1])
  })

  it('meta maior que o total: todos os dias', () => {
    const days = [day('2026-10-20', 3), day('2026-10-19', 4)]
    expect(countVisibleDays(days, 1000)).toEqual({ dayCount: 2, itemCount: 7 })
    expect(paginate(days)).toEqual([days])
  })

  it('lista vazia: nenhuma página', () => {
    expect(countVisibleDays([], PAGE)).toEqual({ dayCount: 0, itemCount: 0 })
    expect(paginate([])).toEqual([])
  })

  it('meta exata no fim de um dia não puxa o dia seguinte', () => {
    const days = [day('2026-10-20', 30), day('2026-10-19', 20), day('2026-10-18', 1)]
    expect(countVisibleDays(days, PAGE)).toEqual({ dayCount: 2, itemCount: 50 })
  })
})

describe('propriedade: páginas sucessivas cobrem tudo, sem cortar nem repetir dias (D-44(d))', () => {
  for (let seed = 1; seed <= 80; seed++) {
    it(`semente ${seed}`, () => {
      const random = createTestRandom(seed)
      const dayCount = random.int(0, 60)
      const days = Array.from({ length: dayCount }, (_, index) =>
        // Tamanhos variados, às vezes maiores que uma página.
        day(
          `d-${String(1000 - index)}`,
          random.next() < 0.1 ? random.int(51, 130) : random.int(1, 15),
        ),
      )
      const pages = paginate(days)
      const allTransactions = days.flatMap((d) => d.transactions)

      // Cada página tem pelo menos 1 dia; a 1ª tem >= PAGE itens ou é a única.
      for (const page of pages) expect(page.length).toBeGreaterThan(0)
      if (pages.length > 1) {
        const firstItems = pages[0].reduce((sum, d) => sum + d.transactions.length, 0)
        expect(firstItems).toBeGreaterThanOrEqual(PAGE)
      }
      // Dias inteiros, na ordem, sem repetir nem pular.
      expect(pages.flat()).toEqual(days)
      const seen = pages.flat().flatMap((d) => d.transactions)
      expect(seen).toEqual(allTransactions)
      expect(new Set(seen.map((t) => t.id)).size).toBe(allTransactions.length)

      // itemCount sempre é a soma exata dos dias visíveis (nenhum dia pela metade).
      for (const target of [0, 1, PAGE, 2 * PAGE, 10_000]) {
        const visible = countVisibleDays(days, target)
        const sum = days.slice(0, visible.dayCount).reduce((s, d) => s + d.transactions.length, 0)
        expect(visible.itemCount).toBe(sum)
      }
    })
  }
})
