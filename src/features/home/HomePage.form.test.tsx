import { act, fireEvent, screen, waitFor, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { formatBRL, formatSignedBRL } from '@/domain/money'
import { createTag } from '@/repositories/tagsRepository'
import * as transactionsRepository from '@/repositories/transactionsRepository'
import { renderApp } from '@/test/renderApp'
import { readAllTags } from '@/test/seedDatabase'
import {
  amountInput,
  chooseDate,
  dateInput,
  descriptionInput,
  expectSubmitEnabled,
  fillTransactionForm,
  submit,
  typeAmount,
  typeDescription,
} from '@/test/transactionForm'

vi.mock('@/repositories/transactionsRepository', async (importOriginal) => {
  const actual = await importOriginal<typeof transactionsRepository>()
  return { ...actual, createTransaction: vi.fn(actual.createTransaction) }
})

const createTransaction = vi.mocked(transactionsRepository.createTransaction)

afterEach(() => {
  vi.clearAllMocks()
  vi.useRealTimers()
})

async function openHome() {
  renderApp(['/'])
  await screen.findByRole('heading', { level: 1, name: 'Início' })
}

// CA-01.7 — sem tags: orienta e cria a tag sem perder o que foi digitado.
describe('formulário de lançamento — nenhuma tag (CA-01.7)', () => {
  it('orienta a criar uma tag e, criada pelo atalho, ela já fica escolhida', async () => {
    await openHome()
    expect(await screen.findByText(/Você ainda não tem nenhuma tag/)).toBeDefined()

    typeAmount('1999')
    typeDescription('Feira do sábado')
    fireEvent.click(screen.getByRole('button', { name: 'Criar tag' }))

    const dialog = screen.getByRole('dialog', { name: 'Nova tag' })
    fireEvent.change(within(dialog).getByLabelText('Nome'), { target: { value: 'Mercado' } })
    const save = within(dialog).getByRole<HTMLButtonElement>('button', { name: 'Salvar' })
    await waitFor(() => expect(save.disabled).toBe(false))
    fireEvent.click(save)

    const tagRadio = await screen.findByRole<HTMLInputElement>('radio', { name: 'Mercado' })
    await waitFor(() => expect(tagRadio.checked).toBe(true))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(amountInput().value).toBe(formatBRL(1999))
    expect(descriptionInput().value).toBe('Feira do sábado')
    expect(await readAllTags()).toMatchObject([{ name: 'Mercado' }])

    await submit('Lançar')
    expect(await screen.findByText('Lançamento salvo')).toBeDefined()
  })

  it('cancelar a criação da tag mantém o que foi digitado', async () => {
    await openHome()
    typeDescription('Cinema')
    fireEvent.click(await screen.findByRole('button', { name: 'Criar tag' }))
    const dialog = screen.getByRole('dialog', { name: 'Nova tag' })
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancelar' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(descriptionInput().value).toBe('Cinema')
    await expectSubmitEnabled('Lançar', false)
  })
})

// D-36 — falha genérica: mensagem à parte, botão continua ativo para tentar de novo.
describe('formulário de lançamento — falha ao gravar (D-36)', () => {
  it('mostra a mensagem, mantém os dados e permite tentar de novo', async () => {
    await createTag({ name: 'Mercado', color: '#16A34A' })
    createTransaction.mockRejectedValueOnce(new Error('IndexedDB indisponível'))
    await openHome()

    await fillTransactionForm({ digits: '1000', tag: 'Mercado', description: 'Pão' })
    await submit('Lançar')

    const alert = await screen.findByRole('alert')
    expect(alert.textContent).toBe('Não foi possível salvar o lançamento. Tente de novo.')
    expect(descriptionInput().value).toBe('Pão')
    await expectSubmitEnabled('Lançar', true)

    await submit('Lançar')
    expect(await screen.findByText('Lançamento salvo')).toBeDefined()
    await waitFor(() => expect(screen.queryByRole('alert')).toBeNull())
  })

  it('tag excluída em outra aba → mensagem específica', async () => {
    await createTag({ name: 'Mercado', color: '#16A34A' })
    createTransaction.mockRejectedValueOnce(
      new transactionsRepository.TransactionTagNotFoundError('tag-x'),
    )
    await openHome()
    await fillTransactionForm({ digits: '1000', tag: 'Mercado', description: 'Pão' })
    await submit('Lançar')
    expect((await screen.findByRole('alert')).textContent).toBe(
      'A tag escolhida não existe mais. Escolha outra.',
    )
  })
})

// CA-02.2 — app aberto de um dia para o outro: a data acompanha o novo "hoje".
describe('formulário de lançamento — virada do dia (CA-02.2)', () => {
  function becomeVisibleAt(date: Date) {
    vi.setSystemTime(date)
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'))
    })
  }

  it('sem o usuário mexer na data, ela passa para o novo dia ao voltar a ficar visível', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 9, 20, 23, 50))
    await openHome()
    expect(dateInput().value).toBe('2026-10-20')

    becomeVisibleAt(new Date(2026, 9, 21, 8, 0))
    await waitFor(() => expect(dateInput().value).toBe('2026-10-21'))
    expect(screen.getByRole('heading', { name: 'Saldo de outubro de 2026' })).toBeDefined()

    becomeVisibleAt(new Date(2026, 10, 1, 8, 0))
    await waitFor(() => expect(dateInput().value).toBe('2026-11-01'))
    expect(screen.getByRole('heading', { name: 'Saldo de novembro de 2026' })).toBeDefined()
  })

  it('uma data escolhida pelo usuário não é trocada', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 9, 20, 23, 50))
    await openHome()
    chooseDate('2026-10-15')

    becomeVisibleAt(new Date(2026, 9, 21, 8, 0))
    await waitFor(() =>
      expect(screen.getByRole('heading', { name: 'Saldo de outubro de 2026' })).toBeDefined(),
    )
    expect(dateInput().value).toBe('2026-10-15')
  })
})

