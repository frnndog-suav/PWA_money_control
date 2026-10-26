import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Transaction } from '@/domain/types'
import { createInstallmentPurchase } from '@/repositories/installmentsRepository'
import { createTag } from '@/repositories/tagsRepository'
import { freezeToday, openDialog } from '@/test/recurrings'
import { renderApp } from '@/test/renderApp'
import { countInstallmentGroups, readAllTransactions, readTransaction } from '@/test/seedDatabase'
import { text } from '@/test/transactionList'
import { chooseTag, typeAmount, typeDescription } from '@/test/transactionForm'

// RF-08 — compra parcelada nas telas (Fase 10). Hoje = 05/11/2026.

beforeEach(() => freezeToday(new Date(2026, 10, 5, 10, 0)))
afterEach(() => vi.useRealTimers())

async function seedPurchase(): Promise<Transaction[]> {
  const tag = await createTag({ name: 'Eletrônicos', color: '#2563EB' })
  const { installments } = await createInstallmentPurchase({
    totalCents: 10000,
    count: 3,
    firstDate: '2026-10-31',
    tagId: tag.id,
    description: 'Fone',
  })
  return installments
}

async function openNew() {
  renderApp(['/lancamentos', '/lancamentos/novo'])
  await screen.findByRole('heading', { level: 1, name: 'Novo lançamento' })
}

/** Digita no campo "Valor total" como o teclado numérico (CA-01.3). */
function typeTotal(digits: string): void {
  const input = screen.getByLabelText<HTMLInputElement>('Valor total')
  for (const digit of digits) fireEvent.change(input, { target: { value: input.value + digit } })
}

const installmentOption = () => screen.queryByRole('checkbox', { name: 'Parcelado' })

describe('Opção "Parcelado" (RF-08 / D-53)', () => {
  it('não aparece no lançamento rápido do Início', async () => {
    await createTag({ name: 'Mercado', color: '#16A34A' })
    renderApp(['/'])
    await screen.findByRole('heading', { level: 1, name: 'Início' })
    await screen.findByRole('radio', { name: 'Mercado' })
    expect(installmentOption()).toBeNull()
  })

  it('só para Saída: escolher Entrada esconde e desliga a opção', async () => {
    await createTag({ name: 'Mercado', color: '#16A34A' })
    await openNew()
    fireEvent.click(await screen.findByRole('checkbox', { name: 'Parcelado' }))
    expect(screen.getByLabelText('Número de parcelas')).toBeTruthy()

    fireEvent.click(screen.getByRole('radio', { name: 'Entrada' }))
    await waitFor(() => expect(installmentOption()).toBeNull())
    expect(screen.queryByLabelText('Número de parcelas')).toBeNull()
    expect(screen.getByLabelText('Valor')).toBeTruthy()

    fireEvent.click(screen.getByRole('radio', { name: 'Saída' }))
    expect(
      (await screen.findByRole<HTMLInputElement>('checkbox', { name: 'Parcelado' })).checked,
    ).toBe(false)
  })

  it('CA-08.1: R$ 100,00 em 3x a partir de 31/10 cria as três parcelas', async () => {
    await createTag({ name: 'Eletrônicos', color: '#2563EB' })
    await openNew()
    fireEvent.click(await screen.findByRole('checkbox', { name: 'Parcelado' }))

    expect(screen.getByLabelText('Valor total')).toBeTruthy()
    const firstDate = screen.getByLabelText<HTMLInputElement>('Data da primeira parcela')
    fireEvent.change(firstDate, { target: { value: '2026-10-31' } })
    typeTotal('10000')
    const count = screen.getByLabelText<HTMLInputElement>('Número de parcelas')
    fireEvent.change(count, { target: { value: '3' } })
    expect(
      await screen.findByText('3 parcelas: a 1ª de R$ 33,34 e as outras de R$ 33,33', {
        normalizer: (value) => text(value),
      }),
    ).toBeTruthy()
    await chooseTag('Eletrônicos')
    typeDescription('Fone')

    const save = screen.getByRole<HTMLButtonElement>('button', { name: 'Lançar' })
    await waitFor(() => expect(save.disabled).toBe(false))
    fireEvent.click(save)

    expect(await screen.findByText('Parcelamento salvo')).toBeTruthy()
    const installments = (await readAllTransactions()).sort((a, b) => a.date.localeCompare(b.date))
    expect(installments.map(({ amountCents, date }) => [amountCents, date])).toEqual([
      [3334, '2026-10-31'],
      [3333, '2026-11-30'],
      [3333, '2026-12-31'],
    ])
    expect(await countInstallmentGroups()).toBe(1)
  })

  it('número de parcelas fora de 2 a 48: erro no campo e "Lançar" desabilitado', async () => {
    await createTag({ name: 'Eletrônicos', color: '#2563EB' })
    await openNew()
    fireEvent.click(await screen.findByRole('checkbox', { name: 'Parcelado' }))
    typeTotal('10000')
    await chooseTag('Eletrônicos')
    typeDescription('Fone')

    fireEvent.change(screen.getByLabelText('Número de parcelas'), { target: { value: '49' } })
    expect(await screen.findByText('Informe de 2 a 48 parcelas')).toBeTruthy()
    expect(screen.getByRole<HTMLButtonElement>('button', { name: 'Lançar' }).disabled).toBe(true)
  })
})

