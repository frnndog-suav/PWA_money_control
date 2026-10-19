import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { AboutPage } from '@/features/settings/AboutPage'
import { APP_VERSION } from '@/lib/appVersion'

const LAZY_IMPORT_TIMEOUT_MS = 15_000

type StorageStub = Partial<Pick<StorageManager, 'persisted' | 'estimate'>>

// O jsdom não tem navigator.storage; cada teste define o seu.
function stubStorage(storage: StorageStub | undefined) {
  Object.defineProperty(navigator, 'storage', { value: storage, configurable: true })
}

function renderAboutPage() {
  render(
    <MemoryRouter>
      <AboutPage />
    </MemoryRouter>,
  )
}

function row(label: string) {
  const term = screen.getByText(label)
  return term.parentElement as HTMLElement
}

describe('AboutPage (RF-11)', () => {
  afterEach(() => {
    Reflect.deleteProperty(navigator, 'storage')
    vi.restoreAllMocks()
  })

  // CA-11.5 — versão do app, versão do esquema e espaço usado.
  it('mostra versões e espaço usado', async () => {
    stubStorage({
      persisted: () => Promise.resolve(true),
      estimate: () => Promise.resolve({ usage: 1_234_567, quota: 500_000_000 }),
    })
    renderAboutPage()

    expect(screen.getByRole('heading', { name: 'Sobre' })).toBeDefined()
    expect(within(row('Versão do app')).getByText(APP_VERSION)).toBeDefined()
    expect(within(row('Versão do esquema do banco')).getByText('1')).toBeDefined()
    expect(within(row('Espaço usado')).getByText('Carregando…')).toBeDefined()

    expect(await screen.findByText('1,2 MB de 500 MB')).toBeDefined()
    // CA-11.4
    expect(screen.getByText('Armazenamento persistente: ativo')).toBeDefined()
  })

  // CA-11.4 — sem garantia do navegador.
  it('mostra "não garantido" quando o armazenamento não é persistente', async () => {
    stubStorage({
      persisted: () => Promise.resolve(false),
      estimate: () => Promise.resolve({ usage: 0, quota: 1_000_000_000 }),
    })
    renderAboutPage()
    expect(screen.getByText('Armazenamento persistente: verificando…')).toBeDefined()
    expect(await screen.findByText('Armazenamento persistente: não garantido')).toBeDefined()
    expect(screen.getByText('0 B de 1 GB')).toBeDefined()
  })

  it('trata navegador sem a API de armazenamento', async () => {
    stubStorage(undefined)
    renderAboutPage()
    expect(await screen.findByText('Indisponível neste navegador')).toBeDefined()
    expect(screen.getByText('Armazenamento persistente: não garantido')).toBeDefined()
  })

  // §6.11 — ferramentas de dados de exemplo (o Vitest roda com import.meta.env.DEV = true).
  it('em DEV mostra as ferramentas de dados de exemplo e pede confirmação', async () => {
    stubStorage(undefined)
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
    renderAboutPage()

    // O primeiro import dinâmico (com o CSS do Tailwind) pode demorar alguns segundos.
    const clearButton = await screen.findByRole(
      'button',
      { name: 'Apagar todos os dados' },
      { timeout: LAZY_IMPORT_TIMEOUT_MS },
    )
    fireEvent.click(clearButton)
    expect(confirm).toHaveBeenCalledOnce()

    confirm.mockReturnValue(true)
    fireEvent.click(screen.getByRole('button', { name: 'Apagar todos os dados' }))
    await waitFor(() => expect(screen.getByText('Todos os dados foram apagados.')).toBeDefined())
  }, 20_000)
})
