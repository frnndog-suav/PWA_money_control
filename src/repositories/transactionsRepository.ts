import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db/database'
import { overallBalance, totals, type Totals } from '@/domain/balances'
import { isDateInPeriod, monthRange } from '@/domain/dates'
import { sortByRecency, takeMostRecent } from '@/domain/transactions'
import { transactionInputSchema, type TransactionInput } from '@/domain/transactionSchema'
import type { Cents, DateString, PeriodString, Transaction } from '@/domain/types'

// RF-01 / RF-02 — tabela `transactions`. Princípio 7: a interface só chega ao Dexie por aqui.
// Os cálculos (saldos, ordem) ficam no domínio; este módulo só busca pelos índices (§6.4).

/** O lançamento foi apagado (ex.: em outra aba) enquanto estava sendo editado. */
export class TransactionNotFoundError extends Error {
  constructor(id: string) {
    super(`Lançamento não encontrado: ${id}`)
    this.name = 'TransactionNotFoundError'
  }
}

/** D-01 — a tag escolhida não existe (ex.: foi excluída em outra aba). */
export class TransactionTagNotFoundError extends Error {
  constructor(tagId: string) {
    super(`Tag não encontrada: ${tagId}`)
    this.name = 'TransactionTagNotFoundError'
  }
}

/** D-51 — lançamento confirmado de recorrente com a data fora do mês da ocorrência. */
export class OccurrenceDateOutsidePeriodError extends Error {
  readonly period: PeriodString

  constructor(period: PeriodString) {
    super(`A data precisa estar em ${period}.`)
    this.name = 'OccurrenceDateOutsidePeriodError'
    this.period = period
  }
}

/** D-51 — o lançamento confirmado de um recorrente mantém o tipo do recorrente. */
export class OccurrenceTypeChangeError extends Error {
  constructor() {
    super('O tipo do lançamento de um recorrente não pode ser trocado.')
    this.name = 'OccurrenceTypeChangeError'
  }
}

type EditableFields = Pick<Transaction, 'type' | 'amountCents' | 'date' | 'tagId' | 'description'>

// Roda dentro de uma transação que inclui `tags`: a tag não pode sumir entre a checagem e a
// gravação, e o `deleteTag` conta os lançamentos na mesma tabela (D-02).
async function assertTagExists(tagId: string): Promise<void> {
  if ((await db.tags.where('id').equals(tagId).count()) === 0) {
    throw new TransactionTagNotFoundError(tagId)
  }
}

function toEditableFields(input: TransactionInput): EditableFields {
  const { type, amountCents, date, tagId, description } = transactionInputSchema.parse(input)
  return { type, amountCents, date, tagId, description }
}

/** CA-01.1 — lançamento avulso: sem vínculo com recorrente nem parcelamento. */
export async function createTransaction(input: TransactionInput): Promise<Transaction> {
  const fields = toEditableFields(input)
  const now = new Date().toISOString()
  const transaction: Transaction = {
    id: crypto.randomUUID(),
    ...fields,
    recurringId: null,
    recurringPeriod: null,
    installmentGroupId: null,
    installmentNumber: null,
    createdAt: now,
    updatedAt: now,
  }
  await db.transaction('rw', [db.tags, db.transactions], async () => {
    await assertTagExists(fields.tagId)
    await db.transactions.add(transaction)
  })
  return transaction
}

/**
 * CA-01.5 — altera os campos editáveis; os vínculos (RF-07/RF-08) são mantidos. O lançamento
 * confirmado de um recorrente continua no mês da ocorrência e com o tipo do recorrente (D-51).
 */
export async function updateTransaction(id: string, input: TransactionInput): Promise<Transaction> {
  const fields = toEditableFields(input)
  return db.transaction('rw', [db.tags, db.transactions], async () => {
    const current = await db.transactions.get(id)
    if (!current) throw new TransactionNotFoundError(id)
    const { recurringId, recurringPeriod } = current
    if (recurringId !== null && fields.type !== current.type) throw new OccurrenceTypeChangeError()
    if (recurringPeriod !== null && !isDateInPeriod(fields.date, recurringPeriod)) {
      throw new OccurrenceDateOutsidePeriodError(recurringPeriod)
    }
    await assertTagExists(fields.tagId)
    const updated: Transaction = { ...current, ...fields, updatedAt: new Date().toISOString() }
    await db.transactions.put(updated)
    return updated
  })
}

/**
 * CA-01.6 — exclusão simples. O lançamento confirmado de um recorrente é excluído pelo
 * `deleteConfirmedTransaction` (RF-07); as regras de parcelas chegam na Fase 10.
 */
export async function deleteTransaction(id: string): Promise<void> {
  await db.transactions.delete(id)
}

export async function getTransaction(id: string): Promise<Transaction | undefined> {
  return db.transactions.get(id)
}

