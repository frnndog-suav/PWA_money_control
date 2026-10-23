import { afterEach, describe, expect, it } from 'vitest'
import {
  daysSinceLastBackup,
  describeLastBackup,
  shouldShowBackupReminder,
} from '@/domain/backupReminder'

// RF-10 "Lembrete" / D-11 / D-48 (c) — auditoria: limites de 6, 7 e 8 dias, virada de mês e
// de ano, fevereiro bissexto, horário de verão e independência do fuso. Os dias são de
// calendário local (D-48): o app grava `lastBackupAt` em ISO 8601 (UTC) e o dia é o do
// aparelho. Técnica do `process.env.TZ` (D-46: o pool `forks` dá um processo por arquivo).

const ORIGINAL_TZ = process.env.TZ

afterEach(() => {
  if (ORIGINAL_TZ === undefined) delete process.env.TZ
  else process.env.TZ = ORIGINAL_TZ
})

const TIME_ZONES = [
  'UTC',
  'America/Sao_Paulo',
  'America/Noronha',
  'Pacific/Kiritimati', // +14
  'Pacific/Pago_Pago', // −11
  'Asia/Kolkata', // +05:30
  'America/Los_Angeles', // horário de verão
]

/** Instante gravado pelo app (`toISOString`) para um horário local no fuso atual. */
function savedAt(date: string, hour: number, minute = 0): string {
  const [year, month, day] = date.split('-').map(Number)
  return new Date(year, month - 1, day, hour, minute).toISOString()
}

// [backup (data local), hoje, dias esperados]
const CASES: [string, string, number][] = [
  // Limites da regra dos 7 dias.
  ['2026-10-16', '2026-10-22', 6],
  ['2026-10-15', '2026-10-22', 7],
  ['2026-10-14', '2026-10-22', 8],
  // Virada de mês e de ano.
  ['2026-09-30', '2026-10-01', 1],
  ['2026-09-24', '2026-10-01', 7],
  ['2026-12-31', '2027-01-01', 1],
  ['2026-12-27', '2027-01-03', 7],
  ['2026-12-26', '2027-01-01', 6],
  // Fevereiro: ano comum e bissexto.
  ['2026-02-22', '2026-03-01', 7],
  ['2028-02-23', '2028-03-01', 7],
  ['2028-02-22', '2028-03-01', 8],
  // Horário de verão de Los Angeles (início em 08/03/2026, fim em 01/11/2026).
  ['2026-03-01', '2026-03-08', 7],
  ['2026-10-31', '2026-11-07', 7],
  ['2026-11-01', '2026-11-07', 6],
]

describe.each(TIME_ZONES)('fuso %s', (timeZone) => {
  it.each(CASES)('backup em %s, hoje %s → %i dias', (backupDate, today, days) => {
    process.env.TZ = timeZone
    // Começo e fim do dia local: o resultado não pode mudar com a hora.
    for (const [hour, minute] of [
      [0, 0],
      [12, 0],
      [23, 59],
    ]) {
      const lastBackupAt = savedAt(backupDate, hour, minute)
      expect(daysSinceLastBackup(lastBackupAt, today)).toBe(days)
      expect(shouldShowBackupReminder({ lastBackupAt, today, transactionCount: 1 })).toBe(days >= 7)
    }
  })

  it('nunca houve backup: mostra com lançamentos, nunca sem lançamentos', () => {
    process.env.TZ = timeZone
    const today = '2026-10-22'
    expect(shouldShowBackupReminder({ lastBackupAt: null, today, transactionCount: 1 })).toBe(true)
    expect(shouldShowBackupReminder({ lastBackupAt: null, today, transactionCount: 0 })).toBe(false)
    const old = savedAt('2025-01-01', 12)
    expect(shouldShowBackupReminder({ lastBackupAt: old, today, transactionCount: 0 })).toBe(false)
  })
})

describe('dias de calendário locais (D-48 c)', () => {
  it('o mesmo instante conta conforme o dia local do aparelho', () => {
    // 23:30 de 15/10 em São Paulo = 02:30 de 16/10 em UTC.
    const instant = '2026-10-16T02:30:00.000Z'
    process.env.TZ = 'America/Sao_Paulo'
    expect(daysSinceLastBackup(instant, '2026-10-22')).toBe(7)
    process.env.TZ = 'UTC'
    expect(daysSinceLastBackup(instant, '2026-10-22')).toBe(6)
  })

  it('backup às 23:59 de ontem já conta "há 1 dia", mesmo com menos de 24 horas', () => {
    process.env.TZ = 'America/Sao_Paulo'
    expect(
      describeLastBackup(daysSinceLastBackup(savedAt('2026-10-21', 23, 59), '2026-10-22')),
    ).toBe('Último backup: há 1 dia')
  })
})

describe('describeLastBackup (RF-10 / D-48 c)', () => {
  it.each<[number | null, string]>([
    [null, 'Último backup: nunca'],
    [0, 'Último backup: hoje'],
    [1, 'Último backup: há 1 dia'],
    [6, 'Último backup: há 6 dias'],
    [7, 'Último backup: há 7 dias'],
    [8, 'Último backup: há 8 dias'],
    [400, 'Último backup: há 400 dias'],
  ])('%s → "%s"', (days, text) => {
    expect(describeLastBackup(days)).toBe(text)
  })

  it('de ponta a ponta: nunca, hoje, há 1 dia e há N dias', () => {
    process.env.TZ = 'America/Sao_Paulo'
    const today = '2026-10-22'
    const label = (lastBackupAt: string | null) =>
      describeLastBackup(daysSinceLastBackup(lastBackupAt, today))
    expect(label(null)).toBe('Último backup: nunca')
    expect(label(savedAt('2026-10-22', 0))).toBe('Último backup: hoje')
    expect(label(savedAt('2026-10-21', 12))).toBe('Último backup: há 1 dia')
    expect(label(savedAt('2026-10-12', 12))).toBe('Último backup: há 10 dias')
  })
})
