import { useIsStandalone } from '@/app/pwa/useIsStandalone'
import { Notice } from '@/components/ui/Notice'

/** CA-11.6 — aviso discreto quando o app está numa aba comum do navegador. */
export function InstallHint() {
  const isStandalone = useIsStandalone()
  if (isStandalone) return null

  return (
    <Notice variant="subtle">
      <Notice.Message>
        Para seus dados ficarem guardados com segurança, adicione o app à Tela de Início e use
        sempre pelo ícone.
      </Notice.Message>
    </Notice>
  )
}
