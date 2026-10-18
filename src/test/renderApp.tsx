import { render } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { routes } from '@/app/routes'
import { ThemeProvider } from '@/app/theme/ThemeProvider'

type MemoryRouter = ReturnType<typeof createMemoryRouter>

/** Renderiza o app inteiro com histórico em memória; a última entrada é a tela atual. */
export function renderApp(initialEntries: string[] = ['/']): MemoryRouter {
  const router = createMemoryRouter(routes, { initialEntries })
  render(
    <ThemeProvider>
      <RouterProvider router={router} />
    </ThemeProvider>,
  )
  return router
}

/** Adiciona ao <head> a meta theme-color que o index.html traz. */
export function addThemeColorMeta(content = '#ffffff'): HTMLMetaElement {
  const meta = document.createElement('meta')
  meta.name = 'theme-color'
  meta.content = content
  document.head.append(meta)
  return meta
}
