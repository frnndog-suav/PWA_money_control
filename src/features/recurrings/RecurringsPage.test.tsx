import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { confirmOccurrence, createRecurring } from '@/repositories/recurringsRepository'
import { freezeToday, openDialog, seedLightBill } from '@/test/recurrings'
import { renderApp } from '@/test/renderApp'
import { text } from '@/test/transactionList'
import { chooseTag, typeAmount, typeDescription } from '@/test/transactionForm'

// RF-07 / CA-07.6 — Ajustes → Recorrentes (Fase 9). Hoje = 24/10/2026.

beforeEach(() => freezeToday())
afterEach(() => vi.useRealTimers())

async function openList() {
  const router = renderApp(['/ajustes/recorrentes'])
  await screen.findByRole('heading', { level: 1, name: 'Recorrentes' })
  return router
}

function listItem(description: string): HTMLElement {
  return screen.getByRole('link', { name: new RegExp(description) })
}

describe('RecurringsPage — lista (CA-07.6)', () => {
  it('estado vazio', async () => {
    await openList()
    expect(await screen.findByText(/Nenhum recorrente ainda/)).toBeTruthy()
  })

  it('tipo, tag, valor vigente e status do mês atual de cada recorrente', async () => {
    const { tag, light } = await seedLightBill()
    await createRecurring({
      type: 'income',
      description: 'Salário',
      tagId: tag.id,
      amountCents: 500000,
      startPeriod: '2026-12',
      endPeriod: '',
    })
    await createRecurring({
      type: 'expense',
      description: 'Academia',
      tagId: tag.id,
      amountCents: 9900,
      startPeriod: '2026-01',
      endPeriod: '2026-06',
    })
    await createRecurring({
      type: 'expense',
      description: 'Internet',
      tagId: tag.id,
      amountCents: 10000,
      startPeriod: '2026-01',
      endPeriod: '',
    })
    await confirmOccurrence(light.id, '2026-10', {
      amountCents: 18740,
      date: '2026-10-20',
      tagId: tag.id,
      description: 'Conta de luz',
    })
    await openList()
    await screen.findByRole('link', { name: /Conta de luz/ })

    expect(text(listItem('Conta de luz').textContent ?? '')).toBe(
      'Conta de luzSaídaCasaConfirmado neste mês−R$ 180,00›',
    )
    expect(text(listItem('Salário').textContent ?? '')).toContain('Começa em dezembro de 2026')
    expect(text(listItem('Salário').textContent ?? '')).toContain('+R$ 5.000,00')
    expect(text(listItem('Academia').textContent ?? '')).toContain('Encerrado')
    expect(text(listItem('Internet').textContent ?? '')).toContain('Pendente neste mês')
    // Ordem alfabética da descrição.
    const names = screen
      .getAllByRole('link')
      .filter((link) => link.getAttribute('href')?.startsWith('/ajustes/recorrentes/'))
      .map((link) => link.textContent?.split(/Saída|Entrada/)[0])
    expect(names).toEqual(['Academia', 'Conta de luz', 'Internet', 'Salário'])
  })
})

describe('RecurringsPage — novo recorrente (RF-07)', () => {
  it('cria com os padrões (Saída, mês atual, sem término) e abre os detalhes', async () => {
    await seedLightBill()
    const router = await openList()
    fireEvent.click(screen.getByRole('button', { name: 'Novo recorrente' }))
    const dialog = await openDialog('Novo recorrente')

    expect(within(dialog).getByRole('radio', { name: 'Saída' })).toHaveProperty('checked', true)
    expect(within(dialog).getByLabelText<HTMLInputElement>('Mês de início').value).toBe('2026-10')
    expect(within(dialog).getByLabelText<HTMLInputElement>(/Mês de término/).value).toBe('')
    const create = within(dialog).getByRole<HTMLButtonElement>('button', { name: 'Criar' })
    expect(create.disabled).toBe(true)

    typeDescription('Internet', dialog)
    await chooseTag('Casa', dialog)
    typeAmount('9990', dialog)
    await waitFor(() => expect(create.disabled).toBe(false))
    fireEvent.click(create)

    await screen.findByRole('heading', { level: 1, name: 'Internet' })
    expect(router.state.location.pathname).toMatch(/^\/ajustes\/recorrentes\/.+/)
    expect(screen.getByText('Sem término')).toBeTruthy()
  })

  it('término antes do início: erro no campo e "Criar" desabilitado (princípio 16)', async () => {
    await seedLightBill()
    await openList()
    fireEvent.click(screen.getByRole('button', { name: 'Novo recorrente' }))
    const dialog = await openDialog('Novo recorrente')

    typeDescription('Internet', dialog)
    await chooseTag('Casa', dialog)
    typeAmount('9990', dialog)
    fireEvent.change(within(dialog).getByLabelText(/Mês de término/), {
      target: { value: '2026-09' },
    })
    expect(await within(dialog).findByText('O término não pode ser antes do início')).toBeTruthy()
    expect(within(dialog).getByRole<HTMLButtonElement>('button', { name: 'Criar' }).disabled).toBe(
      true,
    )
  })
})
