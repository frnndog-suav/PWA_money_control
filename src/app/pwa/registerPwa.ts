import type { RegisterSWOptions } from 'vite-plugin-pwa/types'
import { useUiStore } from '@/stores/uiStore'

/** Assinatura do `registerSW` de `virtual:pwa-register` (injetado para poder testar). */
export type RegisterServiceWorker = (
  options: RegisterSWOptions,
) => (reloadPage?: boolean) => Promise<void>

let activateWaitingVersion: () => Promise<void> = () => Promise.resolve()

/**
 * §6.9 / CA-11.3 — registra o service worker. Quando uma versão nova termina de baixar,
 * só liga `updateAvailable`; a troca acontece quando o usuário toca "Atualizar".
 * Devolve a limpeza que remove os listeners criados aqui.
 */
export function registerPwa(registerServiceWorker: RegisterServiceWorker): () => void {
  const listeners = new AbortController()
  const updateServiceWorker = registerServiceWorker({
    immediate: true,
    onNeedRefresh: () => useUiStore.getState().setUpdateAvailable(true),
    onRegisteredSW: (_scriptUrl, registration) => {
      if (registration) checkForUpdatesWhenVisible(registration, listeners.signal)
    },
  })
  activateWaitingVersion = () => updateServiceWorker(true)
  return () => listeners.abort()
}

/** Ativa a versão em espera; o plugin recarrega a página quando ela assume o controle. */
export function applyPwaUpdate(): Promise<void> {
  return activateWaitingVersion()
}

// O app instalado no iPhone costuma voltar do segundo plano sem nova navegação, e o
// navegador só procura versões novas ao navegar. Procurar também ao voltar a ficar
// visível faz o aviso do CA-11.3 aparecer sem precisar fechar o app.
function checkForUpdatesWhenVisible(
  registration: ServiceWorkerRegistration,
  signal: AbortSignal,
): void {
  // Pelo `signal`: a limpeza funciona mesmo que o registro termine depois dela.
  if (signal.aborted) return
  document.addEventListener(
    'visibilitychange',
    () => {
      if (document.visibilityState !== 'visible' || !navigator.onLine) return
      // Falha esperada sem rede ou com a sessão do Access expirada (CA-12.3): tenta de novo
      // na próxima vez em que o app ficar visível.
      registration.update().catch(() => undefined)
    },
    { signal },
  )
}
