import {
  addDays as addCalendarDays,
  addMonths,
  endOfWeek,
  format,
  getISODay,
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

/** `days` dias depois de `date` (negativo = antes), atravessando meses e anos (RF-05). */
export function addDays(date: DateString, days: number): DateString {
  if (!Number.isInteger(days)) throw new RangeError(`Quantidade de dias inválida: ${days}`)
  return toDateString(addCalendarDays(parseDate(date), days))
}

/** Lista inclusiva de datas entre `start` e `end`; vazia se `start` vier depois de `end`. */
export function datesBetween(start: DateString, end: DateString): DateString[] {
  parseDate(end)
  const dates: DateString[] = []
  for (let day = parseDate(start), date = start; date <= end; date = toDateString(day)) {
    dates.push(date)
    day = addCalendarDays(day, 1)
  }
  return dates
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

/** `true` se `value` é um mês `YYYY-MM` válido (RF-07). */
export function isValidPeriod(value: string): boolean {
  return PERIOD_PATTERN.test(value)
}

/** CA-07.8 — `true` se `date` é uma data válida dentro do mês `period`. */
export function isDateInPeriod(date: string, period: PeriodString): boolean {
  return isValidDate(date) && date.slice(0, 7) === period
}

/** `true` se `value` é uma data `YYYY-MM-DD` que existe no calendário (ex.: 2026-02-30 não). */
export function isValidDate(value: string): boolean {
  try {
    parseDate(value)
    return true
  } catch {
    return false
  }
}

/**
 * Checagem barata de `YYYY-MM-DD` existente, só com aritmética (sem objetos Date): usada
 * em listas longas, onde o parseISO + format do date-fns pesaria (RNF-02).
 */
function isCalendarDateString(date: string): boolean {
  if (!DATE_PATTERN.test(date)) return false
  const year = Number(date.slice(0, 4))
  const month = Number(date.slice(5, 7))
  const day = Number(date.slice(8, 10))
  if (year < MIN_YEAR || month < 1 || month > MONTHS_PER_YEAR || day < 1) return false
  return day <= daysInMonth(year, month)
}

function daysInMonth(year: number, month: number): number {
  if (month === 2) return isLeapYear(year) ? 29 : 28
  return month === 4 || month === 6 || month === 9 || month === 11 ? 30 : 31
}

function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0
}

/** `'2026-10-19'` → `'19/10/2026'` (pt-BR), só rearranjando o texto: rápido em listas longas. */
export function formatShortDate(date: DateString): string {
  if (!isCalendarDateString(date)) throw new RangeError(`Data inválida: ${date}`)
  return `${date.slice(8, 10)}/${date.slice(5, 7)}/${date.slice(0, 4)}`
}

// Formatadores criados uma vez (RNF-02). Em UTC, com a data montada a partir dos números: o
// resultado não depende do fuso do aparelho, nem de o fuso mudar depois de o módulo carregar.
const monthLabelFormatter = new Intl.DateTimeFormat('pt-BR', {
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
})

const longDateFormatter = new Intl.DateTimeFormat('pt-BR', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
})

/** Meia-noite UTC do dia informado (mês de 1 a 12), só para formatar com os formatadores em UTC. */
function toUtcDate(year: number, month: number, day: number): Date {
  const date = new Date(0)
  // setUTCFullYear, e não Date.UTC, porque o Date.UTC trata os anos 0 a 99 como 1900 a 1999.
  date.setUTCFullYear(year, month - 1, day)
  return date
}

/** `'2026-10'` → `'outubro de 2026'` (pt-BR). */
export function formatMonthLabel(period: PeriodString): string {
  const { year, month } = parsePeriod(period)
  return monthLabelFormatter.format(toUtcDate(year, month, 1))
}

const weekdayFormatter = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', timeZone: 'UTC' })

const monthNameFormatter = new Intl.DateTimeFormat('pt-BR', { month: 'long', timeZone: 'UTC' })

// Abreviações fixas do pt-BR: o `month: 'short'` do Intl varia entre motores (ponto, "mai").
const SHORT_MONTH_NAMES = [
  'jan.',
  'fev.',
  'mar.',
  'abr.',
  'mai.',
  'jun.',
  'jul.',
  'ago.',
  'set.',
  'out.',
  'nov.',
  'dez.',
] as const

interface DateParts {
  year: number
  month: number
  day: number
}

function splitDate(date: DateString): DateParts {
  if (!isCalendarDateString(date)) throw new RangeError(`Data inválida: ${date}`)
  return {
    year: Number(date.slice(0, 4)),
    month: Number(date.slice(5, 7)),
    day: Number(date.slice(8, 10)),
  }
}

function toUtcDateOf({ year, month, day }: DateParts): Date {
  return toUtcDate(year, month, day)
}

/** CA-04.1 — `'2026-10-20'` → `'terça-feira, 20 de outubro de 2026'` (pt-BR). */
export function formatLongDate(date: DateString): string {
  return longDateFormatter.format(toUtcDateOf(splitDate(date)))
}

/** RF-05 — `'2026-10-19'` → `'segunda-feira, 19/10'` (linhas das visões Semana e Mês). */
export function formatWeekdayDate(date: DateString): string {
  const weekday = weekdayFormatter.format(toUtcDateOf(splitDate(date)))
  return `${weekday}, ${date.slice(8, 10)}/${date.slice(5, 7)}`
}

/** RF-05 — `'2026-10'` → `'outubro'` (linhas da visão Ano). */
export function formatMonthName(period: PeriodString): string {
  const { year, month } = parsePeriod(period)
  return monthNameFormatter.format(toUtcDate(year, month, 1))
}

function formatDayMonth({ month, day }: DateParts): string {
  return `${day} de ${SHORT_MONTH_NAMES[month - 1]}`
}

// Segunda a domingo, na ordem do getISODay (1 = segunda — princípio 3).
const SHORT_WEEKDAY_NAMES = ['seg.', 'ter.', 'qua.', 'qui.', 'sex.', 'sáb.', 'dom.'] as const

/** CA-06.4 — `'2026-10-15'` → `'15 de out.'` (painel das barras). */
export function formatShortDayMonth(date: DateString): string {
  return formatDayMonth(splitDate(date))
}

/** RF-06 — `'2026-10-19'` → `'seg. 19'` (eixo das barras na visão Semana). */
export function formatShortWeekdayDay(date: DateString): string {
  const { day } = splitDate(date)
  return `${SHORT_WEEKDAY_NAMES[getISODay(parseDate(date)) - 1]} ${day}`
}

/** RF-06 — `'2026-10'` → `'out.'` (eixo dos gráficos na visão Ano). */
export function formatShortMonthName(period: PeriodString): string {
  return SHORT_MONTH_NAMES[parsePeriod(period).month - 1]
}

/**
 * CA-05.3 — título da semana: `'12 a 18 de out. de 2026'`; o mês e o ano só se repetem quando
 * mudam no meio da semana (`'28 de set. a 4 de out. de 2026'`,
 * `'28 de dez. de 2026 a 3 de jan. de 2027'`).
 */
export function formatDateRangeLabel({ start, end }: DateRange): string {
  const from = splitDate(start)
  const to = splitDate(end)
  const last = `${formatDayMonth(to)} de ${to.year}`
  if (from.year !== to.year) return `${formatDayMonth(from)} de ${from.year} a ${last}`
  if (from.month !== to.month) return `${formatDayMonth(from)} a ${last}`
  return `${from.day} a ${last}`
}
