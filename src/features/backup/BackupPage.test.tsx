import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { encryptBackupText } from '@/lib/crypto'
import { THEME_STORAGE_KEY } from '@/lib/theme'
import { createBackupFile, readBackupTables } from '@/repositories/backupRepository'
import { getSetting, setSetting } from '@/repositories/settingsRepository'
import { createTag } from '@/repositories/tagsRepository'
import { createTransaction } from '@/repositories/transactionsRepository'
import { renderApp } from '@/test/renderApp'
import { failNextTransactionsBulkAdd } from '@/test/seedDatabase'

// RF-10 — tela de backup: princípio 16, mensagens exatas dos CAs, resumo e confirmação.
// As iterações do PBKDF2 são reduzidas só aqui, para os testes ficarem rápidos.
const TEST_ITERATIONS = 1000

vi.mock('@/repositories/backupRepository', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/repositories/backupRepository')>()
  return {
    ...actual,
    createBackupFile: vi.fn((password: string, options?: { now?: Date }) =>
      actual.createBackupFile(password, { ...options, iterations: TEST_ITERATIONS }),
    ),
  }
})

const PASSWORD = 'senha do backup'

function namedError(name: string): Error {
  return Object.assign(new Error(name), { name })
}

/** Web Share API de mentira no navigator do jsdom. */
function stubShare(share: () => Promise<void>) {
  const shareMock = vi.fn(share)
  Object.defineProperty(navigator, 'canShare', { configurable: true, value: () => true })
  Object.defineProperty(navigator, 'share', { configurable: true, value: shareMock })
  return shareMock
}

async function openBackupPage() {
  renderApp(['/ajustes/backup'])
  await screen.findByRole('heading', { level: 1, name: 'Backup' })
}

const exportSection = () => screen.getByRole('region', { name: 'Exportar' })
const importSection = () => screen.getByRole('region', { name: 'Importar' })
const exportButton = () =>
  within(exportSection()).getByRole<HTMLButtonElement>('button', {
    name: /Exportar backup|Gerando backup…/,
  })
const importButton = () =>
  within(importSection()).getByRole<HTMLButtonElement>('button', { name: 'Importar backup' })

function typeIn(label: string, value: string, scope: HTMLElement) {
  fireEvent.change(within(scope).getByLabelText(label), { target: { value } })
}

function fillExportPasswords(password = PASSWORD, confirmation = password) {
  typeIn('Senha', password, exportSection())
  typeIn('Confirmar senha', confirmation, exportSection())
}

function chooseFile(file: File) {
  fireEvent.change(within(importSection()).getByLabelText('Arquivo do backup'), {
    target: { files: [file] },
  })
}

async function seedData() {
  const tag = await createTag({ name: 'Mercado', color: '#16A34A' })
  await createTransaction({
    type: 'expense',
    amountCents: 1999,
    date: '2026-10-17',
    tagId: tag.id,
    description: 'Pão',
  })
  await createTransaction({
    type: 'income',
    amountCents: 500000,
    date: '2026-10-05',
    tagId: tag.id,
    description: 'Salário',
  })
  return tag
}

beforeEach(() => {
  URL.createObjectURL = vi.fn(() => 'blob:backup')
  URL.revokeObjectURL = vi.fn()
})

afterEach(() => {
  Reflect.deleteProperty(navigator, 'canShare')
  Reflect.deleteProperty(navigator, 'share')
  vi.mocked(createBackupFile).mockClear()
})

