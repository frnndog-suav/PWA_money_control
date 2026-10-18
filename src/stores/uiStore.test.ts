import { beforeEach, describe, expect, it } from 'vitest'
import { INITIAL_UI_STATE, useUiStore } from '@/stores/uiStore'

describe('uiStore (§6.7)', () => {
  beforeEach(() => useUiStore.setState(INITIAL_UI_STATE))

  // CA-11.3
  it('começa sem atualização disponível', () => {
    expect(useUiStore.getState().updateAvailable).toBe(false)
  })

  // CA-11.3
  it('setUpdateAvailable liga e desliga o aviso de nova versão', () => {
    useUiStore.getState().setUpdateAvailable(true)
    expect(useUiStore.getState().updateAvailable).toBe(true)

    useUiStore.getState().setUpdateAvailable(false)
    expect(useUiStore.getState().updateAvailable).toBe(false)
  })
})
