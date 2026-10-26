import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db/database'
import {
  confirmedOccurrenceKeys,
  endRecurring,
  lastConfirmedPeriod,
  occurrenceStatus,
  pendingOccurrences,
  setAmountFrom,
  skipPeriod,
  unskipPeriod,
  type PendingOccurrence,
} from '@/domain/recurring'
import {
  amountChangeSchema,
  confirmOccurrenceSchema,
  endRecurringSchema,
  recurringDetailsSchema,
  recurringInputSchema,
  type AmountChangeInput,
  type ConfirmOccurrenceInput,
  type EndRecurringInput,
  type RecurringDetailsInput,
  type RecurringInput,
} from '@/domain/recurringSchema'
import type { PeriodString, Recurring, Transaction } from '@/domain/types'

// RF-07 — tabela `recurrings` e os lançamentos confirmados (vínculo `[recurringId+recurringPeriod]`
// em `transactions`). Princípio 7: a interface só chega ao Dexie por aqui; princípio 8: toda
// operação que lê e grava mais de um registro roda numa transação.

export class RecurringNotFoundError extends Error {
  constructor(id: string) {
    super(`Recorrente não encontrado: ${id}`)
    this.name = 'RecurringNotFoundError'
  }
}

/** D-01 — a tag escolhida não existe (ex.: foi excluída em outra aba). */
export class RecurringTagNotFoundError extends Error {
  constructor(tagId: string) {
    super(`Tag não encontrada: ${tagId}`)
    this.name = 'RecurringTagNotFoundError'
  }
}

/** CA-07.5 — a ocorrência já virou lançamento (ex.: confirmada em outra aba). */
export class OccurrenceAlreadyConfirmedError extends Error {
  constructor() {
    super('Esta ocorrência já foi confirmada.')
    this.name = 'OccurrenceAlreadyConfirmedError'
  }
}

/** A ocorrência não existe mais como pendente (mês pulado ou fora do período do recorrente). */
export class OccurrenceNotPendingError extends Error {
  constructor() {
    super('Esta ocorrência não está mais pendente.')
    this.name = 'OccurrenceNotPendingError'
  }
}

/** RF-07 — excluir só sem ocorrência confirmada; com alguma, o app sugere "Encerrar". */
export class RecurringHasConfirmationsError extends Error {
  constructor() {
    super('O recorrente tem ocorrências confirmadas.')
    this.name = 'RecurringHasConfirmationsError'
  }
}

/** RF-07 — o que fazer com a ocorrência ao excluir o lançamento confirmado. */
export type AfterConfirmedDelete = 'pending' | 'skip'

async function assertTagExists(tagId: string): Promise<void> {
  if ((await db.tags.where('id').equals(tagId).count()) === 0) {
    throw new RecurringTagNotFoundError(tagId)
  }
}

async function getExisting(id: string): Promise<Recurring> {
  const recurring = await db.recurrings.get(id)
  if (!recurring) throw new RecurringNotFoundError(id)
  return recurring
}

function confirmationsOf(recurringId: string) {
  return db.transactions.where('recurringId').equals(recurringId)
}

async function isConfirmed(recurringId: string, period: PeriodString): Promise<boolean> {
  const count = await db.transactions
    .where('[recurringId+recurringPeriod]')
    .equals([recurringId, period])
    .count()
  return count > 0
}

/** Só uma ocorrência pendente pode ser confirmada ou pulada (CA-07.5). */
async function assertPending(recurring: Recurring, period: PeriodString): Promise<void> {
  if (await isConfirmed(recurring.id, period)) throw new OccurrenceAlreadyConfirmedError()
  if (occurrenceStatus(recurring, period, NO_CONFIRMATIONS) !== 'pending') {
    throw new OccurrenceNotPendingError()
  }
}

const NO_CONFIRMATIONS: ReadonlySet<string> = new Set()

async function save(recurring: Recurring): Promise<Recurring> {
  const updated = { ...recurring, updatedAt: new Date().toISOString() }
  await db.recurrings.put(updated)
  return updated
}

/** Lê, aplica `change` (regra do domínio) e grava, tudo na mesma transação. */
function updateRecurring(
  id: string,
  change: (recurring: Recurring) => Promise<Recurring> | Recurring,
): Promise<Recurring> {
  return db.transaction('rw', [db.tags, db.recurrings, db.transactions], async () =>
    save(await change(await getExisting(id))),
  )
}

