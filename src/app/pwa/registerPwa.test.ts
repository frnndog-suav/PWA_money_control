import { afterEach, describe, expect, it, vi } from 'vitest'
import type { RegisterSWOptions } from 'vite-plugin-pwa/types'
import { applyPwaUpdate, registerPwa } from '@/app/pwa/registerPwa'
import { useUiStore } from '@/stores/uiStore'

const cleanups: Array<() => void> = []

function setupRegistration() {
  const updateServiceWorker = vi.fn((_reloadPage?: boolean) => Promise.resolve())
  let options: RegisterSWOptions = {}
  const cleanup = registerPwa((registerOptions) => {
    options = registerOptions
    return updateServiceWorker
  })
  cleanups.push(cleanup)
  return { options, updateServiceWorker, cleanup }
}

function fakeRegistration(update = vi.fn(() => Promise.resolve())) {
  return { registration: { update } as unknown as ServiceWorkerRegistration, update }
}

function changeVisibility(state: DocumentVisibilityState, isOnline = true) {
  vi.spyOn(document, 'visibilityState', 'get').mockReturnValue(state)
  vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(isOnline)
  document.dispatchEvent(new Event('visibilitychange'))
}

describe('registerPwa (§6.9)', () => {
  afterEach(() => {
    cleanups.splice(0).forEach((cleanup) => cleanup())
    vi.restoreAllMocks()
  })

  it('registra o service worker imediatamente', () => {
    const { options } = setupRegistration()
    expect(options.immediate).toBe(true)
  })

  // CA-11.3
  it('versão nova baixada liga o aviso, sem recarregar', () => {
    const { options, updateServiceWorker } = setupRegistration()
    expect(useUiStore.getState().updateAvailable).toBe(false)

    options.onNeedRefresh?.()

    expect(useUiStore.getState().updateAvailable).toBe(true)
    expect(updateServiceWorker).not.toHaveBeenCalled()
  })

  // CA-11.3
  it('applyPwaUpdate ativa a versão em espera', async () => {
    const { updateServiceWorker } = setupRegistration()
    await applyPwaUpdate()
    expect(updateServiceWorker).toHaveBeenCalledWith(true)
  })

  it('procura versão nova quando o app volta a ficar visível e online', () => {
    const { options } = setupRegistration()
    const { registration, update } = fakeRegistration()
    options.onRegisteredSW?.('/sw.js', registration)

    changeVisibility('visible')

    expect(update).toHaveBeenCalledTimes(1)
  })

  it('não procura versão nova sem internet', () => {
    const { options } = setupRegistration()
    const { registration, update } = fakeRegistration()
    options.onRegisteredSW?.('/sw.js', registration)

    changeVisibility('visible', false)

    expect(update).not.toHaveBeenCalled()
  })

  it('não procura versão nova quando o app vai para o segundo plano', () => {
    const { options } = setupRegistration()
    const { registration, update } = fakeRegistration()
    options.onRegisteredSW?.('/sw.js', registration)

    changeVisibility('hidden')

    expect(update).not.toHaveBeenCalled()
  })

  // CA-12.3
  it('falha ao procurar versão (ex.: sessão do Access expirada) é tratada', () => {
    const { options } = setupRegistration()
    const failedUpdate = Promise.reject(new Error('redirect para o login'))
    const handleFailure = vi.spyOn(failedUpdate, 'catch')
    const { registration } = fakeRegistration(vi.fn(() => failedUpdate))
    options.onRegisteredSW?.('/sw.js', registration)

    changeVisibility('visible')

    expect(handleFailure).toHaveBeenCalledTimes(1)
  })

  it('a limpeza remove o listener de visibilidade', () => {
    const { options, cleanup } = setupRegistration()
    const { registration, update } = fakeRegistration()
    options.onRegisteredSW?.('/sw.js', registration)

    cleanup()
    changeVisibility('visible')

    expect(update).not.toHaveBeenCalled()
  })

  it('registro concluído depois da limpeza não cria listener', () => {
    const { options, cleanup } = setupRegistration()
    const addEventListener = vi.spyOn(document, 'addEventListener')

    cleanup()
    options.onRegisteredSW?.('/sw.js', fakeRegistration().registration)

    expect(addEventListener).not.toHaveBeenCalled()
  })

  it('sem registro (navegador sem service worker) não escuta a visibilidade', () => {
    const { options } = setupRegistration()
    const addEventListener = vi.spyOn(document, 'addEventListener')
    options.onRegisteredSW?.('/sw.js', undefined)
    expect(addEventListener).not.toHaveBeenCalled()
  })
})