// RF-02 / D-40 — "Últimos lançamentos" só vão até hoje; o saldo geral soma tudo, inclusive o
// futuro (CA-02.3 / D-42), e o do mês só o mês corrente. Relógio falso para controlar o mês.
describe('saldos e últimos lançamentos — datas futuras (RF-02 / CA-02.3 / D-42 / D-40)', () => {
  const text = (value: string) => value.replace(/\s/g, ' ')

  // Só os itens da lista (a seção também tem o link "Ver todos").
  function recentItems(): HTMLElement[] {
    const section = screen.getByRole('region', { name: 'Últimos lançamentos' })
    return within(within(section).getByRole('list')).getAllByRole('link')
  }

  function monthBalanceBlock(monthLabel = 'outubro de 2026'): HTMLElement {
    return screen.getByRole('heading', { name: `Saldo de ${monthLabel}` })
      .parentElement as HTMLElement
  }

  function overallBalanceText(): string {
    return screen.getByRole('heading', { name: 'Saldo geral' }).parentElement?.textContent ?? ''
  }

  /**
   * D-40 — a lista só é relida quando a tabela muda. Lança mais um item com data de hoje e
   * espera que ele apareça: a releitura que o mostra já enxerga o lançamento futuro gravado
   * antes, então a ausência dele passa a provar a regra (e não só uma lista ainda não relida).
   */
  async function expectFutureNotListed(todayDate: string, futureDescription: RegExp) {
    await fillTransactionForm({
      digits: '100',
      date: todayDate,
      tag: 'Mercado',
      description: 'Marcador de hoje',
    })
    await submit('Lançar')
    const section = screen.getByRole('region', { name: 'Últimos lançamentos' })
    await within(section).findByText(/Marcador de hoje/)
    expect(within(section).queryByText(futureDescription)).toBeNull()
  }

  it('saída de amanhã muda os dois saldos, não aparece na lista e aparece na virada do dia', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 9, 20, 10, 0))
    await createTag({ name: 'Mercado', color: '#16A34A' })
    await openHome()

    await fillTransactionForm({ digits: '1000', tag: 'Mercado', description: 'Café' })
    await submit('Lançar')
    await waitFor(() => expect(recentItems()).toHaveLength(1))

    await fillTransactionForm({
      digits: '8000',
      date: '2026-10-21',
      tag: 'Mercado',
      description: 'Padaria',
    })
    await submit('Lançar')

    // O saldo geral e o do mês já somam a saída de amanhã (CA-02.3 / D-42)…
    await waitFor(() =>
      expect(within(monthBalanceBlock()).getByText(text(formatSignedBRL(-9000)))).toBeDefined(),
    )
    await waitFor(() => expect(overallBalanceText()).toContain(formatSignedBRL(-9000)))
    // …mas ela não entra em "Últimos lançamentos" (D-40).
    await expectFutureNotListed('2026-10-20', /Padaria/)
    expect(recentItems()).toHaveLength(2)

    // Virada do dia: o useToday recalcula "hoje" e a lista passa a incluir a Padaria.
    vi.setSystemTime(new Date(2026, 9, 21, 8, 0))
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'))
    })
    await waitFor(() => expect(recentItems()).toHaveLength(3))
    expect(recentItems()[0].textContent).toContain('Padaria')
  })

  // Roteiro da Fase 4, item 3 — mês seguinte: muda o saldo geral, não o do mês (CA-02.3 / D-42).
  it('saída no mês seguinte muda só o saldo geral e não aparece na lista', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 9, 20, 10, 0))
    await createTag({ name: 'Mercado', color: '#16A34A' })
    await openHome()

    await fillTransactionForm({ digits: '1000', tag: 'Mercado', description: 'Café' })
    await submit('Lançar')
    await waitFor(() => expect(recentItems()).toHaveLength(1))

    await fillTransactionForm({
      digits: '4000',
      date: '2026-11-05',
      tag: 'Mercado',
      description: 'Farmácia',
    })
    await submit('Lançar')

    await waitFor(() => expect(overallBalanceText()).toContain(formatSignedBRL(-5000)))
    await expectFutureNotListed('2026-10-20', /Farmácia/)
    // Relidos com o marcador de hoje (−1,00): o geral soma a Farmácia; o do mês, não.
    await waitFor(() => expect(overallBalanceText()).toContain(formatSignedBRL(-5100)))
    await waitFor(() =>
      expect(within(monthBalanceBlock()).getByText(text(formatSignedBRL(-1100)))).toBeDefined(),
    )
  })

  // CA-02.3 / D-42 — virada do ano: em 31/12, uma saída em 01/01 muda só o saldo geral.
  it('em 31/12, saída em 01/01 muda o saldo geral, mas não o de dezembro', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 11, 31, 10, 0))
    await createTag({ name: 'Mercado', color: '#16A34A' })
    await openHome()

    await fillTransactionForm({
      digits: '2500',
      date: '2027-01-01',
      tag: 'Mercado',
      description: 'Ceia',
    })
    await submit('Lançar')

    await waitFor(() => expect(overallBalanceText()).toContain(formatSignedBRL(-2500)))
    await expectFutureNotListed('2026-12-31', /Ceia/)
    // Relidos com o marcador de hoje (−1,00): o geral soma a Ceia; dezembro, não.
    await waitFor(() => expect(overallBalanceText()).toContain(formatSignedBRL(-2600)))
    await waitFor(() =>
      expect(
        within(monthBalanceBlock('dezembro de 2026')).getByText(text(formatSignedBRL(-100))),
      ).toBeDefined(),
    )
  })
})
