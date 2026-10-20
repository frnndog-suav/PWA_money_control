import { db } from '@/db/database'
import type { InstallmentGroup, Recurring, Tag, Transaction } from '@/domain/types'

// Acesso direto ao banco só para preparar e conferir testes de tela, que não podem
// importar o Dexie (princípio 7), enquanto os repositórios dessas tabelas não existem.

interface SeedRecords {
  transactions?: Transaction[]
  recurrings?: Recurring[]
  installmentGroups?: InstallmentGroup[]
}

export async function seedRecords(records: SeedRecords): Promise<void> {
  await db.transaction('rw', [db.transactions, db.recurrings, db.installmentGroups], async () => {
    await db.transactions.bulkAdd(records.transactions ?? [])
    await db.recurrings.bulkAdd(records.recurrings ?? [])
    await db.installmentGroups.bulkAdd(records.installmentGroups ?? [])
  })
}

export function readAllTags(): Promise<Tag[]> {
  return db.tags.toArray()
}
