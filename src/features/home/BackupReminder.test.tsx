import { fireEvent, screen } from '@testing-library/react'
import { subDays } from 'date-fns'
import { describe, expect, it } from 'vitest'
import { NO_TRANSACTIONS_MESSAGE } from '@/features/home/homeTexts'
import { setSetting } from '@/repositories/settingsRepository'
import { createTag } from '@/repositories/tagsRepository'
import { createTransaction } from '@/repositories/transactionsRepository'
import { renderApp } from '@/test/renderApp'

// RF-10 "Lembrete" / D-11 — aviso discreto de backup na tela inicial.

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

describe('BackupReminder (RF-10 / D-11)', () => {
  it('sem lançamentos não aparece', async () => {
    await openHome()
    await screen.findByText(NO_TRANSACTIONS_MESSAGE)
    expect(screen.queryByRole('link', { name: 'Fazer backup' })).toBeNull()
  })

  it('nunca houve backup → aviso com atalho para /ajustes/backup', async () => {
    await seedTransaction()
    await openHome()
    const link = await screen.findByRole('link', { name: 'Fazer backup' })
    // D-48 (c) — frase completa do aviso.
    expect(
      screen.getByText('Último backup: nunca. Faça um backup para não perder seus dados.'),
    ).toBeDefined()

    fireEvent.click(link)
    expect(await screen.findByRole('heading', { level: 1, name: 'Backup' })).toBeDefined()
  })

  it('backup há 8 dias → aviso com "há 8 dias"', async () => {
    await seedTransaction()
    await setSetting('lastBackupAt', backupDaysAgo(8))
    await openHome()
    expect(await screen.findByText(/^Último backup: há 8 dias\./)).toBeDefined()
  })

  it('backup há 6 dias → sem aviso', async () => {
    await seedTransaction()
    await setSetting('lastBackupAt', backupDaysAgo(6))
    await openHome()
    await screen.findByText('Pão')
    expect(screen.queryByRole('link', { name: 'Fazer backup' })).toBeNull()
  })
})
