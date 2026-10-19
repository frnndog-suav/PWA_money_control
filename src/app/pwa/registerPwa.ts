import type { RegisterSWOptions } from 'vite-plugin-pwa/types'
import { UPDATE_CHECK_INTERVAL_MS, shouldCheckForUpdate } from '@/lib/updateCheck'
import { useUiStore } from '@/stores/uiStore'

/** Assinatura do `registerSW` de `virtual:pwa-register` (injetado para poder testar). */
export type RegisterServiceWorker = (
  options: RegisterSWOptions,
) => (reloadPage?: boolean) => Promise<void>

let activateWaitingVersion: () => Promise<void> = () => Promise.resolve()

/**
 * §6.9 / CA-11.3 — registra o service worker. Quando uma versão nova termina de baixar,
 * só liga `updateAvailable`; a troca acontece quando o usuário toca "Atualizar".
 * Devolve a limpeza que remove os listeners e o intervalo criados aqui (D-24).
 */
export function registerPwa(registerServiceWorker: RegisterServiceWorker): () => void {
  const listeners = new AbortController()
  const updateServiceWorker = registerServiceWorker({
    immediate: true,
    onNeedRefresh: () => useUiStore.getState().setUpdateAvailable(true),
    onRegisteredSW: (_scriptUrl, registration) => {
      if (registration) checkForUpdatesPeriodically(registration, listeners.signal)
    },
  })
  activateWaitingVersion = () => updateServiceWorker(true)
  return () => listeners.abort()
}

/** Ativa a versão em espera; o plugin recarrega a página quando ela assume o controle. */
export function applyPwaUpdate(): Promise<void> {
  return activateWaitingVersion()
}

// D-24 — o navegador só procura versões novas ao navegar, e no iPhone o app instalado abre do
// zero ou volta do segundo plano sem navegação nova; o `visibilitychange` nem sempre dispara.
// Por isso o app pede a checagem em vários momentos, para o aviso do CA-11.3 aparecer sem
// precisar recarregar. Só baixa a versão nova: a troca continua sendo pelo toque em "Atualizar".
function checkForUpdatesPeriodically(
  registration: ServiceWorkerRegistration,
  signal: AbortSignal,
): void {
  // Pelo `signal`: a limpeza funciona mesmo que o registro termine depois dela.
  if (signal.aborted) return
  let lastCheckAt: number | null = null

  const checkForUpdate = () => {
    const now = Date.now()
    const conditions = {
      isOnline: navigator.onLine,
      isVisible: document.visibilityState === 'visible',
      now,
      lastCheckAt,
    }
    if (!shouldCheckForUpdate(conditions)) return
    lastCheckAt = now
    // Falha esperada sem rede ou com a sessão do Access expirada (CA-12.3): o próximo gatilho
    // tenta de novo.
    registration.update().catch(() => undefined)
  }

  document.addEventListener('visibilitychange', checkForUpdate, { signal })
  window.addEventListener('focus', checkForUpdate, { signal })
  window.addEventListener('online', checkForUpdate, { signal })
  const intervalId = setInterval(checkForUpdate, UPDATE_CHECK_INTERVAL_MS)
  signal.addEventListener('abort', () => clearInterval(intervalId), { once: true })

  checkForUpdate()
}