describe('BackupPage — exportar (RF-10)', () => {
  it('mostra "Último backup: nunca" e campos de senha new-password', async () => {
    await openBackupPage()
    expect(await screen.findByText('Último backup: nunca')).toBeDefined()
    for (const label of ['Senha', 'Confirmar senha']) {
      const input = within(exportSection()).getByLabelText(label)
      expect(input.getAttribute('type')).toBe('password')
      expect(input.getAttribute('autocomplete')).toBe('new-password')
    }
    expect(exportButton().disabled).toBe(true)
  })

  // Princípio 16 / D-36 — erros enquanto digita e botão só ativo com o formulário válido.
  it('só habilita "Exportar backup" com senha de 8+ caracteres e confirmação igual', async () => {
    await openBackupPage()
    const section = exportSection()

    typeIn('Senha', '1234567', section)
    expect(
      await within(section).findByText('A senha precisa ter pelo menos 8 caracteres'),
    ).toBeDefined()
    expect(exportButton().disabled).toBe(true)

    typeIn('Senha', '12345678', section)
    await waitFor(() =>
      expect(within(section).queryByText('A senha precisa ter pelo menos 8 caracteres')).toBeNull(),
    )
    expect(exportButton().disabled).toBe(true)

    typeIn('Confirmar senha', '1234567', section)
    expect(await within(section).findByText('As senhas não coincidem')).toBeDefined()
    expect(exportButton().disabled).toBe(true)

    typeIn('Confirmar senha', '12345678', section)
    await waitFor(() => expect(exportButton().disabled).toBe(false))
    expect(within(section).queryByText('As senhas não coincidem')).toBeNull()

    // Trocar a senha depois reconfere a confirmação.
    typeIn('Senha', '123456789', section)
    expect(await within(section).findByText('As senhas não coincidem')).toBeDefined()
    expect(exportButton().disabled).toBe(true)
  })

  it('mostra "Gerando backup…", compartilha o arquivo e grava o último backup', async () => {
    await seedData()
    const share = stubShare(() => Promise.resolve())
    let releaseFile: () => void = () => {}
    vi.mocked(createBackupFile).mockImplementationOnce(async (password) => {
      await new Promise<void>((resolve) => (releaseFile = resolve))
      const { createBackupFile: actualCreate } = await vi.importActual<
        typeof import('@/repositories/backupRepository')
      >('@/repositories/backupRepository')
      return actualCreate(password, { iterations: TEST_ITERATIONS })
    })
    await openBackupPage()
    fillExportPasswords()
    await waitFor(() => expect(exportButton().disabled).toBe(false))

    fireEvent.click(exportButton())
    await waitFor(() => expect(exportButton().textContent).toBe('Gerando backup…'))
    expect(exportButton().disabled).toBe(true)
    releaseFile()

    expect(await screen.findByText('Backup exportado.')).toBeDefined()
    expect(await screen.findByText('Último backup: hoje')).toBeDefined()
    const sharedFile = (share.mock.calls[0] as unknown as [ShareData])[0].files?.[0]
    expect(sharedFile?.name).toMatch(/^gastos-backup-\d{4}-\d{2}-\d{2}\.json$/)
    expect(within(exportSection()).getByLabelText<HTMLInputElement>('Senha').value).toBe('')
    expect(exportButton().disabled).toBe(true)
  })

  // §6.8 passo 8 — folha fechada (AbortError): nada de lastBackupAt.
  it('cancelar o compartilhamento não grava o último backup', async () => {
    stubShare(() => Promise.reject(namedError('AbortError')))
    await openBackupPage()
    fillExportPasswords()
    await waitFor(() => expect(exportButton().disabled).toBe(false))
    fireEvent.click(exportButton())

    expect(await screen.findByText('Exportação cancelada. O backup não foi salvo.')).toBeDefined()
    expect(await getSetting('lastBackupAt')).toBeNull()
    expect(screen.getByText('Último backup: nunca')).toBeDefined()
  })

  it('sem toque recente (NotAllowedError), "Salvar backup" abre a folha de novo', async () => {
    const share = stubShare(() => Promise.reject(namedError('NotAllowedError')))
    await openBackupPage()
    fillExportPasswords()
    await waitFor(() => expect(exportButton().disabled).toBe(false))
    fireEvent.click(exportButton())

    const saveButton = await screen.findByRole('button', { name: 'Salvar backup' })
    expect(
      screen.getByText('O backup está pronto. Toque em “Salvar backup” para guardá-lo.'),
    ).toBeDefined()
    share.mockImplementation(() => Promise.resolve())
    fireEvent.click(saveButton)

    expect(await screen.findByText('Backup exportado.')).toBeDefined()
    expect(createBackupFile).toHaveBeenCalledTimes(1)
    expect(await getSetting('lastBackupAt')).not.toBeNull()
  })

  async function reachSaveButton(share: ReturnType<typeof stubShare>) {
    await openBackupPage()
    fillExportPasswords()
    await waitFor(() => expect(exportButton().disabled).toBe(false))
    fireEvent.click(exportButton())
    const saveButton = await screen.findByRole('button', { name: 'Salvar backup' })
    expect(share).toHaveBeenCalledTimes(1)
    return saveButton
  }

  // RF-10 / §6.8 / D-48 — bug do teste manual no PC: a folha recusa o .json também com o
  // toque novo; "Salvar backup" não fazia nada. No 2º toque, recusa → download.
  it('NotAllowedError também no "Salvar backup" → baixa o arquivo e grava o último backup', async () => {
    const share = stubShare(() => Promise.reject(namedError('NotAllowedError')))
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    const saveButton = await reachSaveButton(share)

    fireEvent.click(saveButton)

    expect(await screen.findByText('Backup exportado.')).toBeDefined()
    expect(share).toHaveBeenCalledTimes(2)
    expect(URL.createObjectURL).toHaveBeenCalledTimes(1)
    expect(click).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('button', { name: 'Salvar backup' })).toBeNull()
    expect(createBackupFile).toHaveBeenCalledTimes(1)
    expect(await getSetting('lastBackupAt')).not.toBeNull()
    click.mockRestore()
  })

  // RF-10 / §6.8 passo 8 / D-48 — fechar a folha no 2º toque continua sendo cancelamento.
  it('cancelar a folha aberta pelo "Salvar backup" → mensagem de cancelado, sem download', async () => {
    const share = stubShare(() => Promise.reject(namedError('NotAllowedError')))
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    const saveButton = await reachSaveButton(share)
    share.mockImplementation(() => Promise.reject(namedError('AbortError')))

    fireEvent.click(saveButton)

    expect(await screen.findByText('Exportação cancelada. O backup não foi salvo.')).toBeDefined()
    expect(click).not.toHaveBeenCalled()
    expect(URL.createObjectURL).not.toHaveBeenCalled()
    expect(screen.queryByRole('button', { name: 'Salvar backup' })).toBeNull()
    expect(await getSetting('lastBackupAt')).toBeNull()
    click.mockRestore()
  })

  it('sem Web Share API, baixa o arquivo', async () => {
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    await openBackupPage()
    fillExportPasswords()
    await waitFor(() => expect(exportButton().disabled).toBe(false))
    fireEvent.click(exportButton())

    expect(await screen.findByText('Backup exportado.')).toBeDefined()
    expect(click).toHaveBeenCalledTimes(1)
    click.mockRestore()
  })

  it('falha ao gerar mostra o erro e mantém o botão ativo', async () => {
    vi.mocked(createBackupFile).mockRejectedValueOnce(new Error('sem crypto.subtle'))
    await openBackupPage()
    fillExportPasswords()
    await waitFor(() => expect(exportButton().disabled).toBe(false))
    fireEvent.click(exportButton())

    expect(await screen.findByRole('alert')).toHaveProperty(
      'textContent',
      'Não foi possível gerar o backup. Tente novamente.',
    )
    expect(exportButton().disabled).toBe(false)
  })
})

