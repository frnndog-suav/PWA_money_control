import { Suspense } from 'react'
import { Outlet } from 'react-router'
import { BottomNav } from '@/app/layout/BottomNav'

export function AppLayout() {
  return (
    <>
      <main className="px-safe pt-safe pb-below-nav mx-auto min-h-dvh max-w-2xl">
        {/* Telas carregadas sob demanda (React.lazy); sem indicador para não piscar. */}
        <Suspense fallback={null}>
          <Outlet />
        </Suspense>
      </main>
      <BottomNav />
    </>
  )
}
