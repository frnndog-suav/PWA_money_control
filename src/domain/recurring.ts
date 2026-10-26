import { addCents } from '@/domain/money'
import type { Totals } from '@/domain/balances'
import type { Cents, PeriodString, Recurring, Transaction } from '@/domain/types'

// §6.5 / RF-07 — recorrentes mensais sem dia fixo (D-04). Funções puras (princípio 6): o
// repositório lê e grava; as regras ficam aqui. Ocorrências pendentes contam só no Previsto,
// nunca no Realizado, nos saldos ou nos gráficos (D-05).

/** Estado de um recorrente num mês (CA-07.6). */
export type OccurrenceStatus = 'inactive' | 'pending' | 'confirmed' | 'skipped'

export interface PendingOccurrence {
  recurring: Recurring
  period: PeriodString
  amountCents: Cents
}

/** `fromPeriod` antes do início do recorrente (§6.5 `setAmountFrom`). */
export class AmountBeforeStartError extends Error {
  readonly startPeriod: PeriodString

  constructor(startPeriod: PeriodString) {
    super(`O valor não pode valer antes do início (${startPeriod}).`)
    this.name = 'AmountBeforeStartError'
    this.startPeriod = startPeriod
  }
}

/** `fromPeriod` depois do término: o valor nunca seria usado. */
export class AmountAfterEndError extends Error {
  readonly endPeriod: PeriodString

  constructor(endPeriod: PeriodString) {
    super(`O valor não pode valer depois do término (${endPeriod}).`)
    this.name = 'AmountAfterEndError'
    this.endPeriod = endPeriod
  }
}

/** Término antes do início do recorrente. */
export class EndBeforeStartError extends Error {
  readonly startPeriod: PeriodString

  constructor(startPeriod: PeriodString) {
    super(`O término não pode ser antes do início (${startPeriod}).`)
    this.name = 'EndBeforeStartError'
    this.startPeriod = startPeriod
  }
}

/** D-51 — término antes de um mês já confirmado: o lançamento ficaria fora do recorrente. */
export class EndBeforeConfirmedError extends Error {
  readonly lastConfirmedPeriod: PeriodString

  constructor(lastConfirmedPeriod: PeriodString) {
    super(`O término não pode ser antes de ${lastConfirmedPeriod}, que já foi confirmado.`)
    this.name = 'EndBeforeConfirmedError'
    this.lastConfirmedPeriod = lastConfirmedPeriod
  }
}

/** `startPeriod <= period` e (`endPeriod` nulo ou `period <= endPeriod`). */
export function isActiveIn(recurring: Recurring, period: PeriodString): boolean {
  return (
    recurring.startPeriod <= period &&
    (recurring.endPeriod === null || period <= recurring.endPeriod)
  )
}

/**
 * CA-07.3 — valor do último item de `amounts` com `fromPeriod <= period`. Antes do início não
 * há valor vigente.
 */
export function amountFor(recurring: Recurring, period: PeriodString): Cents {
  let amount: Cents | undefined
  for (const item of recurring.amounts) {
    if (item.fromPeriod > period) break
    amount = item.amountCents
  }
  if (amount === undefined) throw new RangeError(`Sem valor vigente em ${period}`)
  return amount
}

export function isSkipped(recurring: Recurring, period: PeriodString): boolean {
  return recurring.skippedPeriods.includes(period)
}

/** Chave da ocorrência confirmada, a mesma do índice `[recurringId+recurringPeriod]` (§6.4). */
function occurrenceKey(recurringId: string, period: PeriodString): string {
  return `${recurringId}|${period}`
}

/** Ocorrências confirmadas: lançamentos vinculados a um recorrente e a um mês. */
export function confirmedOccurrenceKeys(transactions: readonly Transaction[]): Set<string> {
  const keys = new Set<string>()
  for (const transaction of transactions) {
    if (transaction.recurringId !== null && transaction.recurringPeriod !== null) {
      keys.add(occurrenceKey(transaction.recurringId, transaction.recurringPeriod))
    }
  }
  return keys
}

/** CA-07.6 — estado do recorrente no mês. */
export function occurrenceStatus(
  recurring: Recurring,
  period: PeriodString,
  confirmedKeys: ReadonlySet<string>,
): OccurrenceStatus {
  if (confirmedKeys.has(occurrenceKey(recurring.id, period))) return 'confirmed'
  if (!isActiveIn(recurring, period)) return 'inactive'
  return isSkipped(recurring, period) ? 'skipped' : 'pending'
}

const descriptionCollator = new Intl.Collator('pt-BR', { sensitivity: 'base' })

/**
 * §6.5 — ocorrências pendentes do mês: recorrentes ativos no mês, cujo mês não foi pulado e
 * sem lançamento com o mesmo `[recurringId+recurringPeriod]`. `transactions` precisa conter
 * os lançamentos confirmados desses recorrentes naquele mês (os outros são ignorados). Em
 * ordem alfabética da descrição.
 */
