import { applyPwaUpdate } from '@/app/pwa/registerPwa'
import { useUiStore } from '@/stores/uiStore'

interface PwaUpdate {
  isUpdateAvailable: boolean
  applyUpdate: () => Promise<void>
}

/** CA-11.3 — estado do aviso "Nova versão disponível" e a ação do botão "Atualizar". */
export function usePwaUpdate(): PwaUpdate {
  const isUpdateAvailable = useUiStore((state) => state.updateAvailable)
  return { isUpdateAvailable, applyUpdate: applyPwaUpdate }
}
