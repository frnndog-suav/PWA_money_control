import type { AppDatabase } from '@/db/database'
import type { SampleData } from '@/dev/sampleData/buildSampleData'

// §6.11 — gravação e limpeza dos dados de exemplo (somente desenvolvimento; por isso pode
// usar o banco diretamente). Tudo numa transação só (princípio 8): ou grava tudo, ou nada.
// Os ajustes (tabela settings: tema, persistRequested) são mantidos.

function dataTables(database: AppDatabase) {
  return [database.tags, database.transactions, database.recurrings, database.installmentGroups]
}

/** Apaga tags, lançamentos, recorrentes e parcelamentos. */
export async function clearAllData(database: AppDatabase): Promise<void> {
  const tables = dataTables(database)
  await database.transaction('rw', tables, () => Promise.all(tables.map((table) => table.clear())))
}

/** Substitui todos os dados pelos dados de exemplo. */
export async function replaceWithSampleData(
  database: AppDatabase,
  data: SampleData,
): Promise<void> {
  const tables = dataTables(database)
  await database.transaction('rw', tables, async () => {
    await Promise.all(tables.map((table) => table.clear()))
    await Promise.all([
      database.tags.bulkAdd(data.tags),
      database.transactions.bulkAdd(data.transactions),
      database.recurrings.bulkAdd(data.recurrings),
      database.installmentGroups.bulkAdd(data.installmentGroups),
    ])
  })
}
