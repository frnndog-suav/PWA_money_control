import { afterEach, describe, expect, it, vi } from 'vitest'
import { db } from '@/db/database'
import { THEME_STORAGE_KEY } from '@/lib/theme'
import { createBackupFile, openBackupFile, restoreBackup } from '@/repositories/backupRepository'
import { generateBackupDataset } from '@/test/backupDataset'

// CA-10.1 / D-28 / D-47 (d) — o tema importado vai para o Dexie (fonte da verdade) e para o
// espelho em localStorage lido pelo script do index.html. Projeto `dom` (localStorage real
// do jsdom), listado em DOM_TEST_FILES (D-46).

const FAST = { iterations: 1 }
const PASSWORD = 'senha do tema'

afterEach(() => {
  vi.restoreAllMocks()
})

async function backupWithTheme(theme: string | null) {
  const dataset = generateBackupDataset(51)
  dataset.settings = theme ? [{ key: 'theme', value: theme }] : []
  await db.transaction('rw', db.tables, async () => {
    await db.tags.bulkAdd(dataset.tags)
    await db.recurrings.bulkAdd(dataset.recurrings)
    await db.installmentGroups.bulkAdd(dataset.installmentGroups)
    await db.transactions.bulkAdd(dataset.transactions)
    await db.settings.bulkAdd(dataset.settings)
  })
  const data = (await openBackupFile(await createBackupFile(PASSWORD, FAST), PASSWORD)).data
  await db.transaction('rw', db.tables, () => Promise.all(db.tables.map((table) => table.clear())))
  return data
}

describe('restoreBackup — tema no Dexie e no espelho do localStorage (D-28)', () => {
  it.each(['system', 'light', 'dark'])(
    'tema %s do backup é gravado nos dois lugares',
    async (theme) => {
      const data = await backupWithTheme(theme)
      await db.settings.put({ key: 'theme', value: theme === 'dark' ? 'light' : 'dark' })
      localStorage.setItem(THEME_STORAGE_KEY, theme === 'dark' ? 'light' : 'dark')

      await expect(restoreBackup(data)).resolves.toBe(theme)

      expect(await db.settings.get('theme')).toEqual({ key: 'theme', value: theme })
      expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe(theme)
    },
  )

  it('backup sem tema → "system" nos dois lugares (D-47 d)', async () => {
    const data = await backupWithTheme(null)
    await db.settings.put({ key: 'theme', value: 'dark' })
    localStorage.setItem(THEME_STORAGE_KEY, 'dark')

    await expect(restoreBackup(data)).resolves.toBe('system')

    expect(await db.settings.get('theme')).toEqual({ key: 'theme', value: 'system' })
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('system')
  })

  it('falha na transação → espelho do localStorage continua com o tema anterior', async () => {
    const data = await backupWithTheme('dark')
    await db.settings.put({ key: 'theme', value: 'light' })
    localStorage.setItem(THEME_STORAGE_KEY, 'light')
    vi.spyOn(db.transactions, 'bulkAdd').mockRejectedValueOnce(new Error('disco cheio'))

    await expect(restoreBackup(data)).rejects.toThrow('disco cheio')

    expect(await db.settings.get('theme')).toEqual({ key: 'theme', value: 'light' })
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('light')
  })

  it('localStorage bloqueado não impede a importação (o Dexie continua a fonte da verdade)', async () => {
    const data = await backupWithTheme('dark')
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('bloqueado', 'SecurityError')
    })

    await expect(restoreBackup(data)).resolves.toBe('dark')
    expect(await db.settings.get('theme')).toEqual({ key: 'theme', value: 'dark' })
  })
})