/** RF-07 — novo recorrente; o 1º valor vale desde o mês de início (§6.3). */
export async function createRecurring(input: RecurringInput): Promise<Recurring> {
  const values = recurringInputSchema.parse(input)
  const now = new Date().toISOString()
  const recurring: Recurring = {
    id: crypto.randomUUID(),
    type: values.type,
    description: values.description,
    tagId: values.tagId,
    startPeriod: values.startPeriod,
    endPeriod: values.endPeriod === '' ? null : values.endPeriod,
    amounts: [{ fromPeriod: values.startPeriod, amountCents: values.amountCents }],
    skippedPeriods: [],
    createdAt: now,
    updatedAt: now,
  }
  await db.transaction('rw', [db.tags, db.recurrings], async () => {
    await assertTagExists(recurring.tagId)
    await db.recurrings.add(recurring)
  })
  return recurring
}

/** D-51 — editar muda só descrição e tag; os lançamentos já confirmados não mudam. */
export function updateRecurringDetails(
  id: string,
  input: RecurringDetailsInput,
): Promise<Recurring> {
  const { description, tagId } = recurringDetailsSchema.parse(input)
  return updateRecurring(id, async (recurring) => {
    await assertTagExists(tagId)
    return { ...recurring, description, tagId }
  })
}

/** CA-07.3 — novo valor a partir de um mês; confirmadas não mudam. */
export function changeRecurringAmount(id: string, input: AmountChangeInput): Promise<Recurring> {
  const { fromPeriod, amountCents } = amountChangeSchema.parse(input)
  return updateRecurring(id, (recurring) => setAmountFrom(recurring, fromPeriod, amountCents))
}

/** RF-07 "Encerrar" — não pode ser antes do último mês confirmado (D-51). */
export function endRecurringAt(id: string, input: EndRecurringInput): Promise<Recurring> {
  const { endPeriod } = endRecurringSchema.parse(input)
  return updateRecurring(id, async (recurring) => {
    const last = lastConfirmedPeriod(await confirmationsOf(id).toArray())
    return endRecurring(recurring, endPeriod, last)
  })
}

/** RF-07 — exclui só sem ocorrência confirmada (contagem e exclusão na mesma transação). */
export async function deleteRecurring(id: string): Promise<void> {
  await db.transaction('rw', [db.recurrings, db.transactions], async () => {
    if ((await confirmationsOf(id).count()) > 0) throw new RecurringHasConfirmationsError()
    await db.recurrings.delete(id)
  })
}

/** CA-07.4 — pula uma ocorrência pendente. */
export function skipOccurrence(id: string, period: PeriodString): Promise<Recurring> {
  return updateRecurring(id, async (recurring) => {
    await assertPending(recurring, period)
    return skipPeriod(recurring, period)
  })
}

/** CA-07.4 — desfaz o pulo: a ocorrência volta a pendente. */
export function unskipOccurrence(id: string, period: PeriodString): Promise<Recurring> {
  return updateRecurring(id, (recurring) => unskipPeriod(recurring, period))
}

/**
 * RF-07 "Confirmar" / CA-07.2 / CA-07.5 — cria o lançamento vinculado ao recorrente e ao mês,
 * com o tipo do recorrente e os dados escolhidos só para esta ocorrência. A checagem pelo
 * índice `[recurringId+recurringPeriod]` e a gravação ficam na mesma transação: a mesma
 * ocorrência nunca é confirmada duas vezes.
 */
export async function confirmOccurrence(
  id: string,
  period: PeriodString,
  input: ConfirmOccurrenceInput,
): Promise<Transaction> {
  const values = confirmOccurrenceSchema(period).parse(input)
  return db.transaction('rw', [db.tags, db.recurrings, db.transactions], async () => {
    const recurring = await getExisting(id)
    await assertPending(recurring, period)
    await assertTagExists(values.tagId)
    const now = new Date().toISOString()
    const transaction: Transaction = {
      id: crypto.randomUUID(),
      type: recurring.type,
      ...values,
      recurringId: id,
      recurringPeriod: period,
      installmentGroupId: null,
      installmentNumber: null,
      createdAt: now,
      updatedAt: now,
    }
    await db.transactions.add(transaction)
    return transaction
  })
}

