import { afterEach, describe, expect, it, vi } from 'vitest'
import { getStorageEstimate, isStoragePersisted, requestPersistentStorage } from '@/lib/storage'

// RF-11 / CA-11.4 / CA-11.5 / RNF-09 — leitura de navigator.storage por padrão e os
// ambientes em que ela não existe.

afterEach(() => {
  vi.unstubAllGlobals()
  Reflect.deleteProperty(navigator, 'storage')
})

describe('storage — navigator.storage por padrão', () => {
  it('usa a StorageManager do navegador quando ela existe', async () => {
    const manager = {
      persist: vi.fn().mockResolvedValue(true),
      persisted: vi.fn().mockResolvedValue(true),
      estimate: vi.fn().mockResolvedValue({ usage: 1_234_567, quota: 500_000_000 }),
    }
    Object.defineProperty(navigator, 'storage', { configurable: true, value: manager })

    await expect(requestPersistentStorage()).resolves.toBe(true)
    await expect(isStoragePersisted()).resolves.toBe(true)
    await expect(getStorageEstimate()).resolves.toEqual({
      usageBytes: 1_234_567,
      quotaBytes: 500_000_000,
    })
    expect(manager.persist).toHaveBeenCalledOnce()
  })

  // Ambiente sem `navigator` (ex.: worker sem DOM ou SSR): devolve o fallback, sem lançar.
  it('sem o objeto navigator devolve os valores de fallback', async () => {
    vi.stubGlobal('navigator', undefined)
    expect(typeof navigator).toBe('undefined')

    await expect(requestPersistentStorage()).resolves.toBe(false)
    await expect(isStoragePersisted()).resolves.toBeNull()
    await expect(getStorageEstimate()).resolves.toBeNull()
  })

  it('cota zero é um valor válido (não confunde com ausência)', async () => {
    await expect(
      getStorageEstimate({ estimate: () => Promise.resolve({ usage: 0, quota: 0 }) }),
    ).resolves.toEqual({ usageBytes: 0, quotaBytes: 0 })
  })
})
