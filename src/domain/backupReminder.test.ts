import { describe, expect, it } from 'vitest'
import {
  BACKUP_REMINDER_DAYS,
  daysSinceLastBackup,
  describeLastBackup,
  shouldShowBackupReminder,
} from '@/domain/backupReminder'

// RF-10 "Lembrete" / D-11 — "Último backup: há N dias" e a regra dos 7 dias.

const TODAY = '2026-10-22'

/** Instante local (ISO 8601 em UTC, como o app grava) do dia e hora informados. */
function localInstant(year: number, month: number, day: number, hour = 12): string {
  return new Date(year, month - 1, day, hour).toISOString()
}

describe('daysSinceLastBackup', () => {
  it('nunca houve backup ou valor inválido → null', () => {
    expect(daysSinceLastBackup(null, TODAY)).toBeNull()
    expect(daysSinceLastBackup('ontem', TODAY)).toBeNull()
  })

  it('conta dias de calendário locais', () => {
    expect(daysSinceLastBackup(localInstant(2026, 10, 22, 0), TODAY)).toBe(0)
    expect(daysSinceLastBackup(localInstant(2026, 10, 21, 23), TODAY)).toBe(1)
    expect(daysSinceLastBackup(localInstant(2026, 10, 15), TODAY)).toBe(7)
    expect(daysSinceLastBackup(localInstant(2025, 10, 22), TODAY)).toBe(365)
  })

  it('relógio atrasado (backup "no futuro") conta como hoje', () => {
    expect(daysSinceLastBackup(localInstant(2026, 10, 25), TODAY)).toBe(0)
  })
})

describe('describeLastBackup', () => {
  it.each<[number | null, string]>([
    [null, 'Último backup: nunca'],
    [0, 'Último backup: hoje'],
    [1, 'Último backup: há 1 dia'],
    [2, 'Último backup: há 2 dias'],
    [30, 'Último backup: há 30 dias'],
  ])('%s → %s', (days, text) => {
    expect(describeLastBackup(days)).toBe(text)
  })
})

describe('shouldShowBackupReminder (D-11)', () => {
  const withTransactions = { today: TODAY, transactionCount: 1 }

  it('o limite é de 7 dias', () => {
    expect(BACKUP_REMINDER_DAYS).toBe(7)
  })

  it.each<[number, boolean]>([
    [0, false],
    [6, false],
    [7, true],
    [8, true],
  ])('último backup há %i dias → %s', (days, expected) => {
    const lastBackupAt = localInstant(2026, 10, 22 - days)
    expect(shouldShowBackupReminder({ ...withTransactions, lastBackupAt })).toBe(expected)
  })

  it('nunca houve backup → mostra', () => {
    expect(shouldShowBackupReminder({ ...withTransactions, lastBackupAt: null })).toBe(true)
  })

  it('sem lançamentos → nunca mostra', () => {
    expect(
      shouldShowBackupReminder({ today: TODAY, transactionCount: 0, lastBackupAt: null }),
    ).toBe(false)
    const oldBackup = localInstant(2026, 9, 1)
    expect(
      shouldShowBackupReminder({ today: TODAY, transactionCount: 0, lastBackupAt: oldBackup }),
    ).toBe(false)
  })
})
