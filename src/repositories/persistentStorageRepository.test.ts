import { describe, expect, it, vi } from 'vitest'
import { requestPersistentStorageOnce } from '@/repositories/persistentStorageRepository'
import { getSetting } from '@/repositories/settingsRepository'

const NOW = new Date('2026-10-19T12:00:00.000Z')
const now = () => NOW

describe('requestPersistentStorageOnce', () => {
  // RF-11 / CA-11.4 / §6.9 — pede uma vez e registra persistRequested.
  it('pede na primeira abertura e registra a data do pedido', async () => {
    const request = vi.fn().mockResolvedValue(true)
    await expect(requestPersistentStorageOnce({ request, now })).resolves.toBe(true)
    expect(request).toHaveBeenCalledOnce()
    await expect(getSetting('persistRequested')).resolves.toBe(NOW.toISOString())
  })

  it('não pede de novo nas aberturas seguintes, mesmo se foi negado', async () => {
    const request = vi.fn().mockResolvedValue(false)
    await requestPersistentStorageOnce({ request, now })
    await expect(requestPersistentStorageOnce({ request, now })).resolves.toBe(false)
    expect(request).toHaveBeenCalledOnce()
  })

  it('chamadas simultâneas pedem uma única vez', async () => {
    const request = vi.fn().mockResolvedValue(true)
    await Promise.all([
      requestPersistentStorageOnce({ request, now }),
      requestPersistentStorageOnce({ request, now }),
    ])
    expect(request).toHaveBeenCalledOnce()
  })

  it('usa navigator.storage por padrão (sem a API, apenas registra)', async () => {
    await expect(requestPersistentStorageOnce()).resolves.toBe(true)
    await expect(getSetting('persistRequested')).resolves.not.toBeNull()
  })
})
