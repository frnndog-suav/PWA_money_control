import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { createTag } from '@/repositories/tagsRepository'
import { makeInstallmentGroup, makeRecurring, makeTransaction } from '@/test/factories'
import { renderApp } from '@/test/renderApp'
import { readAllTags, seedRecords } from '@/test/seedDatabase'

async function openTagsPage() {
  renderApp(['/ajustes/tags'])
  await screen.findByRole('heading', { name: 'Tags' })
}

async function openNewTagDialog() {
  fireEvent.click(await screen.findByRole('button', { name: 'Nova tag' }))
  return screen.getByRole('dialog', { name: 'Nova tag' })
}

function fillName(dialog: HTMLElement, name: string) {
  fireEvent.change(within(dialog).getByLabelText('Nome'), { target: { value: name } })
}

// Princípio 16 / D-36 — o "Salvar" só ativa depois da validação (assíncrona) do formulário.
async function save(dialog: HTMLElement) {
  const button = within(dialog).getByRole<HTMLButtonElement>('button', { name: 'Salvar' })
  await waitFor(() => expect(button.disabled).toBe(false))
  fireEvent.click(button)
}

async function openEditDialog(tagName: string) {
  fireEvent.click(await screen.findByRole('button', { name: new RegExp(`^${tagName}`) }))
  return screen.getByRole('dialog', { name: 'Editar tag' })
}

