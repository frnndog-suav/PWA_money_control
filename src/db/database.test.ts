import { describe, expect, it } from 'vitest'
import { db, SCHEMA_VERSION } from '@/db/database'

describe('database (§6.4)', () => {
  it('está na versão 1 do esquema', async () => {
    await db.open()
    expect(SCHEMA_VERSION).toBe(1)
    expect(db.verno).toBe(SCHEMA_VERSION)
  })

  it('tem as tabelas e os índices da §6.4', () => {
    const schema = Object.fromEntries(
      db.tables.map((table) => [
        table.name,
        {
          primaryKey: table.schema.primKey.name,
          indexes: table.schema.indexes.map((index) => index.name).sort(),
        },
      ]),
    )
    expect(schema).toEqual({
      tags: { primaryKey: 'id', indexes: ['nameKey'] },
      transactions: {
        primaryKey: 'id',
        indexes: [
          '[recurringId+recurringPeriod]',
          'date',
          'installmentGroupId',
          'recurringId',
          'tagId',
          'type',
        ],
      },
      recurrings: { primaryKey: 'id', indexes: [] },
      installmentGroups: { primaryKey: 'id', indexes: [] },
      settings: { primaryKey: 'key', indexes: [] },
    })
  })

  // RF-03 — o índice &nameKey é único.
  it('o índice nameKey das tags é único', () => {
    const nameKey = db.tags.schema.idxByName.nameKey
    expect(nameKey.unique).toBe(true)
  })
})
