import { describe, expect, it } from 'vitest'
import { db } from '@/db/database'
import { getSetting, setSetting } from '@/repositories/settingsRepository'

// §6.3 / §6.4 — tabela `settings` (chave → texto): leitura, escrita e atualização.

describe('settingsRepository — leitura, escrita e atualização', () => {
  it('as três chaves da §6.3 são independentes', async () => {
    await setSetting('theme', 'dark')
    await setSetting('lastBackupAt', '2026-10-19T12:00:00.000Z')
    await setSetting('persistRequested', '2026-10-18T09:00:00.000Z')

    await expect(getSetting('theme')).resolves.toBe('dark')
    await expect(getSetting('lastBackupAt')).resolves.toBe('2026-10-19T12:00:00.000Z')
    await expect(getSetting('persistRequested')).resolves.toBe('2026-10-18T09:00:00.000Z')

    await setSetting('theme', 'light')
    await expect(getSetting('theme')).resolves.toBe('light')
    await expect(getSetting('lastBackupAt')).resolves.toBe('2026-10-19T12:00:00.000Z')
  })

  it('atualizar não cria um segundo registro e grava no formato { key, value }', async () => {
    await setSetting('theme', 'dark')
    await setSetting('theme', 'system')
    expect(await db.settings.toArray()).toEqual([{ key: 'theme', value: 'system' }])
  })

  it('guarda texto vazio como valor (diferente de ausente)', async () => {
    await setSetting('lastBackupAt', '')
    await expect(getSetting('lastBackupAt')).resolves.toBe('')
  })
})
