import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import * as tagsRepository from '@/repositories/tagsRepository'
import { renderApp } from '@/test/renderApp'
import { readAllTags } from '@/test/seedDatabase'

// Princípio 16 / D-36 — "Salvar" só ativo com o formulário válido e erros enquanto digita.
vi.mock('@/repositories/tagsRepository', async (importOriginal) => {
  const actual = await importOriginal<typeof tagsRepository>()
  return { ...actual, createTag: vi.fn(actual.createTag) }
})

const createTag = vi.mocked(tagsRepository.createTag)

const NAME_REQUIRED = 'Informe o nome da tag'
const NAME_TOO_LONG = 'O nome pode ter no máximo 30 caracteres'

afterEach(() => {
  vi.clearAllMocks()
})

async function openDialog(trigger: RegExp | string, title: string) {
  renderApp(['/ajustes/tags'])
  fireEvent.click(await screen.findByRole('button', { name: trigger }))
  return screen.getByRole('dialog', { name: title })
}

function saveButton(dialog: HTMLElement) {
  return within(dialog).getByRole<HTMLButtonElement>('button', { name: 'Salvar' })
}

function typeName(dialog: HTMLElement, name: string) {
  fireEvent.change(within(dialog).getByLabelText('Nome'), { target: { value: name } })
}

async function expectSaveEnabled(dialog: HTMLElement, isEnabled: boolean) {
  await waitFor(() => expect(saveButton(dialog).disabled).toBe(!isEnabled))
}

