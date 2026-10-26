import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  freezeToday,
  openDialog,
  pendingItems,
  pendingSection,
  seedLightBill,
} from '@/test/recurrings'
import { renderApp } from '@/test/renderApp'
import { text } from '@/test/transactionList'

// RF-02 item 4 — recorrentes pendentes do mês no Início (Fase 9). Hoje = 24/10/2026.

beforeEach(() => freezeToday())
afterEach(() => vi.useRealTimers())

async function openHome() {
  renderApp(['/'])
  await screen.findByRole('heading', { level: 1, name: 'Início' })
}

describe('Início — recorrentes pendentes (RF-02 item 4)', () => {
  it('oculto sem pendências no mês', async () => {
    await seedLightBill({ startPeriod: '2026-11' })
    await openHome()
    await screen.findByRole('region', { name: 'Últimos lançamentos' })
    expect(screen.queryByRole('region', { name: 'Recorrentes pendentes' })).toBeNull()
  })

  it('lista com "Confirmar" (sem "Pular"); confirmar com a data de hoje tira da lista', async () => {
    await seedLightBill()
    await openHome()
    await screen.findByRole('region', { name: 'Recorrentes pendentes' })
    expect(text(pendingItems()[0].textContent ?? '')).toContain('Conta de luz')
    expect(within(pendingSection()).queryByRole('button', { name: /Pular/ })).toBeNull()

    // D-05 — a pendência não entra no saldo do mês.
    const balances = screen.getByRole('region', { name: 'Saldos' })
    expect(text(balances.textContent ?? '')).not.toContain('180,00')

    fireEvent.click(
      within(pendingSection()).getByRole('button', { name: 'Confirmar Conta de luz' }),
    )
    const dialog = await openDialog('Confirmar “Conta de luz”')
    expect(within(dialog).getByLabelText<HTMLInputElement>('Data').value).toBe('2026-10-24')
    fireEvent.click(within(dialog).getByRole('button', { name: 'Confirmar' }))

    await waitFor(() =>
      expect(screen.queryByRole('region', { name: 'Recorrentes pendentes' })).toBeNull(),
    )
    // CA-07.2 — os saldos se atualizam com o lançamento confirmado.
    await waitFor(() => expect(text(balances.textContent ?? '')).toContain('−R$ 180,00'))
    expect(await screen.findByText('Ocorrência confirmada')).toBeTruthy()
  })
})
