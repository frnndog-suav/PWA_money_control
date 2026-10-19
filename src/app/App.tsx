import { createBrowserRouter } from 'react-router'
import { RouterProvider } from 'react-router/dom'
import { routes } from '@/app/routes'
import { usePersistentStorageRequest } from '@/app/storage/usePersistentStorageRequest'
import { ThemeProvider } from '@/app/theme/ThemeProvider'

// Histórico do navegador: o gesto/botão "voltar" funciona dentro do app (CA-13.2).
const router = createBrowserRouter(routes)

export function App() {
  usePersistentStorageRequest()

  return (
    <ThemeProvider>
      <RouterProvider router={router} />
    </ThemeProvider>
  )
}
