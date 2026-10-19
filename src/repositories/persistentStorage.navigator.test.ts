import { afterEach, describe, expect, it, vi } from 'vitest'
import { requestPersistentStorageOnce } from '@/repositories/persistentStorageRepository'
import { getSetting, setSetting } from '@/repositories/settingsRepository'

// RF-11 / CA-11.4 / D-28 — pedido único de armazenamento persistente.

const ISO_8601 = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/

function installStorageManager(manager: Partial<StorageManager>): void {
  Object.defineProperty(navigator, 'storage', { configurable: true, value: manager })
}

afterEach(() => {
  // O jsdom não tem navigator.storage; remove o dublê instalado no teste.
  Reflect.deleteProperty(navigator, 'storage')
  vi.restoreAllMocks()
})

describe('requestPersistentStorageOnce (CA-11.4 / D-28)', () => {
  // D-28 — `persistRequested` é gravado ANTES de chamar persist().
  it('registra persistRequested antes de chamar persist()', async () => {
    let recordedBeforeRequest: string | null = null
    const request = vi.fn(async () => {
      recordedBeforeRequest = await getSetting('persistRequested')
      return true
    })
    await requestPersistentStorageOnce({ request, now: () => new Date(Date.UTC(2026, 9, 19)) })
    expect(request).toHaveBeenCalledOnce()
    expect(recordedBeforeRequest).toBe('2026-10-19T00:00:00.000Z')
  })

  it('três chamadas simultâneas: um único pedido e só uma devolve true', async () => {
    const request = vi.fn().mockResolvedValue(true)
    const results = await Promise.all([
      requestPersistentStorageOnce({ request }),
      requestPersistentStorageOnce({ request }),
      requestPersistentStorageOnce({ request }),
    ])
    expect(request).toHaveBeenCalledOnce()
    expect(results.filter(Boolean)).toHaveLength(1)
    await expect(getSetting('persistRequested')).resolves.toMatch(ISO_8601)
  })

  it('não pede se persistRequested já existe (aberturas seguintes)', async () => {
    await setSetting('persistRequested', '2026-01-01T00:00:00.000Z')
    const request = vi.fn().mockResolvedValue(true)
    await expect(requestPersistentStorageOnce({ request })).resolves.toBe(false)
    expect(request).not.toHaveBeenCalled()
    await expect(getSetting('persistRequested')).resolves.toBe('2026-01-01T00:00:00.000Z')
  })

  // CA-11.4 — com navigator.storage disponível, persist() é chamado uma única vez.
  it('usa navigator.storage.persist() por padrão, uma vez só, mesmo concorrendo', async () => {
    const persist = vi.fn().mockResolvedValue(true)
    installStorageManager({ persist })
    await Promise.all([requestPersistentStorageOnce(), requestPersistentStorageOnce()])
    await requestPersistentStorageOnce()
    expect(persist).toHaveBeenCalledOnce()
  })

  it('persist() negado ou com erro não quebra e não é repetido', async () => {
    const persist = vi.fn().mockRejectedValue(new Error('negado'))
    installStorageManager({ persist })
    await expect(requestPersistentStorageOnce()).resolves.toBe(true)
    await expect(requestPersistentStorageOnce()).resolves.toBe(false)
    expect(persist).toHaveBeenCalledOnce()
  })

  // RNF-09 — sem navigator.storage (contexto inseguro, navegador antigo): só registra.
  it('sem navigator.storage não lança exceção e registra o pedido', async () => {
    expect('storage' in navigator).toBe(false)
    await expect(requestPersistentStorageOnce()).resolves.toBe(true)
    await expect(getSetting('persistRequested')).resolves.toMatch(ISO_8601)
  })
})
