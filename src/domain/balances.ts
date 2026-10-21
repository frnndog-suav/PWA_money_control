import type { DateRange } from '@/domain/dates'
import { addCents } from '@/domain/money'
import type { Cents, DateString, PeriodString, Transaction } from '@/domain/types'

// §6.5 — saldos e totais. Cada função percorre a lista uma única vez: as telas precisam
// responder em < 300 ms com 10.000 lançamentos (RNF-02).

export interface Totals {
  incomeCents: Cents
  expenseCents: Cents
  resultCents: Cents
}

export interface TransactionGroup extends Totals {
  transactions: Transaction[]
}

const EMPTY_TOTALS: Totals = { incomeCents: 0, expenseCents: 0, resultCents: 0 }

/** Valor com sinal: entradas positivas, saídas negativas (CA-02.1). */
export function signedAmount(transaction: Transaction): Cents {
  return transaction.type === 'income' ? transaction.amountCents : -transaction.amountCents
}

/** Acumula um lançamento em `target` (mutável, para não alocar um objeto por item). */
function accumulate(target: Totals, transaction: Transaction): Totals {
  if (transaction.type === 'income') {
    target.incomeCents = addCents(target.incomeCents, transaction.amountCents)
  } else {
    target.expenseCents = addCents(target.expenseCents, transaction.amountCents)
  }
  target.resultCents = addCents(target.resultCents, signedAmount(transaction))
  return target
}

/** Entradas, saídas e resultado (entradas − saídas). */
export function totals(transactions: readonly Transaction[]): Totals {
  return transactions.reduce(accumulate, { ...EMPTY_TOTALS })
}

/** D-42 / CA-02.3 — saldo geral: todos os lançamentos, inclusive os com data futura. */
export function overallBalance(transactions: readonly Transaction[]): Cents {
  return transactions.reduce(
    (balance, transaction) => addCents(balance, signedAmount(transaction)),
    0,
  )
}

function groupBy(
  transactions: readonly Transaction[],
  keyOf: (transaction: Transaction) => string,
): Map<string, TransactionGroup> {
  const groups = new Map<string, TransactionGroup>()
  for (const transaction of transactions) {
    const key = keyOf(transaction)
    let group = groups.get(key)
    if (!group) {
      group = { ...EMPTY_TOTALS, transactions: [] }
      groups.set(key, group)
    }
    group.transactions.push(transaction)
    accumulate(group, transaction)
  }
  return groups
}

/** Totais e lançamentos por data `YYYY-MM-DD`, na ordem em que as datas aparecem. */
export function groupByDay(
  transactions: readonly Transaction[],
): Map<DateString, TransactionGroup> {
  return groupBy(transactions, (transaction) => transaction.date)
}

/** Totais e lançamentos por mês `YYYY-MM`, na ordem em que os meses aparecem. */
export function groupByMonth(
  transactions: readonly Transaction[],
): Map<PeriodString, TransactionGroup> {
  return groupBy(transactions, (transaction) => transaction.date.slice(0, 7))
}

/** Totais e lançamentos por `tagId`, na ordem em que as tags aparecem. */
export function groupByTag(transactions: readonly Transaction[]): Map<string, TransactionGroup> {
  return groupBy(transactions, (transaction) => transaction.tagId)
}

/** Índice do primeiro subperíodo cujo fim é >= `date` (busca binária). */
function findBucketIndex(buckets: readonly DateRange[], date: DateString): number {
  let low = 0
  let high = buckets.length
  while (low < high) {
    const middle = (low + high) >>> 1
    if (buckets[middle].end < date) low = middle + 1
    else high = middle
  }
  return low
}

/**
 * RF-06 — saldo acumulado ao fim de cada subperíodo (gráfico de linha). Os lançamentos
 * anteriores ao primeiro subperíodo formam o saldo inicial; os posteriores ao último são
 * ignorados. `buckets` deve vir em ordem cronológica, contíguo e sem sobreposição.
 */
export function runningBalance(
  transactions: readonly Transaction[],
  buckets: readonly DateRange[],
): Cents[] {
  if (buckets.length === 0) return []

  const firstStart = buckets[0].start
  const lastEnd = buckets[buckets.length - 1].end
  const deltas = new Array<Cents>(buckets.length).fill(0)
  let balance: Cents = 0

  for (const transaction of transactions) {
    if (transaction.date < firstStart) {
      balance = addCents(balance, signedAmount(transaction))
    } else if (transaction.date <= lastEnd) {
      const index = findBucketIndex(buckets, transaction.date)
      deltas[index] = addCents(deltas[index], signedAmount(transaction))
    }
  }

  return deltas.map((delta) => {
    balance = addCents(balance, delta)
    return balance
  })
}
