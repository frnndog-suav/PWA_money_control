import { act, renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { getSetting, setSetting, useSetting } from '@/repositories/settingsRepository'

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
})
