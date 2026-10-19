import { Dexie, type EntityTable } from 'dexie'
import type { InstallmentGroup, Recurring, Setting, Tag, Transaction } from '@/domain/types'

/**
 * §6.4 — versão atual do esquema. Toda mudança de esquema cria uma nova
 * `this.version(n)...upgrade(...)` e incrementa esta constante; nunca altere uma versão
 * já publicada. Também é gravada no backup (§6.8) e exibida em Ajustes → Sobre (CA-11.5).
 */
export const SCHEMA_VERSION = 1

export const DATABASE_NAME = 'money-control'

// Princípio 7 — só src/repositories (e as ferramentas de src/dev) importam este módulo.
export class AppDatabase extends Dexie {
  declare tags: EntityTable<Tag, 'id'>
  declare transactions: EntityTable<Transaction, 'id'>
  declare recurrings: EntityTable<Recurring, 'id'>
  declare installmentGroups: EntityTable<InstallmentGroup, 'id'>
  declare settings: EntityTable<Setting, 'key'>

  constructor() {
    super(DATABASE_NAME)
    this.version(1).stores({
      tags: 'id, &nameKey',
      transactions:
        'id, date, type, tagId, recurringId, [recurringId+recurringPeriod], installmentGroupId',
      recurrings: 'id',
      installmentGroups: 'id',
      settings: 'key',
    })
  }
}

export const db = new AppDatabase()
