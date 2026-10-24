import { groupByDay, groupByMonth, type Totals } from '@/domain/balances'
import {
  addDays,
  addMonthsClamped,
  datesBetween,
  formatDateRangeLabel,
  formatLongDate,
  formatMonthLabel,
  monthRange,
  periodOf,
  periodsBetween,
  weekRange,
  yearRange,
  type DateRange,
} from '@/domain/dates'
import type { DateString, PeriodString, Transaction } from '@/domain/types'

// RF-05 — visões por período: intervalo, navegação e detalhamento de cada granularidade.
// Funções puras (princípio 6); a tela só busca no banco o intervalo do período (índice `date`).

/** §6.7 — granularidade da visão. */
export type ViewGranularity = 'day' | 'week' | 'month' | 'year'

export interface DaySummary extends Totals {
  date: DateString
}

export interface MonthSummary extends Totals {
  period: PeriodString
}

const DAYS_PER_WEEK = 7
const MONTHS_PER_YEAR = 12

const EMPTY_TOTALS: Totals = { incomeCents: 0, expenseCents: 0, resultCents: 0 }

/** Ano da data, ex.: `'2026-10-24'` → `2026`. */
export function yearOf(date: DateString): number {
  return Number(periodOf(date).slice(0, 4))
}

/** Datas inclusivas do período que contém `anchor` (Semana: segunda a domingo — CA-05.3). */
export function viewRange(granularity: ViewGranularity, anchor: DateString): DateRange {
  switch (granularity) {
    case 'day':
      periodOf(anchor) // valida a data
      return { start: anchor, end: anchor }
    case 'week':
      return weekRange(anchor)
    case 'month':
      return monthRange(periodOf(anchor))
    case 'year':
      return yearRange(yearOf(anchor))
  }
}

/**
 * Data de referência `steps` períodos depois (negativo = antes) — setas anterior/próximo.
 * Mês e Ano mantêm o dia quando ele existe no destino (31/01 → 28/02), como nas parcelas.
 */
export function shiftAnchorDate(
  granularity: ViewGranularity,
  anchor: DateString,
  steps: number,
): DateString {
  switch (granularity) {
    case 'day':
      return addDays(anchor, steps)
    case 'week':
      return addDays(anchor, steps * DAYS_PER_WEEK)
    case 'month':
      return addMonthsClamped(anchor, steps)
    case 'year':
      return addMonthsClamped(anchor, steps * MONTHS_PER_YEAR)
  }
}

/**
 * Título do período: `'sábado, 24 de outubro de 2026'`, `'19 a 25 de out. de 2026'`,
 * `'outubro de 2026'` ou `'2026'` (a 1ª letra maiúscula fica para o CSS, como no CA-04.1).
 */
export function formatViewTitle(granularity: ViewGranularity, anchor: DateString): string {
  switch (granularity) {
    case 'day':
      return formatLongDate(anchor)
    case 'week':
      return formatDateRangeLabel(weekRange(anchor))
    case 'month':
      return formatMonthLabel(periodOf(anchor))
    case 'year':
      return String(yearOf(anchor))
  }
}

function totalsOf(group: Totals | undefined): Totals {
  if (!group) return { ...EMPTY_TOTALS }
  const { incomeCents, expenseCents, resultCents } = group
  return { incomeCents, expenseCents, resultCents }
}

/**
 * Visão Semana — uma linha por dia do intervalo (7, de segunda a domingo), inclusive os dias
 * sem movimento. Lançamentos fora do intervalo são ignorados (CA-05.1).
 */
export function summarizeDays(
  transactions: readonly Transaction[],
  range: DateRange,
): DaySummary[] {
  const byDay = groupByDay(transactions)
  return datesBetween(range.start, range.end).map((date) => ({
    date,
    ...totalsOf(byDay.get(date)),
  }))
}

/**
 * Visão Mês — uma linha por dia **com movimento** dentro do intervalo, em ordem cronológica.
 * Lançamentos fora do intervalo são ignorados (CA-05.1).
 */
export function summarizeActiveDays(
  transactions: readonly Transaction[],
  range: DateRange,
): DaySummary[] {
  const days: DaySummary[] = []
  for (const [date, group] of groupByDay(transactions)) {
    if (range.start <= date && date <= range.end) days.push({ date, ...totalsOf(group) })
  }
  return days.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
}

/** Visão Ano — uma linha por mês (12), inclusive os meses sem movimento (CA-05.1). */
export function summarizeMonths(
  transactions: readonly Transaction[],
  year: number,
): MonthSummary[] {
  const { start, end } = yearRange(year)
  const byMonth = groupByMonth(transactions)
  return periodsBetween(periodOf(start), periodOf(end)).map((period) => ({
    period,
    ...totalsOf(byMonth.get(period)),
  }))
}
