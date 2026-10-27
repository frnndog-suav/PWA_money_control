import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Recurring, Tag } from '@/domain/types'
import { confirmOccurrence, listRecurrings } from '@/repositories/recurringsRepository'
import { freezeToday, openDialog, seedLightBill } from '@/test/recurrings'
import { renderApp } from '@/test/renderApp'
import { text } from '@/test/transactionList'
import { clearAmount, typeAmount } from '@/test/transactionForm'

// RF-07 / CA-07.6 — detalhes de um recorrente (Fase 9). Hoje = 24/10/2026.

beforeEach(() => freezeToday())
afterEach(() => vi.useRealTimers())

async function openDetail(light: Recurring) {
  const router = renderApp(['/ajustes/recorrentes', `/ajustes/recorrentes/${light.id}`])
  await screen.findByRole('heading', { level: 1, name: light.description })
  // O corpo só aparece depois de carregar também as confirmações.
  await screen.findByRole('button', { name: 'Alterar valor' })
  return router
}

/** Digita no campo "Novo valor" como o teclado numérico (CA-01.3). */
function typeNewAmount(digits: string, dialog: HTMLElement): void {
  const input = within(dialog).getByLabelText<HTMLInputElement>('Novo valor')
  for (const digit of digits) fireEvent.change(input, { target: { value: input.value + digit } })
}

function currentMonth(): HTMLElement {
  return screen.getByRole('region', { name: 'outubro de 2026' })
}

function confirmNovember(light: Recurring, tag: Tag, date = '2026-11-17') {
  return confirmOccurrence(light.id, '2026-11', {
    amountCents: 18740,
    date,
    tagId: tag.id,
    description: 'Conta de luz',
  })
}

describe('RecurringDetailPage — mês atual (RF-07 / CA-07.2 / CA-07.8)', () => {
  it('confirmar: data sugerida é hoje, "ⓘ" explica e a ocorrência vira lançamento', async () => {
    const { light } = await seedLightBill()
    await openDetail(light)
    expect(within(currentMonth()).getByText('Pendente neste mês')).toBeTruthy()

    fireEvent.click(within(currentMonth()).getByRole('button', { name: 'Confirmar' }))
    const dialog = await openDialog('Confirmar “Conta de luz”')
    const date = within(dialog).getByLabelText<HTMLInputElement>('Data')
    expect(date.value).toBe('2026-10-24')
    expect(within(dialog).getByText('Escolha um dia de outubro de 2026.')).toBeTruthy()

    const info = within(dialog).getByRole('button', { name: 'Por que esta data?' })
    fireEvent.click(info)
    expect(info.getAttribute('aria-expanded')).toBe('true')
    expect(
      within(dialog).getByText(
        'A data sugerida é hoje porque esta ocorrência é do mês atual. Você pode escolher qualquer dia deste mês.',
      ),
    ).toBeTruthy()

    clearAmount(dialog)
    typeAmount('18740', dialog)
    fireEvent.click(within(dialog).getByRole('button', { name: 'Confirmar' }))

    await waitFor(() =>
      expect(within(currentMonth()).getByText('Confirmado neste mês')).toBeTruthy(),
    )
    const confirmed = screen.getByRole('region', { name: 'Lançamentos confirmados' })
    expect(text(confirmed.textContent ?? '')).toContain('−R$ 187,40')
    expect(text(confirmed.textContent ?? '')).toContain('24/10/2026')
  })

  it('pular e desfazer o mês atual (CA-07.4)', async () => {
    const { light } = await seedLightBill()
    await openDetail(light)

    fireEvent.click(within(currentMonth()).getByRole('button', { name: 'Pular' }))
    await waitFor(() => expect(within(currentMonth()).getByText('Pulado neste mês')).toBeTruthy())
    const skipped = screen.getByRole('region', { name: 'Meses pulados' })
    expect(within(skipped).getByText('outubro de 2026')).toBeTruthy()

    fireEvent.click(within(skipped).getByRole('button', { name: 'Desfazer: outubro de 2026' }))
    await waitFor(() => expect(within(currentMonth()).getByText('Pendente neste mês')).toBeTruthy())
    expect(screen.queryByRole('region', { name: 'Meses pulados' })).toBeNull()
  })
})