/**
 * D-42 / CA-02.3 — saldo geral: todos os lançamentos, inclusive os com data futura. Lê a tabela
 * inteira com `toArray()`, que o Dexie resolve com um único `getAll()` nativo, e soma no domínio.
 * Somar com `each()` evitaria o array, mas abre um cursor com uma volta ao IndexedDB por registro,
 * bem mais lento com 10.000 lançamentos (RNF-02); o array temporário é de poucos MB.
 */
export async function getOverallBalance(): Promise<Cents> {
  return overallBalance(await db.transactions.toArray())
}

/** CA-02.3 — entradas, saídas e resultado do mês, inclusive datas futuras dentro dele. */
export async function getMonthTotals(period: PeriodString): Promise<Totals> {
  const { start, end } = monthRange(period)
  return totals(await db.transactions.where('date').between(start, end, true, true).toArray())
}

/**
 * RF-02 item 5 / D-40 — os `count` mais recentes com data até `today` (inclusive), por data e,
 * no mesmo dia, por criação. O índice só ordena por data: pega os `count` de datas mais altas
 * até hoje para achar a data de corte e relê todos os lançamentos entre ela e hoje, para o
 * desempate por criação valer também nesse dia.
 */
export async function listRecentTransactions(
  today: DateString,
  count: number,
): Promise<Transaction[]> {
  return db.transaction('r', db.transactions, async () => {
    const upToToday = db.transactions.where('date').belowOrEqual(today)
    const newest = await upToToday.reverse().limit(count).toArray()
    if (newest.length < count) return takeMostRecent(newest, count)
    const cutoffDate = newest[newest.length - 1].date
    const candidates = await db.transactions
      .where('date')
      .between(cutoffDate, today, true, true)
      .toArray()
    return takeMostRecent(candidates, count)
  })
}

/**
 * RF-04 / CA-04.1 — lançamentos do período (datas inclusivas; `null` = sem limite), do mais
 * recente para o mais antigo, inclusive os com data futura. Usa o índice `date` em ordem
 * crescente, que o Dexie lê com um único `getAll()` nativo; com `.reverse()` ele abriria um
 * cursor com uma volta ao IndexedDB por registro (o Safari não tem `getAll` com direção), bem
 * mais lento com 10.000 lançamentos (RNF-02). A inversão é feita no array, que então chega
 * quase ordenado ao desempate por criação (`sortByRecency`).
 */
export async function listTransactionsInPeriod(
  from: DateString | null,
  to: DateString | null,
): Promise<Transaction[]> {
  const ascending = await transactionsByDate(from, to).toArray()
  return sortByRecency(ascending.reverse())
}

function transactionsByDate(from: DateString | null, to: DateString | null) {
  if (from !== null && to !== null) {
    return db.transactions.where('date').between(from, to, true, true)
  }
  if (from !== null) return db.transactions.where('date').aboveOrEqual(from)
  if (to !== null) return db.transactions.where('date').belowOrEqual(to)
  return db.transactions.orderBy('date')
}

/** Quantos lançamentos existem (`count()` do IndexedDB, sem ler os registros). */
export async function countTransactions(): Promise<number> {
  return db.transactions.count()
}

// Hooks ao vivo (`useLiveQuery`): `undefined` enquanto carrega; a tela se atualiza sozinha
// quando a tabela muda (CA-02.4).

export function useOverallBalance(): Cents | undefined {
  return useLiveQuery(getOverallBalance, [])
}

export function useMonthTotals(period: PeriodString): Totals | undefined {
  return useLiveQuery(() => getMonthTotals(period), [period])
}

export function useRecentTransactions(today: DateString, count: number): Transaction[] | undefined {
  return useLiveQuery(() => listRecentTransactions(today, count), [today, count])
}

export function useTransactionsInPeriod(
  from: DateString | null,
  to: DateString | null,
): Transaction[] | undefined {
  return useLiveQuery(() => listTransactionsInPeriod(from, to), [from, to])
}

/**
 * RF-05 / CA-05.1 — como `useTransactionsInPeriod`, mas volta a `undefined` enquanto um período
 * novo carrega: o `useLiveQuery` manteria o resultado do período anterior até a nova leitura
 * terminar, e a tela mostraria por um instante os totais de outro período com o título novo.
 * `from = null` lê tudo até `to` (evolução do saldo — RF-06).
 */
export function useTransactionsInRange(
  from: DateString | null,
  to: DateString,
): Transaction[] | undefined {
  const result = useLiveQuery(
    async () => ({ from, to, transactions: await listTransactionsInPeriod(from, to) }),
    [from, to],
  )
  return result?.from === from && result.to === to ? result.transactions : undefined
}

export function useTransactionCount(): number | undefined {
  return useLiveQuery(countTransactions, [])
}

/** `null` quando o lançamento não existe (ou foi excluído). */
export function useTransaction(id: string): Transaction | null | undefined {
  return useLiveQuery(async () => (await getTransaction(id)) ?? null, [id])
}