describe('TagForm — botão "Salvar" e erros enquanto digita (princípio 16 / D-36)', () => {
  it('"Nova tag" começa com "Salvar" desabilitado e sem mensagem de erro', async () => {
    const dialog = await openDialog('Nova tag', 'Nova tag')

    await expectSaveEnabled(dialog, false)
    expect(within(dialog).queryByText(NAME_REQUIRED)).toBeNull()
    expect(within(dialog).getByLabelText('Nome').getAttribute('aria-invalid')).toBeNull()
  })

  it('digitar um nome válido habilita o botão', async () => {
    const dialog = await openDialog('Nova tag', 'Nova tag')

    typeName(dialog, 'Mercado')

    await expectSaveEnabled(dialog, true)
  })

  it('31 caracteres desabilita e mostra o erro; voltar para 30 habilita e o erro some', async () => {
    const dialog = await openDialog('Nova tag', 'Nova tag')
    const input = within(dialog).getByLabelText<HTMLInputElement>('Nome')

    typeName(dialog, 'a'.repeat(31))
    // Sem `maxLength`: o usuário consegue passar do limite e vê o erro.
    expect(input.value).toHaveLength(31)
    expect(await within(dialog).findByText(NAME_TOO_LONG)).toBeDefined()
    expect(input.getAttribute('aria-invalid')).toBe('true')
    await expectSaveEnabled(dialog, false)

    typeName(dialog, 'a'.repeat(30))
    await waitFor(() => expect(within(dialog).queryByText(NAME_TOO_LONG)).toBeNull())
    await expectSaveEnabled(dialog, true)
  })

  it('nome só com espaços mantém o botão desabilitado', async () => {
    const dialog = await openDialog('Nova tag', 'Nova tag')

    typeName(dialog, '    ')

    expect(await within(dialog).findByText(NAME_REQUIRED)).toBeDefined()
    await expectSaveEnabled(dialog, false)
  })

  it('apagar o nome mostra "Informe o nome da tag"', async () => {
    const dialog = await openDialog('Nova tag', 'Nova tag')
    typeName(dialog, 'Mercado')
    await expectSaveEnabled(dialog, true)

    typeName(dialog, '')

    expect(await within(dialog).findByText(NAME_REQUIRED)).toBeDefined()
    await expectSaveEnabled(dialog, false)
  })

  it('o botão fica desabilitado durante o envio', async () => {
    let finishSave = () => {}
    createTag.mockImplementationOnce(
      (input) =>
        new Promise((resolve) => {
          finishSave = () =>
            resolve({
              id: 'tag-1',
              nameKey: 'mercado',
              createdAt: '2026-10-20T12:00:00.000Z',
              updatedAt: '2026-10-20T12:00:00.000Z',
              ...input,
            })
        }),
    )
    const dialog = await openDialog('Nova tag', 'Nova tag')
    typeName(dialog, 'Mercado')
    await expectSaveEnabled(dialog, true)

    fireEvent.click(saveButton(dialog))

    await expectSaveEnabled(dialog, false)
    finishSave()
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
  })

  it('"Editar tag" começa com o botão habilitado', async () => {
    await tagsRepository.createTag({ name: 'Lazer', color: '#9333EA' })
    const dialog = await openDialog(/^Lazer/, 'Editar tag')

    await expectSaveEnabled(dialog, true)
    expect(within(dialog).queryByText(NAME_REQUIRED)).toBeNull()
  })

  it('"Editar tag" já abre com o "Salvar" habilitado na primeira renderização', async () => {
    await tagsRepository.createTag({ name: 'Lazer', color: '#9333EA' })
    const dialog = await openDialog(/^Lazer/, 'Editar tag')

    // Sem waitFor: o botão não pode piscar desabilitado enquanto o RHF calcula isValid.
    expect(saveButton(dialog).disabled).toBe(false)
  })

  // CA-03.4 — trocar só a cor também tira o erro de nome repetido, junto com o botão.
  it('nome repetido some ao trocar só a cor e o botão reativa', async () => {
    await tagsRepository.createTag({ name: 'Mercado', color: '#16A34A' })
    const dialog = await openDialog('Nova tag', 'Nova tag')
    typeName(dialog, 'Mercado')
    await expectSaveEnabled(dialog, true)
    fireEvent.click(saveButton(dialog))
    expect(await within(dialog).findByText('Já existe uma tag com esse nome')).toBeDefined()
    await expectSaveEnabled(dialog, false)

    fireEvent.click(within(dialog).getByRole('radio', { name: 'Rosa' }))

    await waitFor(() =>
      expect(within(dialog).queryByText('Já existe uma tag com esse nome')).toBeNull(),
    )
    expect(within(dialog).getByLabelText('Nome').getAttribute('aria-invalid')).toBeNull()
    await expectSaveEnabled(dialog, true)
  })

  // CA-03.4 — depende do banco, então aparece ao salvar; mudar o nome reativa o botão.
  it('nome repetido continua aparecendo ao salvar e o botão reativa ao mudar o nome', async () => {
    await tagsRepository.createTag({ name: 'Mercado', color: '#16A34A' })
    const dialog = await openDialog('Nova tag', 'Nova tag')
    typeName(dialog, 'MERCADO')
    await expectSaveEnabled(dialog, true)
    expect(within(dialog).queryByText('Já existe uma tag com esse nome')).toBeNull()

    fireEvent.click(saveButton(dialog))

    expect(await within(dialog).findByText('Já existe uma tag com esse nome')).toBeDefined()
    await expectSaveEnabled(dialog, false)

    typeName(dialog, 'Mercado 2')
    await waitFor(() =>
      expect(within(dialog).queryByText('Já existe uma tag com esse nome')).toBeNull(),
    )
    await expectSaveEnabled(dialog, true)
    expect(await readAllTags()).toHaveLength(1)
  })

  it('falha ao gravar mostra a mensagem e mantém "Salvar" ativo para tentar de novo', async () => {
    createTag.mockRejectedValueOnce(new Error('IndexedDB indisponível'))
    const dialog = await openDialog('Nova tag', 'Nova tag')
    typeName(dialog, 'Mercado')
    await expectSaveEnabled(dialog, true)

    fireEvent.click(saveButton(dialog))

    expect(await within(dialog).findByRole('alert')).toBeDefined()
    await expectSaveEnabled(dialog, true)
  })
})