describe('RecurringDetailPage — alterar valor (CA-07.3)', () => {
  it('novo valor a partir de novembro; o histórico mostra os dois', async () => {
    const { tag, light } = await seedLightBill()
    await confirmOccurrence(light.id, '2026-10', {
      amountCents: 18740,
      date: '2026-10-05',
      tagId: tag.id,
      description: 'Conta de luz',
    })
    await openDetail(light)

    fireEvent.click(screen.getByRole('button', { name: 'Alterar valor' }))
    const dialog = await openDialog('Alterar valor')
    expect(within(dialog).getByLabelText<HTMLInputElement>('A partir de').value).toBe('2026-10')
    typeNewAmount('20000', dialog)
    fireEvent.change(within(dialog).getByLabelText('A partir de'), {
      target: { value: '2026-11' },
    })
    const save = within(dialog).getByRole<HTMLButtonElement>('button', { name: 'Alterar valor' })
    await waitFor(() => expect(save.disabled).toBe(false))
    fireEvent.click(save)

    const history = await screen.findByRole('region', { name: 'Histórico de valores' })
    await waitFor(() =>
      expect(
        within(history)
          .getAllByRole('listitem')
          .map((item) => text(item.textContent ?? '')),
      ).toEqual(['R$ 200,00desde novembro de 2026', 'R$ 180,00desde outubro de 2026']),
    )
    // O lançamento já confirmado não muda.
    const confirmed = screen.getByRole('region', { name: 'Lançamentos confirmados' })
    expect(text(confirmed.textContent ?? '')).toContain('−R$ 187,40')
  })

  it('antes do início: erro no campo e botão desabilitado', async () => {
    const { light } = await seedLightBill()
    await openDetail(light)
    fireEvent.click(screen.getByRole('button', { name: 'Alterar valor' }))
    const dialog = await openDialog('Alterar valor')

    typeNewAmount('20000', dialog)
    fireEvent.change(within(dialog).getByLabelText('A partir de'), {
      target: { value: '2026-09' },
    })
    expect(
      await within(dialog).findByText(
        'O novo valor não pode valer antes do início (outubro de 2026).',
      ),
    ).toBeTruthy()
    expect(
      within(dialog).getByRole<HTMLButtonElement>('button', { name: 'Alterar valor' }).disabled,
    ).toBe(true)
  })
})

describe('RecurringDetailPage — encerrar e excluir (RF-07 / D-51)', () => {
  it('encerrar antes de um mês confirmado é bloqueado; no mês confirmado, encerra', async () => {
    const { tag, light } = await seedLightBill()
    await confirmNovember(light, tag)
    await openDetail(light)

    fireEvent.click(screen.getByRole('button', { name: 'Encerrar' }))
    const dialog = await openDialog('Encerrar recorrente')
    const month = within(dialog).getByLabelText<HTMLInputElement>('Último mês')
    expect(month.value).toBe('2026-11') // padrão: não antes do último mês confirmado

    fireEvent.change(month, { target: { value: '2026-10' } })
    expect(
      await within(dialog).findByText(
        'O término não pode ser antes de novembro de 2026, que já foi confirmado.',
      ),
    ).toBeTruthy()
    const end = within(dialog).getByRole<HTMLButtonElement>('button', { name: 'Encerrar' })
    expect(end.disabled).toBe(true)

    fireEvent.change(month, { target: { value: '2026-11' } })
    await waitFor(() => expect(end.disabled).toBe(false))
    fireEvent.click(end)
    expect(await screen.findByText('Novembro de 2026', { exact: false })).toBeTruthy()
    await waitFor(() => expect(screen.queryByText('Sem término')).toBeNull())
  })

  it('excluir com ocorrência confirmada: bloqueia e sugere "Encerrar"', async () => {
    const { tag, light } = await seedLightBill()
    await confirmNovember(light, tag)
    await openDetail(light)
    await screen.findByRole('region', { name: 'Lançamentos confirmados' })

    fireEvent.click(screen.getByRole('button', { name: 'Excluir' }))
    const blocked = await openDialog('Não é possível excluir')
    expect(within(blocked).getByText(/tem ocorrências confirmadas/)).toBeTruthy()
    fireEvent.click(within(blocked).getByRole('button', { name: 'Encerrar' }))
    expect(await openDialog('Encerrar recorrente')).toBeTruthy()
    expect(await listRecurrings()).toHaveLength(1)
  })

  it('excluir sem confirmadas: pede confirmação, exclui e volta para a lista', async () => {
    const { light } = await seedLightBill()
    const router = await openDetail(light)

    fireEvent.click(screen.getByRole('button', { name: 'Excluir' }))
    const dialog = await openDialog('Excluir recorrente?')
    fireEvent.click(within(dialog).getByRole('button', { name: 'Excluir' }))

    await waitFor(() => expect(router.state.location.pathname).toBe('/ajustes/recorrentes'))
    expect(await listRecurrings()).toEqual([])
  })

  it('recorrente inexistente', async () => {
    renderApp(['/ajustes/recorrentes/nao-existe'])
    expect(
      await screen.findByText('Recorrente não encontrado. Ele pode ter sido excluído.'),
    ).toBeTruthy()
  })
})