describe('BackupPage — importar (RF-10)', () => {
  async function exportCurrentData(): Promise<File> {
    return createBackupFile(PASSWORD)
  }

  async function submitImport(file: File, password = PASSWORD) {
    chooseFile(file)
    typeIn('Senha do backup', password, importSection())
    await waitFor(() => expect(importButton().disabled).toBe(false))
    fireEvent.click(importButton())
  }

  async function expectOpenError(message: string) {
    expect(await within(importSection()).findByRole('alert')).toHaveProperty('textContent', message)
  }

  it('só habilita "Importar backup" com arquivo e senha', async () => {
    await openBackupPage()
    expect(importButton().disabled).toBe(true)
    const input = within(importSection()).getByLabelText('Arquivo do backup')
    expect(input.getAttribute('type')).toBe('file')
    expect(input.getAttribute('accept')).toBe('application/json,.json')

    chooseFile(new File(['{}'], 'backup.json'))
    expect(importButton().disabled).toBe(true)
    typeIn('Senha do backup', 'x', importSection())
    await waitFor(() => expect(importButton().disabled).toBe(false))
    typeIn('Senha do backup', '', importSection())
    expect(await within(importSection()).findByText('Informe a senha')).toBeDefined()
    expect(importButton().disabled).toBe(true)
  })

  // CA-10.2
  it('senha errada → "Senha incorreta ou arquivo corrompido" e nada muda', async () => {
    await seedData()
    const file = await exportCurrentData()
    const before = await readBackupTables()
    await openBackupPage()
    await submitImport(file, 'senha errada')

    await expectOpenError('Senha incorreta ou arquivo corrompido')
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(await readBackupTables()).toEqual(before)
  })

  // CA-10.3
  it('arquivo que não é backup → "Arquivo inválido"', async () => {
    await openBackupPage()
    await submitImport(new File(['{"planilha": true}'], 'outro.json'))
    await expectOpenError('Arquivo inválido')
  })

  // CA-10.5
  it('backup de versão mais nova → mensagem de atualizar o app', async () => {
    const content = {
      app: 'app-gastos',
      schemaVersion: 99,
      exportedAt: '2030-01-01T00:00:00Z',
      data: {},
    }
    const envelope = await encryptBackupText(JSON.stringify(content), PASSWORD, {
      iterations: TEST_ITERATIONS,
    })
    await openBackupPage()
    await submitImport(new File([JSON.stringify(envelope)], 'novo.json'))
    await expectOpenError(
      'Backup de uma versão mais nova do app. Atualize o app e tente novamente.',
    )
  })

  it('mostra o resumo e o aviso; Cancelar não muda nada; confirmar substitui tudo', async () => {
    await seedData()
    await setSetting('theme', 'dark')
    const file = await exportCurrentData()
    const exported = await readBackupTables()

    // Dados atuais diferentes dos do backup.
    await setSetting('theme', 'light')
    await createTag({ name: 'Depois do backup', color: '#2563EB' })
    const current = await readBackupTables()

    await openBackupPage()
    await submitImport(file)

    const dialog = await screen.findByRole('dialog', { name: 'Importar backup?' })
    expect(within(dialog).getByText('2 lançamentos')).toBeDefined()
    expect(within(dialog).getByText('1 tag')).toBeDefined()
    expect(within(dialog).getByText('0 recorrentes')).toBeDefined()
    expect(within(dialog).getByText(/^\d{2}\/\d{2}\/\d{4} às \d{2}:\d{2}$/)).toBeDefined()
    expect(within(dialog).getByText('Isso vai substituir todos os dados atuais.')).toBeDefined()

    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancelar' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(await readBackupTables()).toEqual(current)

    fireEvent.click(importButton())
    const again = await screen.findByRole('dialog', { name: 'Importar backup?' })
    fireEvent.click(within(again).getByRole('button', { name: 'Substituir dados' }))

    expect(await screen.findByText('Backup importado.')).toBeDefined()
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    const restored = await readBackupTables()
    expect(restored.tags).toEqual(exported.tags)
    expect(restored.transactions).toEqual(exported.transactions)
    // D-28 — tema importado aplicado e espelhado.
    expect(await getSetting('theme')).toBe('dark')
    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark')
    await waitFor(() => expect(document.documentElement.classList.contains('dark')).toBe(true))
    expect(importButton().disabled).toBe(true)
  })
})

