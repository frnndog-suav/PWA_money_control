import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest'
import type { RegisterSWOptions } from 'vite-plugin-pwa/types'
import { applyPwaUpdate, registerPwa } from '@/app/pwa/registerPwa'
import { MIN_UPDATE_CHECK_GAP_MS, UPDATE_CHECK_INTERVAL_MS } from '@/lib/updateCheck'
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

type UpdateMock = Mock<() => Promise<void>>

function fakeRegistration(update: UpdateMock = vi.fn(() => Promise.resolve())) {
  return { registration: { update } as unknown as ServiceWorkerRegistration, update }
}

/** Registra o service worker e devolve o `update()` espiado; já conta a checagem da abertura. */
function setupRegisteredServiceWorker(update?: UpdateMock) {
  const setup = setupRegistration()
  const fake = fakeRegistration(update)
  setup.options.onRegisteredSW?.('/sw.js', fake.registration)
  return { ...setup, update: fake.update }
}

function setEnvironment({
  visibility = 'visible',
  isOnline = true,
}: { visibility?: DocumentVisibilityState; isOnline?: boolean } = {}) {
  vi.spyOn(document, 'visibilityState', 'get').mockReturnValue(visibility)
  vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(isOnline)
}

function waitPastMinimumGap() {
  vi.advanceTimersByTime(MIN_UPDATE_CHECK_GAP_MS)
}

function fireAllTriggers() {
  document.dispatchEvent(new Event('visibilitychange'))
  window.dispatchEvent(new Event('focus'))
  window.dispatchEvent(new Event('online'))
  vi.advanceTimersByTime(UPDATE_CHECK_INTERVAL_MS)
}

describe('registerPwa (§6.9)', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    setEnvironment()
  })

  afterEach(() => {
    cleanups.splice(0).forEach((cleanup) => cleanup())
    vi.useRealTimers()
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

  // CA-11.3 / D-24 — reproduz a falha do item C 9: no iPhone o aviso não aparecia sem recarregar.
  it('procura versão nova logo ao abrir, sem esperar visibilitychange', () => {
    const { update } = setupRegisteredServiceWorker()
    expect(update).toHaveBeenCalledTimes(1)
  })

  // CA-11.3 / D-24
  it('procura versão nova quando o app volta a ficar visível', () => {
    const { update } = setupRegisteredServiceWorker()
    waitPastMinimumGap()

    document.dispatchEvent(new Event('visibilitychange'))

    expect(update).toHaveBeenCalledTimes(2)
  })

  // CA-11.3 / D-24
  it('procura versão nova quando a janela ganha foco', () => {
    const { update } = setupRegisteredServiceWorker()
    waitPastMinimumGap()

    window.dispatchEvent(new Event('focus'))

    expect(update).toHaveBeenCalledTimes(2)
  })

  // CA-11.3 / D-24
  it('procura versão nova quando a conexão volta', () => {
    const { update } = setupRegisteredServiceWorker()
    waitPastMinimumGap()

    window.dispatchEvent(new Event('online'))

    expect(update).toHaveBeenCalledTimes(2)
  })

  // CA-11.3 / D-24
  it('procura versão nova a cada 30 minutos enquanto visível', () => {
    const { update } = setupRegisteredServiceWorker()

    vi.advanceTimersByTime(UPDATE_CHECK_INTERVAL_MS - 1)
    expect(update).toHaveBeenCalledTimes(1)

    vi.advanceTimersByTime(1)
    expect(update).toHaveBeenCalledTimes(2)

    vi.advanceTimersByTime(UPDATE_CHECK_INTERVAL_MS)
    expect(update).toHaveBeenCalledTimes(3)
  })

  // CA-11.3 / D-24
  it('focus e visibilitychange juntos fazem uma checagem só (intervalo mínimo de 1 min)', () => {
    const { update } = setupRegisteredServiceWorker()

    window.dispatchEvent(new Event('focus'))
    expect(update).toHaveBeenCalledTimes(1)

    waitPastMinimumGap()
    window.dispatchEvent(new Event('focus'))
    document.dispatchEvent(new Event('visibilitychange'))

    expect(update).toHaveBeenCalledTimes(2)
  })

  // CA-11.3 / D-24
  it('não procura versão nova offline', () => {
    setEnvironment({ isOnline: false })
    const { update } = setupRegisteredServiceWorker()

    fireAllTriggers()

    expect(update).not.toHaveBeenCalled()
  })

  // CA-11.3 / D-24
  it('não procura versão nova com o documento oculto', () => {
    setEnvironment({ visibility: 'hidden' })
    const { update } = setupRegisteredServiceWorker()

    fireAllTriggers()

    expect(update).not.toHaveBeenCalled()
  })

  // CA-11.3 / D-24 / CA-12.3
  it('falha ao procurar versão (ex.: sessão do Access expirada) é ignorada', async () => {
    const failedUpdate: UpdateMock = vi.fn(() => Promise.reject(new Error('redirect para o login')))
    const { update } = setupRegisteredServiceWorker(failedUpdate)
    // Deixa a rejeição assentar: sem o `.catch`, o Vitest acusaria "unhandled rejection".
    await vi.advanceTimersByTimeAsync(0)

    waitPastMinimumGap()
    window.dispatchEvent(new Event('focus'))
    await vi.advanceTimersByTimeAsync(0)

    expect(update).toHaveBeenCalledTimes(2)
  })

  // CA-11.3 / D-24
  it('a limpeza remove os listeners e o intervalo', () => {
    const { update, cleanup } = setupRegisteredServiceWorker()
    expect(vi.getTimerCount()).toBe(1)

    cleanup()
    waitPastMinimumGap()
    fireAllTriggers()

    expect(vi.getTimerCount()).toBe(0)
    expect(update).toHaveBeenCalledTimes(1)
  })

  // CA-11.3 / D-24
  it('nenhum gatilho recarrega a página sozinho', () => {
    const { updateServiceWorker, update } = setupRegisteredServiceWorker()
    waitPastMinimumGap()

    fireAllTriggers()

    expect(update).toHaveBeenCalled()
    expect(updateServiceWorker).not.toHaveBeenCalled()
  })

  it('registro concluído depois da limpeza não cria listener nem intervalo', () => {
    const { options, cleanup } = setupRegistration()
    const addEventListener = vi.spyOn(document, 'addEventListener')
    const { registration, update } = fakeRegistration()

    cleanup()
    options.onRegisteredSW?.('/sw.js', registration)

    expect(addEventListener).not.toHaveBeenCalled()
    expect(vi.getTimerCount()).toBe(0)
    expect(update).not.toHaveBeenCalled()
  })

  it('sem registro (navegador sem service worker) não escuta nada', () => {
    const { options } = setupRegistration()
    const addEventListener = vi.spyOn(document, 'addEventListener')
    options.onRegisteredSW?.('/sw.js', undefined)
    expect(addEventListener).not.toHaveBeenCalled()
    expect(vi.getTimerCount()).toBe(0)
  })
})
