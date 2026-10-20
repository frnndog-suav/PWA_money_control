import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db/database'
import { overallBalance, totals, type Totals } from '@/domain/balances'
import { monthRange } from '@/domain/dates'
import { takeMostRecent } from '@/domain/transactions'
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

/** CA-01.5 — altera os campos editáveis; os vínculos (RF-07/RF-08) são mantidos. */
export async function updateTransaction(id: string, input: TransactionInput): Promise<Transaction> {
  const fields = toEditableFields(input)
  return db.transaction('rw', [db.tags, db.transactions], async () => {
    const current = await db.transactions.get(id)
    if (!current) throw new TransactionNotFoundError(id)
    await assertTagExists(fields.tagId)
    const updated: Transaction = { ...current, ...fields, updatedAt: new Date().toISOString() }
    await db.transactions.put(updated)
    return updated
  })
}

/** CA-01.6 — exclusão simples (as regras de recorrentes e parcelas chegam nas Fases 9 e 10). */
export async function deleteTransaction(id: string): Promise<void> {
  await db.transactions.delete(id)
}

export async function getTransaction(id: string): Promise<Transaction | undefined> {
  return db.transactions.get(id)
}

/**
 * D-03 / CA-02.3 — saldo geral (só `date <= today`). Lê pelo índice `date` com `toArray()`,
 * que o Dexie resolve com um único `getAll()` nativo, e soma no domínio. Somar com `each()`
 * evitaria o array, mas abre um cursor com uma volta ao IndexedDB por registro, bem mais
 * lento com 10.000 lançamentos (RNF-02); o array temporário é de poucos MB.
 */
export async function getOverallBalance(today: DateString): Promise<Cents> {
  const transactions = await db.transactions.where('date').belowOrEqual(today).toArray()
  return overallBalance(transactions, today)
}

/** CA-02.3 — entradas, saídas e resultado do mês, inclusive datas futuras dentro dele. */
export async function getMonthTotals(period: PeriodString): Promise<Totals> {
  const { start, end } = monthRange(period)
  return totals(await db.transactions.where('date').between(start, end, true, true).toArray())
}

/**
 * RF-02 item 5 — os `count` mais recentes por data e, no mesmo dia, por criação. O índice só
 * ordena por data: pega os `count` de datas mais altas para achar a data de corte e relê
 * todos os lançamentos desde ela, para o desempate por criação valer também nesse dia.
 */
export async function listRecentTransactions(count: number): Promise<Transaction[]> {
  return db.transaction('r', db.transactions, async () => {
    const newest = await db.transactions.orderBy('date').reverse().limit(count).toArray()
    if (newest.length < count) return takeMostRecent(newest, count)
    const cutoffDate = newest[newest.length - 1].date
    const candidates = await db.transactions.where('date').aboveOrEqual(cutoffDate).toArray()
    return takeMostRecent(candidates, count)
  })
}

// Hooks ao vivo (`useLiveQuery`): `undefined` enquanto carrega; a tela se atualiza sozinha
// quando a tabela muda (CA-02.4).

export function useOverallBalance(today: DateString): Cents | undefined {
  return useLiveQuery(() => getOverallBalance(today), [today])
}

export function useMonthTotals(period: PeriodString): Totals | undefined {
  return useLiveQuery(() => getMonthTotals(period), [period])
}

export function useRecentTransactions(count: number): Transaction[] | undefined {
  return useLiveQuery(() => listRecentTransactions(count), [count])
}

/** `null` quando o lançamento não existe (ou foi excluído). */
export function useTransaction(id: string): Transaction | null | undefined {
  return useLiveQuery(async () => (await getTransaction(id)) ?? null, [id])
}