describe('BackupPage — mensagens, foco e último backup (RF-10 / RNF-06)', () => {
  async function submitImport(file: File, password = PASSWORD) {
    chooseFile(file)
    typeIn('Senha do backup', password, importSection())
    await waitFor(() => expect(importButton().disabled).toBe(false))
    fireEvent.click(importButton())
  }

  const importAlert = () => within(importSection()).queryByRole('alert')

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('"Último backup: hoje" e "há N dias" em Ajustes → Backup', async () => {
    await setSetting('lastBackupAt', new Date().toISOString())
    await openBackupPage()
    expect(await screen.findByText('Último backup: hoje')).toBeDefined()
  })

  it('"Último backup: há 3 dias"', async () => {
    const threeDaysAgo = new Date()
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3)
    await setSetting('lastBackupAt', threeDaysAgo.toISOString())
    await openBackupPage()
    expect(await screen.findByText('Último backup: há 3 dias')).toBeDefined()
  })

  it('falha inesperada ao ler o arquivo → "Não foi possível abrir o backup..."', async () => {
    const file = new File(['{}'], 'backup.json')
    file.text = () => Promise.reject(new Error('falha de leitura'))
    await openBackupPage()
    await submitImport(file)
    expect(await within(importSection()).findByRole('alert')).toHaveProperty(
      'textContent',
      'Não foi possível abrir o backup. Nenhum dado foi alterado.',
    )
  })

  // D-07 — falha no meio da gravação, pela tela: mensagem no modal e banco intacto.
  it('falha ao gravar → "Não foi possível importar o backup..." e nada muda', async () => {
    await seedData()
    const file = await createBackupFile(PASSWORD)
    await createTag({ name: 'Depois do backup', color: '#2563EB' })
    const before = await readBackupTables()
    await openBackupPage()
    await submitImport(file)

    const dialog = await screen.findByRole('dialog', { name: 'Importar backup?' })
    failNextTransactionsBulkAdd()
    fireEvent.click(within(dialog).getByRole('button', { name: 'Substituir dados' }))

    expect(await within(dialog).findByRole('alert')).toHaveProperty(
      'textContent',
      'Não foi possível importar o backup. Nenhum dado foi alterado.',
    )
    expect(
      within(dialog).getByRole<HTMLButtonElement>('button', { name: 'Substituir dados' }).disabled,
    ).toBe(false)
    expect(await readBackupTables()).toEqual(before)
  })

  it('mostra a data e a hora do backup no modal', async () => {
    const file = await createBackupFile(PASSWORD, { now: new Date(2026, 9, 17, 15, 5) })
    await openBackupPage()
    await submitImport(file)
    const dialog = await screen.findByRole('dialog', { name: 'Importar backup?' })
    expect(within(dialog).getByText('17/10/2026 às 15:05')).toBeDefined()
  })

  it('o erro de abertura some ao trocar a senha ou o arquivo', async () => {
    await openBackupPage()
    await submitImport(new File(['não é backup'], 'x.json'))
    await waitFor(() => expect(importAlert()?.textContent).toBe('Arquivo inválido'))

    typeIn('Senha do backup', 'outra senha', importSection())
    await waitFor(() => expect(importAlert()).toBeNull())

    fireEvent.click(importButton())
    await waitFor(() => expect(importAlert()?.textContent).toBe('Arquivo inválido'))
    chooseFile(new File(['{}'], 'outro.json'))
    await waitFor(() => expect(importAlert()).toBeNull())
  })

  it('depois de importar, o foco vai para "Backup importado."', async () => {
    const file = await createBackupFile(PASSWORD)
    await openBackupPage()
    await submitImport(file)
    const dialog = await screen.findByRole('dialog', { name: 'Importar backup?' })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Substituir dados' }))

    const status = await screen.findByText('Backup importado.')
    await waitFor(() => expect(document.activeElement).toBe(status))
  })

  it('"Salvar backup" recebe o foco; depois de exportar, a mensagem recebe', async () => {
    const share = stubShare(() => Promise.reject(namedError('NotAllowedError')))
    await openBackupPage()
    fillExportPasswords()
    await waitFor(() => expect(exportButton().disabled).toBe(false))
    fireEvent.click(exportButton())

    const saveButton = await screen.findByRole('button', { name: 'Salvar backup' })
    await waitFor(() => expect(document.activeElement).toBe(saveButton))

    share.mockImplementation(() => Promise.resolve())
    fireEvent.click(saveButton)
    const status = await screen.findByText('Backup exportado.')
    await waitFor(() => expect(document.activeElement).toBe(status))
  })
})
