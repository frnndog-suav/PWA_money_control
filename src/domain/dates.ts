import {
  addMonths,
  endOfWeek,
  format,
  isValid,
  lastDayOfMonth,
  parseISO,
  startOfWeek,
} from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { DateString, PeriodString } from '@/domain/types'

// §6.5 — datas são strings locais sem fuso (princípio 2). Nunca usar o construtor de Date
// com 'YYYY-MM-DD': ele interpreta a string como UTC e pode cair no dia anterior no Brasil.

export interface DateRange {
  start: DateString
  end: DateString
}

const DATE_FORMAT = 'yyyy-MM-dd'
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/
const PERIOD_PATTERN = /^(\d{4})-(0[1-9]|1[0-2])$/
const MONTHS_PER_YEAR = 12
const MIN_YEAR = 1
const MAX_YEAR = 9999

// Princípio 3 — a semana começa na segunda-feira.
const WEEK_OPTIONS = { weekStartsOn: 1, locale: ptBR } as const

/** Converte `YYYY-MM-DD` em Date no horário local (parseISO, nunca o construtor). */
function parseDate(date: DateString): Date {
  if (!DATE_PATTERN.test(date)) throw new RangeError(`Data inválida: ${date}`)
  const parsed = parseISO(date)
  // parseISO aceita 2026-02-30 como 02/03; a volta para texto denuncia o dia inexistente.
  if (!isValid(parsed) || format(parsed, DATE_FORMAT) !== date) {
    throw new RangeError(`Data inválida: ${date}`)
  }
  return parsed
}

function toDateString(date: Date): DateString {
  return format(date, DATE_FORMAT)
}

function parsePeriod(period: PeriodString): { year: number; month: number } {
  const match = PERIOD_PATTERN.exec(period)
  if (!match) throw new RangeError(`Período inválido: ${period}`)
  return { year: Number(match[1]), month: Number(match[2]) }
}

function toPeriodString(year: number, month: number): PeriodString {
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}`
}

/** Data local de hoje; `now` é injetável nos testes. */
export function today(now: Date = new Date()): DateString {
  return toDateString(now)
}

/** `'2026-10-19'` → `'2026-10'`. */
export function periodOf(date: DateString): PeriodString {
  parseDate(date)
  return date.slice(0, 7)
}

/** Semana de segunda a domingo que contém `date` (CA-05.3). */
export function weekRange(date: DateString): DateRange {
  const parsed = parseDate(date)
  return {
    start: toDateString(startOfWeek(parsed, WEEK_OPTIONS)),
    end: toDateString(endOfWeek(parsed, WEEK_OPTIONS)),
  }
}

/** Primeiro e último dia do mês `YYYY-MM`. */
export function monthRange(period: PeriodString): DateRange {
  parsePeriod(period)
  const start = `${period}-01`
  return { start, end: toDateString(lastDayOfMonth(parseDate(start))) }
}

/** 1º de janeiro a 31 de dezembro de `year`. */
export function yearRange(year: number): DateRange {
  if (!Number.isInteger(year) || year < MIN_YEAR || year > MAX_YEAR) {
    throw new RangeError(`Ano inválido: ${year}`)
  }
  const yyyy = String(year).padStart(4, '0')
  return { start: `${yyyy}-01-01`, end: `${yyyy}-12-31` }
}

/**
 * Mesmo dia, `months` meses depois; se o dia não existir no mês de destino, usa o último
 * dia dele (31/01 + 1 → 28/02 ou 29/02). Usado nas parcelas (RF-08).
 */
export function addMonthsClamped(date: DateString, months: number): DateString {
  if (!Number.isInteger(months)) throw new RangeError(`Quantidade de meses inválida: ${months}`)
  // O addMonths do date-fns já ajusta para o último dia do mês quando o dia não existe.
  return toDateString(addMonths(parseDate(date), months))
}

/** Lista inclusiva de meses entre `start` e `end`; vazia se `start` vier depois de `end`. */
export function periodsBetween(start: PeriodString, end: PeriodString): PeriodString[] {
  const from = parsePeriod(start)
  const to = parsePeriod(end)
  // Conta meses desde o ano 0 para iterar sem objetos Date.
  const firstIndex = from.year * MONTHS_PER_YEAR + from.month - 1
  const lastIndex = to.year * MONTHS_PER_YEAR + to.month - 1
  const periods: PeriodString[] = []
  for (let index = firstIndex; index <= lastIndex; index++) {
    periods.push(toPeriodString(Math.floor(index / MONTHS_PER_YEAR), (index % MONTHS_PER_YEAR) + 1))
  }
  return periods
}
