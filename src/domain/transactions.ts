import type { Transaction } from '@/domain/types'

// RF-02 item 5 — ordem dos "Últimos lançamentos": por data e, no mesmo dia, por criação.
// (O corte por data até hoje — D-40 — é feito na consulta, pelo índice `date`.)

/** Mais recente primeiro: data, depois `createdAt` e, por fim, `id` (ordem estável). */
export function compareByRecency(a: Transaction, b: Transaction): number {
  // Strings YYYY-MM-DD e ISO 8601 em UTC comparadas como texto seguem a ordem cronológica.
  if (a.date !== b.date) return a.date < b.date ? 1 : -1
  if (a.createdAt !== b.createdAt) return a.createdAt < b.createdAt ? 1 : -1
  if (a.id === b.id) return 0
  return a.id < b.id ? 1 : -1
}

/** Os `count` lançamentos mais recentes (nova lista; a original não é alterada). */
export function takeMostRecent(transactions: readonly Transaction[], count: number): Transaction[] {
  return transactions.toSorted(compareByRecency).slice(0, count)
}
