import { act, renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { deliverBackupFile, recordBackupDone } from '@/repositories/backupRepository'
import {
  getSetting,
  setSetting,
  useLastBackupAt,
  useSetting,
} from '@/repositories/settingsRepository'

describe('settingsRepository', () => {
  // §6.3 / §6.4 — tabela settings (chave → texto).
  it('devolve null para chave inexistente', async () => {
    await expect(getSetting('lastBackupAt')).resolves.toBeNull()
  })

  it('grava e sobrescreve um valor', async () => {
    await setSetting('lastBackupAt', '2026-10-19T12:00:00.000Z')
    await setSetting('lastBackupAt', '2026-10-20T12:00:00.000Z')
    await expect(getSetting('lastBackupAt')).resolves.toBe('2026-10-20T12:00:00.000Z')
  })

  // §6.1 — useLiveQuery: a tela acompanha a mudança sem recarregar.
  it('useSetting começa carregando, depois acompanha as gravações', async () => {
    const { result } = renderHook(() => useSetting('theme'))
    expect(result.current).toBeUndefined()

    await waitFor(() => expect(result.current).toBeNull())

    await act(() => setSetting('theme', 'dark'))
    await waitFor(() => expect(result.current).toBe('dark'))
  })

  // RF-10 "Lembrete" / D-47 (e) — data do último backup lida pela tela inicial.
  it('useLastBackupAt: carregando → null → acompanha o backup salvo; cancelar não muda', async () => {
    const { result } = renderHook(() => useLastBackupAt())
    expect(result.current).toBeUndefined()
    await waitFor(() => expect(result.current).toBeNull())

    const file = new File(['{}'], 'gastos-backup-2026-10-22.json')
    await act(() => deliverBackupFile(file, async () => 'cancelled'))
    await act(() => deliverBackupFile(file, async () => 'blocked'))
    expect(result.current).toBeNull()

    await act(() => recordBackupDone(new Date('2026-10-22T13:45:00.000Z')))
    await waitFor(() => expect(result.current).toBe('2026-10-22T13:45:00.000Z'))

    // Outras chaves não interferem.
    await act(() => setSetting('persistRequested', '2026-10-23T00:00:00.000Z'))
    expect(result.current).toBe('2026-10-22T13:45:00.000Z')
  })
})