export function pendingOccurrences(
  recurrings: readonly Recurring[],
  transactions: readonly Transaction[],
  period: PeriodString,
): PendingOccurrence[] {
  const confirmedKeys = confirmedOccurrenceKeys(transactions)
  return recurrings
    .filter((recurring) => occurrenceStatus(recurring, period, confirmedKeys) === 'pending')
    .map((recurring) => ({ recurring, period, amountCents: amountFor(recurring, period) }))
    .sort((a, b) => descriptionCollator.compare(a.recurring.description, b.recurring.description))
}

/**
 * §6.5 / CA-07.3 — remove os valores com `fromPeriod >= fromPeriod` e acrescenta o novo, em
 * ordem. Lançamentos já confirmados não mudam (são outros registros).
 */
export function setAmountFrom(
  recurring: Recurring,
  fromPeriod: PeriodString,
  amountCents: Cents,
): Recurring {
  if (fromPeriod < recurring.startPeriod) throw new AmountBeforeStartError(recurring.startPeriod)
  if (recurring.endPeriod !== null && fromPeriod > recurring.endPeriod) {
    throw new AmountAfterEndError(recurring.endPeriod)
  }
  const kept = recurring.amounts.filter((item) => item.fromPeriod < fromPeriod)
  return { ...recurring, amounts: [...kept, { fromPeriod, amountCents }] }
}

/** CA-07.4 — pula o mês (idempotente). */
export function skipPeriod(recurring: Recurring, period: PeriodString): Recurring {
  if (isSkipped(recurring, period)) return recurring
  const skippedPeriods = [...recurring.skippedPeriods, period].sort()
  return { ...recurring, skippedPeriods }
}

/** CA-07.4 — desfaz o pulo: a ocorrência volta a pendente (idempotente). */
export function unskipPeriod(recurring: Recurring, period: PeriodString): Recurring {
  if (!isSkipped(recurring, period)) return recurring
  return { ...recurring, skippedPeriods: recurring.skippedPeriods.filter((p) => p !== period) }
}

/**
 * RF-07 "Encerrar" — define o mês de término. Não pode ser antes do início nem de um mês já
 * confirmado (D-51). Meses pulados depois do término deixam de valer e são descartados.
 */
export function endRecurring(
  recurring: Recurring,
  endPeriod: PeriodString,
  lastConfirmedPeriod: PeriodString | null,
): Recurring {
  if (endPeriod < recurring.startPeriod) throw new EndBeforeStartError(recurring.startPeriod)
  if (lastConfirmedPeriod !== null && endPeriod < lastConfirmedPeriod) {
    throw new EndBeforeConfirmedError(lastConfirmedPeriod)
  }
  return {
    ...recurring,
    endPeriod,
    amounts: recurring.amounts.filter((item, index) => index === 0 || item.fromPeriod <= endPeriod),
    skippedPeriods: recurring.skippedPeriods.filter((period) => period <= endPeriod),
  }
}

/** Último mês confirmado entre os lançamentos de um recorrente, ou `null`. */
export function lastConfirmedPeriod(transactions: readonly Transaction[]): PeriodString | null {
  let last: PeriodString | null = null
  for (const { recurringPeriod } of transactions) {
    if (recurringPeriod !== null && (last === null || recurringPeriod > last))
      last = recurringPeriod
  }
  return last
}

/** §6.5 / CA-05.2 — Previsto = Realizado + ocorrências pendentes do período. */
export function projected(actualTotals: Totals, pending: readonly PendingOccurrence[]): Totals {
  let { incomeCents, expenseCents } = actualTotals
  for (const occurrence of pending) {
    if (occurrence.recurring.type === 'income') {
      incomeCents = addCents(incomeCents, occurrence.amountCents)
    } else {
      expenseCents = addCents(expenseCents, occurrence.amountCents)
    }
  }
  return { incomeCents, expenseCents, resultCents: addCents(incomeCents, -expenseCents) }
}

/** CA-07.6 — situação do recorrente no mês atual, para a lista de recorrentes. */
export type RecurringListStatus = Exclude<OccurrenceStatus, 'inactive'> | 'ended' | 'upcoming'

export function recurringListStatus(
  recurring: Recurring,
  period: PeriodString,
  confirmedKeys: ReadonlySet<string>,
): RecurringListStatus {
  const status = occurrenceStatus(recurring, period, confirmedKeys)
  if (status !== 'inactive') return status
  return period < recurring.startPeriod ? 'upcoming' : 'ended'
}

/**
 * CA-07.6 — valor a exibir: o vigente no mês; antes do início, o 1º valor; depois do término,
 * o último valor que valeu.
 */
export function displayAmount(recurring: Recurring, period: PeriodString): Cents {
  if (period < recurring.startPeriod) return recurring.amounts[0].amountCents
  const lastActive =
    recurring.endPeriod !== null && period > recurring.endPeriod ? recurring.endPeriod : period
  return amountFor(recurring, lastActive)
}
