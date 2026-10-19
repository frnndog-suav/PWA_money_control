import { describe, expect, it, vi } from 'vitest'
import { getStorageEstimate, isStoragePersisted, requestPersistentStorage } from '@/lib/storage'

const failing = () => Promise.reject(new Error('falhou'))

describe('requestPersistentStorage', () => {
  // RF-11 / CA-11.4
  it('devolve a resposta de navigator.storage.persist()', async () => {
    const persist = vi.fn().mockResolvedValue(true)
    await expect(requestPersistentStorage({ persist })).resolves.toBe(true)
    expect(persist).toHaveBeenCalledOnce()
    await expect(requestPersistentStorage({ persist: () => Promise.resolve(false) })).resolves.toBe(
      false,
    )
  })

  it('devolve false sem a API ou quando ela falha', async () => {
    await expect(requestPersistentStorage(undefined)).resolves.toBe(false)
    await expect(requestPersistentStorage({})).resolves.toBe(false)
    await expect(requestPersistentStorage({ persist: failing })).resolves.toBe(false)
  })

  it('usa navigator.storage por padrão (ausente no jsdom)', async () => {
    await expect(requestPersistentStorage()).resolves.toBe(false)
  })
})

describe('isStoragePersisted', () => {
  // CA-11.4 — indicador "ativo/não garantido".
  it('devolve a resposta de navigator.storage.persisted()', async () => {
    await expect(isStoragePersisted({ persisted: () => Promise.resolve(true) })).resolves.toBe(true)
    await expect(isStoragePersisted({ persisted: () => Promise.resolve(false) })).resolves.toBe(
      false,
    )
  })

  it('devolve null sem a API ou quando ela falha', async () => {
    await expect(isStoragePersisted({})).resolves.toBeNull()
    await expect(isStoragePersisted({ persisted: failing })).resolves.toBeNull()
    await expect(isStoragePersisted()).resolves.toBeNull()
  })
})

describe('getStorageEstimate', () => {
  // CA-11.5 — espaço usado.
  it('devolve uso e cota em bytes', async () => {
    const estimate = () => Promise.resolve({ usage: 1_234_567, quota: 500_000_000 })
    await expect(getStorageEstimate({ estimate })).resolves.toEqual({
      usageBytes: 1_234_567,
      quotaBytes: 500_000_000,
    })
  })

  it('devolve null sem a API, com resposta incompleta ou quando ela falha', async () => {
    await expect(getStorageEstimate({})).resolves.toBeNull()
    await expect(getStorageEstimate({ estimate: () => Promise.resolve({}) })).resolves.toBeNull()
    await expect(getStorageEstimate({ estimate: failing })).resolves.toBeNull()
    await expect(getStorageEstimate()).resolves.toBeNull()
  })
})
