import { Suspense } from 'react'
import { Outlet } from 'react-router'
import { BottomNav } from '@/app/layout/BottomNav'
import { InstallHint } from '@/app/pwa/InstallHint'
import { UpdateNotice } from '@/app/pwa/UpdateNotice'
import { usePwaUpdate } from '@/app/pwa/usePwaUpdate'

export function AppLayout() {
  const { isUpdateAvailable } = usePwaUpdate()
  // O aviso de nova versão é fixo acima da barra; enquanto aparece, o fim do conteúdo
  // ganha a mesma altura extra para não ficar escondido atrás dele (§2.10).
  const bottomSpace = isUpdateAvailable ? 'pb-below-nav reserve-update-notice' : 'pb-below-nav'

  return (
    <>
      <main
        className={`px-safe pt-safe mx-auto flex min-h-dvh max-w-2xl flex-col gap-4 ${bottomSpace}`}
      >
        {/* No layout, e não só no Início, porque o app pode ser aberto por qualquer URL. */}
        <InstallHint />
        {/* Telas carregadas sob demanda (React.lazy); sem indicador para não piscar. */}
        <Suspense fallback={null}>
          <Outlet />
        </Suspense>
      </main>
      <UpdateNotice />
      <BottomNav />
    </>
  )
}