describe('Parcelas nas listas e nos detalhes (RF-08 / CA-08.3 / CA-08.5)', () => {
  it('a lista mostra "Descrição (k/n)"', async () => {
    await seedPurchase()
    renderApp(['/lancamentos'])
    expect(await screen.findByText('Fone (1/3)')).toBeTruthy()
    expect(screen.getByText('Fone (2/3)')).toBeTruthy()
    expect(screen.getByText('Fone (3/3)')).toBeTruthy()
  })

  it('detalhes: parcela, total, número e quantas já passaram; tipo travado', async () => {
    const [, second] = await seedPurchase()
    renderApp(['/lancamentos', `/lancamentos/${second.id}`])
    const info = await screen.findByRole('region', { name: 'Parcela 2 de 3' })
    expect(text(info.textContent ?? '')).toContain('Valor totalR$ 100,00')
    expect(text(info.textContent ?? '')).toContain('Parcelas3')
    expect(text(info.textContent ?? '')).toContain('Já passaram1 de 3')
    expect(
      screen.getByText('Parcelas são sempre saídas; o tipo não pode ser trocado.'),
    ).toBeTruthy()
    expect(screen.queryByRole('checkbox', { name: 'Parcelado' })).toBeNull()
  })

  it('CA-08.3: editar o valor da parcela 2 muda só ela', async () => {
    const [, second] = await seedPurchase()
    renderApp(['/lancamentos', `/lancamentos/${second.id}`])
    await screen.findByRole('region', { name: 'Parcela 2 de 3' })
    const amount = screen.getByLabelText<HTMLInputElement>('Valor')
    await waitFor(() => expect(amount.value).toContain('33,33'))

    fireEvent.change(amount, { target: { value: '' } })
    typeAmount('5000', undefined)
    const save = screen.getByRole<HTMLButtonElement>('button', { name: 'Salvar' })
    await waitFor(() => expect(save.disabled).toBe(false))
    fireEvent.click(save)

    await waitFor(async () => expect((await readTransaction(second.id))?.amountCents).toBe(5000))
    const amounts = (await readAllTransactions()).map((t) => t.amountCents).sort()
    expect(amounts).toEqual([3333, 3334, 5000])
  })

  it('CA-08.4: excluir "Esta e as seguintes" a partir da 2 deixa só a 1', async () => {
    const [first, second] = await seedPurchase()
    renderApp(['/lancamentos', `/lancamentos/${second.id}`])
    await screen.findByRole('region', { name: 'Parcela 2 de 3' })

    fireEvent.click(screen.getByRole('button', { name: 'Excluir' }))
    const dialog = await openDialog('Excluir parcela?')
    // O "(2/3)" chega quando a consulta do grupo volta.
    expect(await within(dialog).findByText(/Fone \(2\/3\)/)).toBeTruthy()
    expect(within(dialog).getByRole('button', { name: 'Só esta' })).toBeTruthy()
    expect(within(dialog).getByRole('button', { name: 'Todas as parcelas' })).toBeTruthy()
    fireEvent.click(within(dialog).getByRole('button', { name: 'Esta e as seguintes' }))

    await waitFor(async () =>
      expect((await readAllTransactions()).map((t) => t.id)).toEqual([first.id]),
    )
  })
})

