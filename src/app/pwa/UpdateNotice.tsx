import { usePwaUpdate } from '@/app/pwa/usePwaUpdate'
import { Notice } from '@/components/ui/Notice'

/**
 * CA-11.3 — aviso de nova versão logo acima da barra inferior. A região viva existe
 * sempre (mesmo vazia) para o leitor de tela anunciar o aviso quando ele aparecer.
 */
export function UpdateNotice() {
  const { isUpdateAvailable, applyUpdate } = usePwaUpdate()

  return (
    <div role="status" aria-live="polite" className="px-safe bottom-above-nav fixed inset-x-0">
      {isUpdateAvailable && (
        <div className="mx-auto flex h-(--update-notice-height) max-w-2xl flex-col justify-end pb-2">
          <Notice variant="accent">
            <Notice.Message>Nova versão disponível</Notice.Message>
            <Notice.Action onClick={applyUpdate}>Atualizar</Notice.Action>
          </Notice>
        </div>
      )}
    </div>
  )
}
