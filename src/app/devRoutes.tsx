import { lazy, Suspense } from 'react'
import type { RouteObject } from 'react-router'

/**
 * Rotas somente de desenvolvimento (§6.12 / D-17), ex.: /__dev/arquitetura.
 * Declare cada `lazy(() => import(...))` DENTRO desta função, depois do guard abaixo:
 * em produção `import.meta.env.DEV` vira `false`, o resto da função é código morto
 * e os imports dinâmicos não entram no build (conferir no dist/).
 */
export function getDevRoutes(): RouteObject[] {
  if (!import.meta.env.DEV) return []

  const ArchitecturePage = lazy(() => import('@/dev/architecture/ArchitecturePage'))

  // Fora do AppLayout (sem barra inferior), então precisa do próprio Suspense.
  return [
    {
      path: '/__dev/arquitetura',
      element: (
        <Suspense fallback={null}>
          <ArchitecturePage />
        </Suspense>
      ),
    },
  ]
}