describe('Revalidação do total (princípio 16 / D-36)', () => {
  async function fillCheapPurchase() {
    await createTag({ name: 'Eletrônicos', color: '#2563EB' })
    await openNew()
    fireEvent.click(await screen.findByRole('checkbox', { name: 'Parcelado' }))
    typeTotal('5') // R$ 0,05
    await chooseTag('Eletrônicos')
    typeDescription('Cabo')
  }

  it('mudar o número de parcelas mostra o erro do total na hora', async () => {
    await fillCheapPurchase()
    const save = screen.getByRole<HTMLButtonElement>('button', { name: 'Lançar' })
    await waitFor(() => expect(save.disabled).toBe(false)) // 2 parcelas de R$ 0,02/0,03

    fireEvent.change(screen.getByLabelText('Número de parcelas'), { target: { value: '12' } })
    expect(
      await screen.findByText('O valor total precisa ter pelo menos R$ 0,01 por parcela'),
    ).toBeTruthy()
    expect(save.disabled).toBe(true)
  })

  it('desligar "Parcelado" tira o erro do total e libera "Lançar"', async () => {
    await fillCheapPurchase()
    fireEvent.change(screen.getByLabelText('Número de parcelas'), { target: { value: '12' } })
    await screen.findByText('O valor total precisa ter pelo menos R$ 0,01 por parcela')

    fireEvent.click(screen.getByRole('checkbox', { name: 'Parcelado' }))
    await waitFor(() =>
      expect(
        screen.queryByText('O valor total precisa ter pelo menos R$ 0,01 por parcela'),
      ).toBeNull(),
    )
    await waitFor(() =>
      expect(screen.getByRole<HTMLButtonElement>('button', { name: 'Lançar' }).disabled).toBe(
        false,
      ),
    )
  })
})

describe('"(k/n)" no Início e na visão Dia (RF-08)', () => {
  it('Últimos lançamentos mostram só a parcela até hoje, com o sufixo (D-40)', async () => {
    await seedPurchase()
    renderApp(['/'])
    const recent = await screen.findByRole('region', { name: 'Últimos lançamentos' })
    expect(await within(recent).findByText('Fone (1/3)')).toBeTruthy()
    expect(within(recent).queryByText(/Fone \(2\/3\)/)).toBeNull()
  })

  it('visão Dia da 2ª parcela', async () => {
    const { useUiStore } = await import('@/stores/uiStore')
    await seedPurchase()
    useUiStore.setState({ viewGranularity: 'day', viewAnchorDate: '2026-11-30' })
    renderApp(['/visoes'])
    expect(await screen.findByText('Fone (2/3)')).toBeTruthy()
  })
})

describe('Excluir parcela — "Só esta" e "Todas as parcelas" (CA-08.4)', () => {
  async function deleteFrom(installment: Transaction, option: string) {
    renderApp(['/lancamentos', `/lancamentos/${installment.id}`])
    await screen.findByRole('region', { name: /^Parcela/ })
    fireEvent.click(screen.getByRole('button', { name: 'Excluir' }))
    const dialog = await openDialog('Excluir parcela?')
    fireEvent.click(within(dialog).getByRole('button', { name: option }))
  }

  it('"Só esta" tira só a parcela 2', async () => {
    const [first, second, third] = await seedPurchase()
    await deleteFrom(second, 'Só esta')
    await waitFor(async () =>
      expect((await readAllTransactions()).map((t) => t.id).sort()).toEqual(
        [first.id, third.id].sort(),
      ),
    )
    expect(await countInstallmentGroups()).toBe(1)
  })

  it('"Todas as parcelas" tira as três e o parcelamento', async () => {
    const [, second] = await seedPurchase()
    await deleteFrom(second, 'Todas as parcelas')
    await waitFor(async () => expect(await readAllTransactions()).toEqual([]))
    expect(await countInstallmentGroups()).toBe(0)
  })
})
