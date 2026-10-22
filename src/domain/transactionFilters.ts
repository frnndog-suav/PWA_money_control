import { groupByDay, type Totals, type TransactionGroup } from '@/domain/balances'
import { addCents } from '@/domain/money'
import { foldText } from '@/domain/text'
import type { DateString, Transaction, TransactionType } from '@/domain/types'

// RF-04 — filtros da lista de lançamentos, agrupamento por dia e totais do conjunto filtrado.
// Funções puras (princípio 6); a lista precisa responder em < 300 ms com 10.000 lançamentos
// (RNF-02 / CA-04.6), então cada etapa percorre os dados uma vez só.

export type TransactionTypeFilter = 'all' | TransactionType

/** §6.7 — filtros da lista (estado de interface no Zustand). */
export interface TransactionFilters {
  /** Texto procurado na descrição; vazio = sem filtro. */
  text: string
  type: TransactionTypeFilter
  /** `null` = todas as tags. */
  tagId: string | null
  /** Data inicial inclusiva, ou `null`. */
  from: DateString | null
  /** Data final inclusiva, ou `null`. */
  to: DateString | null
}

export type DatePeriod = Pick<TransactionFilters, 'from' | 'to'>

export const EMPTY_TRANSACTION_FILTERS: TransactionFilters = {
  text: '',
  type: 'all',
  tagId: null,
  from: null,
  to: null,
}

/** Lançamentos de um dia, com os totais de entrada e saída do dia (CA-04.1). */
export interface DayGroup extends TransactionGroup {
  date: DateString
}

export interface TransactionListSummary {
  /** Dias do mais recente para o mais antigo. */
  days: DayGroup[]
  /** CA-04.3 — totais do conjunto filtrado inteiro (não só da parte visível da lista). */
  totals: Totals
  count: number
}

/** Data inicial posterior à final: o período é inválido e não é aplicado. */
export function isPeriodInverted({ from, to }: DatePeriod): boolean {
  return from !== null && to !== null && from > to
}

/** Período que de fato filtra: o informado ou, se for inválido, nenhum limite. */
export function effectivePeriod(period: DatePeriod): DatePeriod {
  return isPeriodInverted(period) ? { from: null, to: null } : { from: period.from, to: period.to }
}

/** Texto da busca pronto para comparar: sem acentos, minúsculo e sem espaços nas pontas. */
function toSearchKey(text: string): string {
  return foldText(text).trim()
}

/**
 * Quantos filtros estão preenchidos (para o contador "Filtros" e o "Limpar filtros" —
 * CA-04.4). O período conta como um só, mesmo inválido: os campos continuam preenchidos.
 */
export function countActiveFilters(filters: TransactionFilters): number {
  let count = 0
  if (toSearchKey(filters.text) !== '') count++
  if (filters.type !== 'all') count++
  if (filters.tagId !== null) count++
  if (filters.from !== null || filters.to !== null) count++
  return count
}

export function hasActiveFilters(filters: TransactionFilters): boolean {
  return countActiveFilters(filters) > 0
}

/**
 * CA-04.2 — critério combinado (todos os filtros ao mesmo tempo). O texto é procurado por
 * "contém", sem diferenciar maiúsculas e acentos ("merc" acha "Mercado" e "mercado do bairro").
 */
export function createTransactionMatcher(
  filters: TransactionFilters,
): (transaction: Transaction) => boolean {
  const searchKey = toSearchKey(filters.text)
  const { type, tagId } = filters
  const { from, to } = effectivePeriod(filters)

  // Os testes baratos (comparação de strings curtas) vêm antes da normalização do texto.
  return (transaction) =>
    (type === 'all' || transaction.type === type) &&
    (tagId === null || transaction.tagId === tagId) &&
    (from === null || transaction.date >= from) &&
    (to === null || transaction.date <= to) &&
    (searchKey === '' || foldText(transaction.description).includes(searchKey))
}

/** Os lançamentos que passam por todos os filtros, na mesma ordem (uma passada). */
export function filterTransactions(
  transactions: readonly Transaction[],
  filters: TransactionFilters,
): Transaction[] {
  return transactions.filter(createTransactionMatcher(filters))
}

/**
 * CA-04.1 / CA-04.3 — filtra, agrupa por dia e totaliza. `transactions` deve vir do mais
 * recente para o mais antigo (como o repositório entrega): os dias saem na mesma ordem.
 */
export function summarizeTransactionList(
  transactions: readonly Transaction[],
  filters: TransactionFilters,
): TransactionListSummary {
  const filtered = filterTransactions(transactions, filters)
  const days: DayGroup[] = []
  let incomeCents = 0
  let expenseCents = 0
  // Os totais gerais saem dos totais de cada dia: uma volta pelos dias, não pelos lançamentos.
  for (const [date, group] of groupByDay(filtered)) {
    days.push({ date, ...group })
    incomeCents = addCents(incomeCents, group.incomeCents)
    expenseCents = addCents(expenseCents, group.expenseCents)
  }
  const resultCents = addCents(incomeCents, -expenseCents)
  return { days, totals: { incomeCents, expenseCents, resultCents }, count: filtered.length }
}

export interface VisibleDays {
  /** Quantos dias (do início da lista) aparecem. */
  dayCount: number
  /** Quantos lançamentos há nesses dias. */
  itemCount: number
}

/**
 * CA-04.6 — paginação incremental por dias inteiros: os primeiros dias até somar pelo menos
 * `itemTarget` lançamentos (ou acabarem os dias). Um dia nunca é cortado ao meio; para a
 * próxima página, peça `itemCount + tamanho da página`, que sempre acrescenta ao menos um dia.
 */
export function countVisibleDays(days: readonly DayGroup[], itemTarget: number): VisibleDays {
  let dayCount = 0
  let itemCount = 0
  while (dayCount < days.length && itemCount < itemTarget) {
    itemCount += days[dayCount].transactions.length
    dayCount++
  }
  return { dayCount, itemCount }
}
