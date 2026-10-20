import { act, fireEvent, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { createTag } from '@/repositories/tagsRepository'
import { renderApp } from '@/test/renderApp'
import { readAllTags } from '@/test/seedDatabase'
import { fillTransactionForm, submit } from '@/test/transactionForm'

// CA-03.2 completo (roteiro da Fase 4, item 6): a tag usada por um lançamento feito no
// formulário de verdade não pode ser excluída, e o app informa a contagem.
describe('Tags — bloqueio por lançamento real (CA-03.2)', () => {
  it('lançar com "Mercado" e tentar excluí-la → bloqueado com "1 lançamento"', async () => {
    await createTag({ name: 'Mercado', color: '#16A34A' })
    const router = renderApp(['/'])
    await screen.findByRole('heading', { level: 1, name: 'Início' })

    await fillTransactionForm({ digits: '25000', tag: 'Mercado', description: 'Feira' })
    await submit('Lançar')
    await screen.findByText('Lançamento salvo')

    await act(() => router.navigate('/ajustes/tags'))
    fireEvent.click(await screen.findByRole('button', { name: /^Mercado\s*1 lançamento/ }))
    const dialog = screen.getByRole('dialog', { name: 'Editar tag' })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Excluir tag' }))

    const blocked = await screen.findByRole('dialog', { name: 'Não é possível excluir' })
    expect(
      within(blocked).getByText(/em uso por 1 lançamento e não pode ser excluída/),
    ).toBeDefined()
    expect(await readAllTags()).toHaveLength(1)
  })
})