/**
 * RF-07 — exclui o lançamento confirmado; a ocorrência volta a pendente ou o mês é pulado. Na
 * mesma transação: nunca fica o lançamento apagado sem o mês pulado (ou o contrário).
 */
export async function deleteConfirmedTransaction(
  transactionId: string,
  afterwards: AfterConfirmedDelete,
): Promise<void> {
  await db.transaction('rw', [db.recurrings, db.transactions], async () => {
    const transaction = await db.transactions.get(transactionId)
    if (!transaction) return
    await db.transactions.delete(transactionId)
    const { recurringId, recurringPeriod } = transaction
    if (afterwards !== 'skip' || recurringId === null || recurringPeriod === null) return
    const recurring = await db.recurrings.get(recurringId)
    if (recurring) await save(skipPeriod(recurring, recurringPeriod))
  })
}

// ---------- leituras ----------

const descriptionCollator = new Intl.Collator('pt-BR', { sensitivity: 'base' })

/** CA-07.6 — todos os recorrentes (ativos e encerrados), pela descrição. */
export async function listRecurrings(): Promise<Recurring[]> {
  const recurrings = await db.recurrings.toArray()
  return recurrings.sort((a, b) => descriptionCollator.compare(a.description, b.description))
}

/** Lançamentos confirmados de um recorrente, do mês mais recente ao mais antigo. */
export async function listRecurringConfirmations(recurringId: string): Promise<Transaction[]> {
  const transactions = await confirmationsOf(recurringId).toArray()
  return transactions.sort((a, b) =>
    (b.recurringPeriod ?? '').localeCompare(a.recurringPeriod ?? ''),
  )
}

/**
 * Lançamentos confirmados dos recorrentes nos meses informados, pelo índice composto
 * `[recurringId+recurringPeriod]` (§6.4): uma leitura só, sem varrer a tabela.
 */
async function confirmationsIn(
  recurrings: readonly Recurring[],
  periods: readonly PeriodString[],
): Promise<Transaction[]> {
  const keys = recurrings.flatMap((recurring) => periods.map((period) => [recurring.id, period]))
  if (keys.length === 0) return []
  return db.transactions.where('[recurringId+recurringPeriod]').anyOf(keys).toArray()
}

/** RF-02 item 4 / RF-05 — pendências de cada mês informado (CA-07.1 / CA-07.7). */
export async function listPendingOccurrences(
  periods: readonly PeriodString[],
): Promise<Map<PeriodString, PendingOccurrence[]>> {
  return db.transaction('r', [db.recurrings, db.transactions], async () => {
    const recurrings = await db.recurrings.toArray()
    const confirmed = await confirmationsIn(recurrings, periods)
    return new Map(
      periods.map((period) => [period, pendingOccurrences(recurrings, confirmed, period)]),
    )
  })
}

/** CA-07.6 — chaves das ocorrências confirmadas do mês (status de cada recorrente). */
export async function getConfirmedKeysIn(period: PeriodString): Promise<Set<string>> {
  return db.transaction('r', [db.recurrings, db.transactions], async () =>
    confirmedOccurrenceKeys(await confirmationsIn(await db.recurrings.toArray(), [period])),
  )
}

// Hooks ao vivo: `undefined` enquanto carrega.

export function useRecurrings(): Recurring[] | undefined {
  return useLiveQuery(listRecurrings, [])
}

/** `null` quando o recorrente não existe (ou foi excluído). */
export function useRecurring(id: string): Recurring | null | undefined {
  return useLiveQuery(async () => (await db.recurrings.get(id)) ?? null, [id])
}

export function useRecurringConfirmations(recurringId: string): Transaction[] | undefined {
  return useLiveQuery(() => listRecurringConfirmations(recurringId), [recurringId])
}

export function useConfirmedKeysIn(period: PeriodString): Set<string> | undefined {
  return useLiveQuery(() => getConfirmedKeysIn(period), [period])
}

/**
 * Pendências por mês. Volta a `undefined` enquanto meses novos carregam, para nunca mostrar as
 * pendências de outro período com o título novo (como o `useTransactionsInRange`).
 */
export function usePendingOccurrences(
  periods: readonly PeriodString[],
): Map<PeriodString, PendingOccurrence[]> | undefined {
  const key = periods.join(',')
  const result = useLiveQuery(
    async () => ({ key, pending: await listPendingOccurrences(periods) }),
    [key],
  )
  return result?.key === key ? result.pending : undefined
}
