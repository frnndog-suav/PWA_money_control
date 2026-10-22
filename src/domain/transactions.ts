import type { Transaction } from '@/domain/types'

// RF-02 item 5 / RF-04 — ordem dos "Últimos lançamentos" e da lista: por data e, no mesmo dia,
// por criação.
// (O corte por data até hoje — D-40 — é feito na consulta, pelo índice `date`.)

/** Mais recente primeiro: data, depois `createdAt` e, por fim, `id` (ordem estável). */
export function compareByRecency(a: Transaction, b: Transaction): number {
  // Strings YYYY-MM-DD e ISO 8601 em UTC comparadas como texto seguem a ordem cronológica.
  if (a.date !== b.date) return a.date < b.date ? 1 : -1
  if (a.createdAt !== b.createdAt) return a.createdAt < b.createdAt ? 1 : -1
  if (a.id === b.id) return 0
  return a.id < b.id ? 1 : -1
}

/** Nova lista do mais recente para o mais antigo (RF-04 / CA-04.1); a original não é alterada. */
export function sortByRecency(transactions: readonly Transaction[]): Transaction[] {
  return transactions.toSorted(compareByRecency)
}

/** Os `count` lançamentos mais recentes (nova lista; a original não é alterada). */
export function takeMostRecent(transactions: readonly Transaction[], count: number): Transaction[] {
  return sortByRecency(transactions).slice(0, count)
}
