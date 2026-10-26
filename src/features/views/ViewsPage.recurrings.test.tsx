import { act, fireEvent, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ViewGranularity } from '@/domain/periodViews'
import { getConfirmedKeysIn } from '@/repositories/recurringsRepository'
import { useUiStore } from '@/stores/uiStore'
import {
  freezeToday,
  openDialog,
  pendingItems,
  pendingSection,
  seedLightBill,
} from '@/test/recurrings'
import { renderApp } from '@/test/renderApp'
import { seedTransactions, text } from '@/test/transactionList'
import { clearAmount, typeAmount } from '@/test/transactionForm'

// RF-05 + RF-07 — Previsto e "Recorrentes pendentes" nas visões (Fase 9). Hoje = 24/10/2026.

beforeEach(() => freezeToday())
afterEach(() => vi.useRealTimers())

async function openViews(granularity: ViewGranularity, anchorDate: string) {
  useUiStore.setState({ viewGranularity: granularity, viewAnchorDate: anchorDate })
  renderApp(['/visoes'])
  await screen.findByRole('heading', { level: 1, name: 'Visões' })
}

function summaryValue(label: 'Resultado' | 'Previsto'): string {
  const card = screen.getByRole('region', { name: 'Resumo do período' })
  return text(within(card).getByText(label).nextElementSibling?.textContent ?? '')
}

describe('Visão Mês — pendentes e Previsto (CA-07.1 / CA-05.2)', () => {
  it('CA-07.1: "Conta de luz" pendente em novembro; Previsto inclui o valor e o Realizado não', async () => {
    const { tag } = await seedLightBill()
    await seedTransactions({
      type: 'income',
      amountCents: 50000,
      date: '2026-11-05',
      tagId: tag.id,
    })
    await openViews('month', '2026-11-10')

    await screen.findByRole('region', { name: 'Recorrentes pendentes' })
    expect(text(pendingItems()[0].textContent ?? '')).toContain('Conta de luz')
    expect(text(pendingItems()[0].textContent ?? '')).toContain('−R$ 180,00')
    expect(within(pendingItems()[0]).queryByText('Não confirmada')).toBeNull()
    expect(screen.getByText('Realizado')).toBeTruthy()
    expect(summaryValue('Resultado')).toBe('+R$ 500,00')
    expect(summaryValue('Previsto')).toBe('+R$ 320,00')
  })

  it('confirmar mês futuro: data sugerida dia 1, "ⓘ" explica, data fora do mês dá erro (CA-07.8 / CA-07.2)', async () => {
    await seedLightBill()
    await openViews('month', '2026-11-10')
    await screen.findByRole('region', { name: 'Recorrentes pendentes' })

    fireEvent.click(
      within(pendingSection()).getByRole('button', { name: 'Confirmar Conta de luz' }),
    )
    const dialog = await openDialog('Confirmar “Conta de luz”')
    const date = within(dialog).getByLabelText<HTMLInputElement>('Data')
    expect(date.value).toBe('2026-11-01')
    expect(within(dialog).getByText('Escolha um dia de novembro de 2026.')).toBeTruthy()
    fireEvent.click(within(dialog).getByRole('button', { name: 'Por que esta data?' }))
    expect(
      within(dialog).getByText(
        'A data sugerida é o dia 1 porque esta ocorrência é de novembro de 2026. Escolha o dia em que o lançamento realmente aconteceu, dentro desse mês.',
      ),
    ).toBeTruthy()

    fireEvent.change(date, { target: { value: '2026-12-02' } })
    expect(
      await within(dialog).findByText('A data precisa estar em novembro de 2026.'),
    ).toBeTruthy()
    const confirm = within(dialog).getByRole<HTMLButtonElement>('button', { name: 'Confirmar' })
    expect(confirm.disabled).toBe(true)

    fireEvent.change(date, { target: { value: '2026-11-17' } })
    clearAmount(dialog)
    typeAmount('18740', dialog)
    await waitFor(() => expect(confirm.disabled).toBe(false))
    fireEvent.click(confirm)

    await waitFor(() =>
      expect(screen.queryByRole('region', { name: 'Recorrentes pendentes' })).toBeNull(),
    )
    expect(summaryValue('Resultado')).toBe('−R$ 187,40')
    expect(summaryValue('Previsto')).toBe('−R$ 187,40')
    expect([...(await getConfirmedKeysIn('2026-11'))]).toHaveLength(1)
  })

  it('pular some do mês e do Previsto; "Desfazer" devolve (CA-07.4)', async () => {
    await seedLightBill()
    await openViews('month', '2026-12-10')
    await screen.findByRole('region', { name: 'Recorrentes pendentes' })
    expect(summaryValue('Previsto')).toBe('−R$ 180,00')

    fireEvent.click(within(pendingSection()).getByRole('button', { name: 'Pular Conta de luz' }))
    await waitFor(() =>
      expect(screen.queryByRole('region', { name: 'Recorrentes pendentes' })).toBeNull(),
    )
    expect(summaryValue('Previsto')).toBe('R$ 0,00')
    expect(screen.getByText('Mês pulado.')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: 'Desfazer' }))
    await screen.findByRole('region', { name: 'Recorrentes pendentes' })
    expect(summaryValue('Previsto')).toBe('−R$ 180,00')
  })

  it('CA-07.7: pendência de mês passado aparece como "Não confirmada"', async () => {
    await seedLightBill({ startPeriod: '2026-08' })
    await openViews('month', '2026-09-10')
    await screen.findByRole('region', { name: 'Recorrentes pendentes' })
    expect(within(pendingItems()[0]).getByText('Não confirmada')).toBeTruthy()
  })

  it('setas: dois meses à frente continua pendente com o mesmo valor', async () => {
    await seedLightBill()
    await openViews('month', '2026-10-10')
    await screen.findByRole('region', { name: 'Recorrentes pendentes' })

    fireEvent.click(screen.getByRole('button', { name: 'Próximo mês' }))
    fireEvent.click(screen.getByRole('button', { name: 'Próximo mês' }))
    await waitFor(() => expect(summaryValue('Previsto')).toBe('−R$ 180,00'))
    expect(text(pendingItems()[0].textContent ?? '')).toContain('−R$ 180,00')
  })
})

describe('Visão Ano — coluna Previsto (RF-05 / RF-07)', () => {
  it('cada mês mostra o Previsto: Realizado + pendentes do mês', async () => {
    const { tag } = await seedLightBill()
    await act(() =>
      seedTransactions({ type: 'income', amountCents: 100000, date: '2026-10-05', tagId: tag.id }),
    )
    await openViews('year', '2026-06-01')
    const list = await screen.findByRole('list', { name: 'Meses do ano' })
    const rows = within(list).getAllByRole('button')

    await waitFor(() => expect(text(rows[9].textContent ?? '')).toContain('Previsto +R$ 820,00'))
    expect(text(rows[10].textContent ?? '')).toContain('Previsto −R$ 180,00')
    expect(text(rows[8].textContent ?? '')).toContain('Previsto R$ 0,00') // antes do início
  })

  it('outras visões não têm Previsto', async () => {
    await seedLightBill()
    await openViews('week', '2026-10-20')
    await screen.findByRole('list', { name: 'Dias da semana' })
    expect(screen.queryByText('Previsto')).toBeNull()
    expect(screen.queryByRole('region', { name: 'Recorrentes pendentes' })).toBeNull()
  })
})
