import { runningBalance, type Totals } from '@/domain/balances'
import {
  datesBetween,
  formatMonthLabel,
  formatShortDayMonth,
  formatShortMonthName,
  formatShortWeekdayDay,
  monthRange,
  periodOf,
  periodsBetween,
  type DateRange,
} from '@/domain/dates'
import { addCents } from '@/domain/money'
import {
  summarizeDays,
  summarizeMonths,
  viewRange,
  yearOf,
  type ViewGranularity,
} from '@/domain/periodViews'
import type { Cents, DateString, Tag, Transaction, TransactionType } from '@/domain/types'

// RF-06 — dados dos gráficos, em funções puras (princípio 6). Valores sempre em centavos
// inteiros; os percentuais são inteiros em décimos de ponto percentual (412 = 41,2%).

/** RF-06 — os gráficos existem só para Semana, Mês e Ano (D-50). */
export type ChartGranularity = Exclude<ViewGranularity, 'day'>

/** RF-06 — a linha de evolução do saldo existe só no Mês e no Ano. */
export type BalanceGranularity = Exclude<ChartGranularity, 'week'>

/** Subperíodo de um gráfico: um dia (Semana e Mês) ou um mês (Ano). */
export interface ChartBucket extends DateRange {
  /** Rótulo curto do eixo, ex.: `'seg. 19'`, `'15'`, `'out.'`. */
  tickLabel: string
  /** Rótulo do painel de detalhes, ex.: `'15 de out.'` ou `'outubro de 2026'`. */
  label: string
}

export interface IncomeExpensePoint extends ChartBucket, Totals {}

export interface BalancePoint extends ChartBucket {
  balanceCents: Cents
}

export interface TagSlice {
  tagId: string
  name: string
  color: string
  cents: Cents
  /** Percentual em décimos (412 = 41,2%); as fatias somam exatamente 1000. */
  tenths: number
}

/** 100,0% em décimos de ponto percentual. */
const TOTAL_TENTHS = 1000

// Tag que não está no mapa (só enquanto as tags carregam: tag em uso não pode ser excluída — D-02).
const UNKNOWN_TAG = { name: '—', color: '#94A3B8' } as const

export function isChartGranularity(granularity: ViewGranularity): granularity is ChartGranularity {
  return granularity !== 'day'
}

export function isBalanceGranularity(
  granularity: ChartGranularity,
): granularity is BalanceGranularity {
  return granularity !== 'week'
}

function dayBucket(date: DateString, tickLabel: string): ChartBucket {
  return { start: date, end: date, tickLabel, label: formatShortDayMonth(date) }
}

/** Subperíodos do gráfico: 7 dias (Semana), todos os dias do mês (Mês) ou 12 meses (Ano). */
export function chartBuckets(granularity: ChartGranularity, anchor: DateString): ChartBucket[] {
  const { start, end } = viewRange(granularity, anchor)
  switch (granularity) {
    case 'week':
      return datesBetween(start, end).map((date) => dayBucket(date, formatShortWeekdayDay(date)))
    case 'month':
      return datesBetween(start, end).map((date) => dayBucket(date, String(Number(date.slice(8)))))
    case 'year':
      return periodsBetween(periodOf(start), periodOf(end)).map((period) => ({
        ...monthRange(period),
        tickLabel: formatShortMonthName(period),
        label: formatMonthLabel(period),
      }))
  }
}

/** CA-06.4 — entradas, saídas e resultado de cada subperíodo (barras agrupadas). */
export function incomeExpenseSeries(
  transactions: readonly Transaction[],
  granularity: ChartGranularity,
  anchor: DateString,
): IncomeExpensePoint[] {
  const buckets = chartBuckets(granularity, anchor)
  const totalsByBucket: Totals[] =
    granularity === 'year'
      ? summarizeMonths(transactions, yearOf(anchor))
      : summarizeDays(transactions, viewRange(granularity, anchor))
  return buckets.map((bucket, index) => {
    const { incomeCents, expenseCents, resultCents } = totalsByBucket[index]
    return { ...bucket, incomeCents, expenseCents, resultCents }
  })
}

/**
 * CA-06.5 — saldo acumulado ao fim de cada subperíodo: todos os lançamentos com data até o fim
 * dele, inclusive os anteriores ao período (saldo inicial) e os futuros do mês corrente.
 */
export function balanceSeries(
  transactions: readonly Transaction[],
  granularity: BalanceGranularity,
  anchor: DateString,
): BalancePoint[] {
  const buckets = chartBuckets(granularity, anchor)
  const balances = runningBalance(transactions, buckets)
  return buckets.map((bucket, index) => ({ ...bucket, balanceCents: balances[index] }))
}

/**
 * Distribui 100,0% entre os valores pelo método do maior resto: cada um recebe o piso da sua
 * parte em décimos e os décimos que sobram vão para os maiores restos (empate: o que vem
 * antes). A soma é sempre exatamente 1000 (ou tudo zero, se o total for zero). BigInt porque
 * `centavos × 1000` pode passar do maior inteiro seguro.
 */
export function distributeTenths(values: readonly Cents[]): number[] {
  const total = values.reduce<bigint>((sum, value) => sum + BigInt(value), 0n)
  if (total === 0n) return values.map(() => 0)

  const shares = values.map((value, index) => {
    const scaled = BigInt(value) * BigInt(TOTAL_TENTHS)
    return { index, tenths: Number(scaled / total), remainder: scaled % total }
  })
  let missing = TOTAL_TENTHS - shares.reduce((sum, share) => sum + share.tenths, 0)
  const byRemainder = [...shares].sort((a, b) =>
    a.remainder === b.remainder ? a.index - b.index : a.remainder > b.remainder ? -1 : 1,
  )
  for (const share of byRemainder) {
    if (missing === 0) break
    share.tenths += 1
    missing -= 1
  }
  return shares.map((share) => share.tenths)
}

const tagNameCollator = new Intl.Collator('pt-BR', { sensitivity: 'base' })

/**
 * CA-06.3 — soma das entradas ou das saídas por tag, com a cor da tag, do maior para o menor
 * valor (empate: nome da tag), e o percentual de cada uma somando 100,0%.
 */
export function tagSlices(
  transactions: readonly Transaction[],
  type: TransactionType,
  tagsById: ReadonlyMap<string, Pick<Tag, 'name' | 'color'>>,
): TagSlice[] {
  const centsByTag = new Map<string, Cents>()
  for (const transaction of transactions) {
    if (transaction.type !== type) continue
    const current = centsByTag.get(transaction.tagId) ?? 0
    centsByTag.set(transaction.tagId, addCents(current, transaction.amountCents))
  }

  const slices = [...centsByTag].map(([tagId, cents]) => {
    const { name, color } = tagsById.get(tagId) ?? UNKNOWN_TAG
    return { tagId, name, color, cents, tenths: 0 }
  })
  slices.sort((a, b) => b.cents - a.cents || tagNameCollator.compare(a.name, b.name))
  const tenths = distributeTenths(slices.map((slice) => slice.cents))
  return slices.map((slice, index) => ({ ...slice, tenths: tenths[index] }))
}

/** `412` → `'41,2%'` (pt-BR, sempre com uma casa decimal). */
export function formatTenthsPercent(tenths: number): string {
  if (!Number.isSafeInteger(tenths) || tenths < 0) {
    throw new RangeError(`Percentual inválido: ${tenths}`)
  }
  return `${Math.floor(tenths / 10)},${tenths % 10}%`
}