describe('TagsPage (RF-03)', () => {
  it('estado vazio em pt-BR', async () => {
    await openTagsPage()
    expect(await screen.findByText(/Nenhuma tag ainda/)).toBeDefined()
  })

  // CA-03.1 / CA-03.5 — criar e ver na lista com chip e quantidade de lançamentos.
  it('cria uma tag com cor da paleta e mostra na lista', async () => {
    await openTagsPage()
    const dialog = await openNewTagDialog()

    fillName(dialog, '  Mercado ')
    fireEvent.click(within(dialog).getByRole('radio', { name: 'Verde' }))
    expect(within(dialog).getByRole<HTMLInputElement>('radio', { name: 'Verde' }).checked).toBe(
      true,
    )
    expect(within(dialog).getByText('Cor escolhida: Verde')).toBeDefined()
    await save(dialog)

    expect(
      await screen.findByRole('button', { name: /^Mercado\s*Nenhum lançamento/ }),
    ).toBeDefined()
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(await readAllTags()).toMatchObject([
      { name: 'Mercado', nameKey: 'mercado', color: '#16A34A' },
    ])
  })

  it('paleta com 12 cores e seletor livre de cor', async () => {
    await openTagsPage()
    const dialog = await openNewTagDialog()

    expect(within(dialog).getAllByRole('radio')).toHaveLength(12)
    fireEvent.input(within(dialog).getByLabelText('Outra cor'), { target: { value: '#a1b2c3' } })
    expect(within(dialog).getByText('Cor escolhida: personalizada (#A1B2C3)')).toBeDefined()
    expect(
      within(dialog)
        .getAllByRole<HTMLInputElement>('radio')
        .some((radio) => radio.checked),
    ).toBe(false)

    fillName(dialog, 'Viagem')
    await save(dialog)
    await screen.findByRole('button', { name: /^Viagem/ })
    expect((await readAllTags())[0].color).toBe('#A1B2C3')
  })

  it('prévia do chip acompanha o nome digitado', async () => {
    await openTagsPage()
    const dialog = await openNewTagDialog()
    expect(within(dialog).getByText('Nome da tag')).toBeDefined()
    fillName(dialog, 'Lazer')
    expect(within(dialog).getByText('Lazer')).toBeDefined()
  })

  // CA-03.4 — texto exato do erro de nome repetido (sem diferenciar maiúsculas e acentos).
  it('nome repetido → "Já existe uma tag com esse nome"', async () => {
    await createTag({ name: 'Mercado', color: '#16A34A' })
    await openTagsPage()
    const dialog = await openNewTagDialog()

    fillName(dialog, 'mércado')
    await save(dialog)

    const error = await within(dialog).findByText('Já existe uma tag com esse nome')
    expect(within(dialog).getByLabelText('Nome').getAttribute('aria-describedby')).toBe(error.id)
    expect(await readAllTags()).toHaveLength(1)
  })

  // CA-03.1 — renomear e trocar a cor.
  it('edita nome e cor de uma tag', async () => {
    const tag = await createTag({ name: 'Lazer', color: '#9333EA' })
    await openTagsPage()
    const dialog = await openEditDialog('Lazer')

    expect(within(dialog).getByLabelText<HTMLInputElement>('Nome').value).toBe('Lazer')
    expect(within(dialog).getByRole<HTMLInputElement>('radio', { name: 'Roxo' }).checked).toBe(true)
    fillName(dialog, 'Diversão')
    fireEvent.click(within(dialog).getByRole('radio', { name: 'Rosa' }))
    await save(dialog)

    expect(await screen.findByRole('button', { name: /^Diversão/ })).toBeDefined()
    expect(screen.queryByRole('button', { name: /^Lazer/ })).toBeNull()
    expect((await readAllTags()).find((stored) => stored.id === tag.id)).toMatchObject({
      name: 'Diversão',
      color: '#DB2777',
    })
  })

  it('Cancelar fecha sem salvar', async () => {
    await openTagsPage()
    const dialog = await openNewTagDialog()
    fillName(dialog, 'Mercado')
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancelar' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(await readAllTags()).toHaveLength(0)
  })

  // CA-03.3 — exclusão sem uso, com confirmação.
  it('exclui uma tag sem uso depois de confirmar', async () => {
    await createTag({ name: 'Diversão', color: '#DB2777' })
    await openTagsPage()
    const dialog = await openEditDialog('Diversão')

    fireEvent.click(within(dialog).getByRole('button', { name: 'Excluir tag' }))
    const confirm = await screen.findByRole('dialog', { name: 'Excluir tag?' })
    expect(within(confirm).getByText(/“Diversão” será excluída/)).toBeDefined()
    fireEvent.click(within(confirm).getByRole('button', { name: 'Excluir' }))

    expect(await screen.findByText(/Nenhuma tag ainda/)).toBeDefined()
    expect(await readAllTags()).toHaveLength(0)
  })

  // CA-03.2 / D-02 — bloqueio com a contagem de cada tipo de registro.
  it('bloqueia a exclusão de tag em uso e informa quantos registros a usam', async () => {
    const tag = await createTag({ name: 'Mercado', color: '#16A34A' })
    await seedRecords({
      transactions: [
        makeTransaction({ tagId: tag.id }),
        makeTransaction({ tagId: tag.id }),
        makeTransaction({ tagId: tag.id }),
      ],
      recurrings: [makeRecurring({ tagId: tag.id })],
      installmentGroups: [makeInstallmentGroup({ tagId: tag.id })],
    })
    await openTagsPage()

    expect(await screen.findByText('3 lançamentos')).toBeDefined()
    const dialog = await openEditDialog('Mercado')
    fireEvent.click(within(dialog).getByRole('button', { name: 'Excluir tag' }))

    const blocked = await screen.findByRole('dialog', { name: 'Não é possível excluir' })
    expect(
      within(blocked).getByText(
        /está em uso por 3 lançamentos, 1 recorrente e 1 parcelamento e não pode ser excluída/,
      ),
    ).toBeDefined()
    fireEvent.click(within(blocked).getByRole('button', { name: 'Entendi' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(await readAllTags()).toHaveLength(1)
  })

  // D-02 — algo passou a usar a tag enquanto a confirmação estava aberta.
  it('se a tag passar a ser usada durante a confirmação, a exclusão é bloqueada', async () => {
    const tag = await createTag({ name: 'Lazer', color: '#9333EA' })
    await openTagsPage()
    const dialog = await openEditDialog('Lazer')
    fireEvent.click(within(dialog).getByRole('button', { name: 'Excluir tag' }))
    const confirm = await screen.findByRole('dialog', { name: 'Excluir tag?' })

    await seedRecords({ transactions: [makeTransaction({ tagId: tag.id })] })
    fireEvent.click(within(confirm).getByRole('button', { name: 'Excluir' }))

    const blocked = await screen.findByRole('dialog', { name: 'Não é possível excluir' })
    expect(within(blocked).getByText(/em uso por 1 lançamento e/)).toBeDefined()
    expect(await readAllTags()).toHaveLength(1)
  })

  // CA-03.5 — ordenada por nome.
  it('lista ordenada por nome', async () => {
    await createTag({ name: 'Salário', color: '#2563EB' })
    await createTag({ name: 'Lazer', color: '#9333EA' })
    await createTag({ name: 'Água', color: '#0891B2' })
    await openTagsPage()

    await screen.findByRole('button', { name: /^Salário/ })
    const names = screen
      .getAllByRole('button', { name: /Nenhum lançamento/ })
      .map((button) => button.textContent?.split('Nenhum')[0])
    expect(names).toEqual(['Água', 'Lazer', 'Salário'])
  })

  it('Esc fecha o modal', async () => {
    await openTagsPage()
    const dialog = await openNewTagDialog()
    fireEvent(dialog, new Event('cancel', { cancelable: true }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
  })
})
