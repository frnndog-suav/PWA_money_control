import { describe, expect, it } from 'vitest'
import {
  MIN_UPDATE_CHECK_GAP_MS,
  UPDATE_CHECK_INTERVAL_MS,
  shouldCheckForUpdate,
} from '@/lib/updateCheck'

const NOW = 1_000_000_000

describe('shouldCheckForUpdate (CA-11.3 / D-24)', () => {
  it('usa 30 minutos de intervalo e 1 minuto de intervalo mínimo', () => {
    expect(UPDATE_CHECK_INTERVAL_MS).toBe(1_800_000)
    expect(MIN_UPDATE_CHECK_GAP_MS).toBe(60_000)
  })

  it('primeira checagem com o app online e visível', () => {
    expect(
      shouldCheckForUpdate({ isOnline: true, isVisible: true, now: NOW, lastCheckAt: null }),
    ).toBe(true)
  })

  it('não checa offline', () => {
    expect(
      shouldCheckForUpdate({ isOnline: false, isVisible: true, now: NOW, lastCheckAt: null }),
    ).toBe(false)
  })

  it('não checa com o documento oculto', () => {
    expect(
      shouldCheckForUpdate({ isOnline: true, isVisible: false, now: NOW, lastCheckAt: null }),
    ).toBe(false)
  })

  it('não checa de novo antes de 1 minuto', () => {
    const lastCheckAt = NOW - MIN_UPDATE_CHECK_GAP_MS + 1
    expect(shouldCheckForUpdate({ isOnline: true, isVisible: true, now: NOW, lastCheckAt })).toBe(
      false,
    )
  })

  it('checa de novo a partir de 1 minuto', () => {
    const lastCheckAt = NOW - MIN_UPDATE_CHECK_GAP_MS
    expect(shouldCheckForUpdate({ isOnline: true, isVisible: true, now: NOW, lastCheckAt })).toBe(
      true,
    )
  })
})
