import { Link } from 'react-router'
import { Button } from '@/components/ui/Button'
import { buttonVariantClasses } from '@/components/ui/buttonClasses'
import { Page } from '@/components/ui/Page'
import {
  GO_HOME_LABEL,
  RETRY_LABEL,
  ROUTE_ERROR_MESSAGE,
  ROUTE_ERROR_TITLE,
} from '@/app/layout/routeErrorTexts'

/**
 * `inLayout`: dentro do layout, com a barra inferior (falha de uma tela); `standalone`: no
 * lugar do layout inteiro (falha do próprio layout), com as margens e áreas seguras dele.
 */
export type RouteErrorPlacement = 'inLayout' | 'standalone'

interface RouteErrorPageProps {
  placement: RouteErrorPlacement
}

// Recarregar refaz a leitura do banco e baixa de novo um pedaço do app que não carregou.
function reloadApp() {
  window.location.reload()
}

function RouteErrorContent() {
  return (
    <Page>
      <Page.Header>{ROUTE_ERROR_TITLE}</Page.Header>
      <p role="alert">{ROUTE_ERROR_MESSAGE}</p>
      <div className="flex flex-wrap gap-2">
        <Button variant="primary" onClick={reloadApp}>
          {RETRY_LABEL}
        </Button>
        {/* reloadDocument: sai do estado de erro mesmo quando o erro foi no Início. */}
        <Link
          to="/"
          reloadDocument
          className={`flex items-center ${buttonVariantClasses('secondary')}`}
        >
          {GO_HOME_LABEL}
        </Link>
      </div>
    </Page>
  )
}

/**
 * Fase 11 — tela de erro das rotas, em pt-BR, no lugar da tela padrão (em inglês) do React
 * Router: uma leitura do Dexie que falha (o `useLiveQuery` relança o erro na renderização) ou
 * uma tela `lazy` que não carregou nunca deixam a tela branca.
 */
export function RouteErrorPage({ placement }: RouteErrorPageProps) {
  if (placement === 'inLayout') return <RouteErrorContent />
  return (
    <main className="px-safe pt-safe mx-auto flex min-h-dvh max-w-2xl flex-col gap-4 pb-4">
      <RouteErrorContent />
    </main>
  )
}
