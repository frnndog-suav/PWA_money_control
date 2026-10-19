import { describe, expect, it } from 'vitest'
import { db } from '@/db/database'
import { buildSampleData } from '@/dev/sampleData/buildSampleData'
import { clearAllData, replaceWithSampleData } from '@/dev/sampleData/sampleDataStore'

describe('sampleDataStore (§6.11)', () => {
  const data = buildSampleData('2026-10-19')

  async function counts() {
    return {
      tags: await db.tags.count(),
      transactions: await db.transactions.count(),
      recurrings: await db.recurrings.count(),
      installmentGroups: await db.installmentGroups.count(),
    }
  }

  it('grava os dados de exemplo, substituindo os anteriores', async () => {
    await replaceWithSampleData(db, data)
    await replaceWithSampleData(db, data)
    expect(await counts()).toEqual({
      tags: 12,
      transactions: 5000,
      recurrings: 4,
      installmentGroups: 3,
    })
  })

  it('apaga todos os dados e mantém os ajustes', async () => {
    await db.settings.put({ key: 'theme', value: 'dark' })
    await replaceWithSampleData(db, data)
    await clearAllData(db)
    expect(await counts()).toEqual({
      tags: 0,
      transactions: 0,
      recurrings: 0,
      installmentGroups: 0,
    })
    expect(await db.settings.get('theme')).toEqual({ key: 'theme', value: 'dark' })
  })

  // Princípio 8 — falha no meio não deixa dados pela metade.
  it('é atômico: se uma gravação falha, nada muda', async () => {
    await replaceWithSampleData(db, data)
    const duplicatedTag = { ...data.tags[1], id: 'outro-id' } // viola &nameKey
    const broken = { ...data, tags: [...data.tags, duplicatedTag] }
    await expect(replaceWithSampleData(db, broken)).rejects.toThrow()
    expect((await counts()).transactions).toBe(5000)
  })
})
