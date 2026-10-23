import { fireEvent, screen } from '@testing-library/react'
import { subDays } from 'date-fns'
import { afterEach, describe, expect, it } from 'vitest'
import { NO_TRANSACTIONS_MESSAGE } from '@/features/home/homeTexts'
import { setSetting } from '@/repositories/settingsRepository'
import { createTag } from '@/repositories/tagsRepository'
import { createTransaction } from '@/repositories/transactionsRepository'
import { renderApp } from '@/test/renderApp'

// RF-10 "Lembrete" / D-11 / D-48 (c) — "Último backup: …" sempre no Início: linha discreta sem
// aviso; com aviso, só o aviso (que já traz a frase).

const LAST_BACKUP_PATTERN = /Último backup:/

async function seedTransaction() {
  const tag = await createTag({ name: 'Mercado', color: '#16A34A' })
  await createTransaction({
    type: 'expense',
    amountCents: 1000,
    date: '2026-10-01',
    tagId: tag.id,
    description: 'Pão',
  })
}

async function openHome() {
  renderApp(['/'])
  await screen.findByRole('heading', { level: 1, name: 'Início' })
}

const backupDaysAgo = (days: number) => subDays(new Date(), days).toISOString()

const backupShortcutLink = () => screen.queryByRole('link', { name: 'Fazer backup' })

/** Quantos elementos mostram "Último backup: …" (o texto mais interno de cada um). */
const countLastBackupTexts = () => screen.queryAllByText(LAST_BACKUP_PATTERN).length

let observer: MutationObserver | undefined

afterEach(() => {
  observer?.disconnect()
  observer = undefined
})

describe('BackupReminder (RF-10 / D-11 / D-48)', () => {
  it('backup há 3 dias → linha "Último backup: há 3 dias", sem aviso', async () => {
    await seedTransaction()
    await setSetting('lastBackupAt', backupDaysAgo(3))
    await openHome()
    const line = await screen.findByRole('link', { name: 'Último backup: há 3 dias' })
    expect(backupShortcutLink()).toBeNull()
    expect(countLastBackupTexts()).toBe(1)

    // A linha leva à tela de backup.
    fireEvent.click(line)
    expect(await screen.findByRole('heading', { level: 1, name: 'Backup' })).toBeDefined()
  })

  it('backup hoje → "Último backup: hoje"', async () => {
    await seedTransaction()
    await setSetting('lastBackupAt', new Date().toISOString())
    await openHome()
    expect(await screen.findByText('Último backup: hoje')).toBeDefined()
    expect(backupShortcutLink()).toBeNull()
  })

  it('nunca houve backup e há lançamentos → aviso com a frase, sem duplicar', async () => {
    await seedTransaction()
    await openHome()
    const link = await screen.findByRole('link', { name: 'Fazer backup' })
    expect(
      screen.getByText('Último backup: nunca. Faça um backup para não perder seus dados.'),
    ).toBeDefined()
    expect(countLastBackupTexts()).toBe(1)

    fireEvent.click(link)
    expect(await screen.findByRole('heading', { level: 1, name: 'Backup' })).toBeDefined()
  })

  it('nunca houve backup e sem lançamentos → linha "Último backup: nunca", sem aviso', async () => {
    await openHome()
    await screen.findByText(NO_TRANSACTIONS_MESSAGE)
    expect(await screen.findByText('Último backup: nunca')).toBeDefined()
    expect(backupShortcutLink()).toBeNull()
    expect(countLastBackupTexts()).toBe(1)
  })

  it('backup há 7 dias → aviso com "há 7 dias"', async () => {
    await seedTransaction()
    await setSetting('lastBackupAt', backupDaysAgo(7))
    await openHome()
    expect(await screen.findByRole('link', { name: 'Fazer backup' })).toBeDefined()
    expect(screen.getByText(/^Último backup: há 7 dias\./)).toBeDefined()
    expect(countLastBackupTexts()).toBe(1)
  })

  it('backup há 6 dias → só a linha, sem aviso', async () => {
    await seedTransaction()
    await setSetting('lastBackupAt', backupDaysAgo(6))
    await openHome()
    expect(await screen.findByText('Último backup: há 6 dias')).toBeDefined()
    expect(backupShortcutLink()).toBeNull()
  })

  it('durante o carregamento não aparece texto incorreto', async () => {
    await seedTransaction()
    await setSetting('lastBackupAt', backupDaysAgo(3))
    // Registra todo texto "Último backup" que chegar a ser exibido, do primeiro render em diante.
    const seenTexts = new Set<string>()
    observer = new MutationObserver(() => {
      for (const element of screen.queryAllByText(LAST_BACKUP_PATTERN)) {
        seenTexts.add(element.textContent ?? '')
      }
    })
    observer.observe(document.body, { childList: true, subtree: true, characterData: true })

    renderApp(['/'])
    // Primeiro render: os dados ainda não chegaram, então nada de "Último backup".
    expect(countLastBackupTexts()).toBe(0)

    await screen.findByText('Último backup: há 3 dias')
    expect([...seenTexts]).toEqual(['Último backup: há 3 dias'])
    expect(backupShortcutLink()).toBeNull()
  })
})
