import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { addDays, format, parseISO } from 'date-fns'
import { describe, expect, it } from 'vitest'
import { addMonthsClamped, today } from '@/domain/dates'
import { formatBRL, formatSignedBRL } from '@/domain/money'
import { createTag } from '@/repositories/tagsRepository'
import { createTransaction } from '@/repositories/transactionsRepository'
import { renderApp } from '@/test/renderApp'
import {
  amountInput,
  chooseType,
  clearAmount,
  dateInput,
  descriptionInput,
  expectSubmitEnabled,
  fillTransactionForm,
  submit,
  typeAmount,
  typeDescription,
} from '@/test/transactionForm'

// O Testing Library normaliza o espaço não separável (D-29) do texto da tela para espaço comum.
const text = (value: string) => value.replace(/\s/g, ' ')

const TODAY = today()
const TOMORROW = format(addDays(parseISO(TODAY), 1), 'yyyy-MM-dd')
const PREVIOUS_MONTH = addMonthsClamped(TODAY, -1)

async function openHome() {
  const router = renderApp(['/'])
  await screen.findByRole('heading', { level: 1, name: 'Início' })
  return router
}

function overallBalanceText(): string {
  return screen.getByRole('heading', { name: 'Saldo geral' }).parentElement?.textContent ?? ''
}

function monthBalanceBlock(): HTMLElement {
  const heading = screen.getByRole('heading', { name: /^Saldo de / })
  return heading.parentElement as HTMLElement
}

function recentList(): HTMLElement {
  const section = screen.getByRole('region', { name: 'Últimos lançamentos' })
  return within(section).getByRole('list')
}

async function seedTags() {
  const salary = await createTag({ name: 'Salário', color: '#2563EB' })
  const market = await createTag({ name: 'Mercado', color: '#16A34A' })
  return { salary, market }
}

describe('HomePage (RF-02)', () => {
  it('mostra saldos zerados, o formulário e o estado vazio dos últimos lançamentos', async () => {
    await seedTags()
    await openHome()

    await waitFor(() => expect(overallBalanceText()).toContain(formatSignedBRL(0)))
    // Cada saldo tem a sua consulta ao vivo: o do mês pode chegar depois do geral.
    await waitFor(() =>
      expect(within(monthBalanceBlock()).getAllByText(text(formatSignedBRL(0)))).toHaveLength(3),
    )
    expect(await screen.findByText(/Nenhum lançamento ainda/)).toBeDefined()
    expect(screen.getByRole('link', { name: 'Ver todos' }).getAttribute('href')).toBe(
      '/lancamentos',
    )
  })

  // RF-01 — padrões: Saída; CA-02.2 — data de hoje.
  it('o formulário começa com Saída e a data de hoje', async () => {
    await openHome()
    expect(screen.getByRole<HTMLInputElement>('radio', { name: 'Saída' }).checked).toBe(true)
    expect(dateInput().value).toBe(TODAY)
  })

  // CA-01.1 / CA-02.4 / CA-02.1 — roteiro da Fase 4, itens 2 e 3.
  it('lançar atualiza saldos e últimos lançamentos e limpa o formulário mantendo tipo e data', async () => {
    await seedTags()
    await openHome()

    await fillTransactionForm({
      type: 'Entrada',
      digits: '100000',
      tag: 'Salário',
      description: 'Salário de outubro',
    })
    await submit('Lançar')

    expect(await screen.findByText('Lançamento salvo')).toBeDefined()
    await waitFor(() => expect(overallBalanceText()).toContain(formatSignedBRL(100000)))
    // Tipo e data mantidos; valor, tag e descrição limpos.
    await waitFor(() => expect(amountInput().value).toBe(''))
    expect(screen.getByRole<HTMLInputElement>('radio', { name: 'Entrada' }).checked).toBe(true)
    expect(dateInput().value).toBe(TODAY)
    expect(descriptionInput().value).toBe('')
    expect(screen.getByRole<HTMLInputElement>('radio', { name: 'Salário' }).checked).toBe(false)
    await expectSubmitEnabled('Lançar', false)

    await fillTransactionForm({
      type: 'Saída',
      digits: '25000',
      tag: 'Mercado',
      description: 'Feira',
    })
    await submit('Lançar')

    await waitFor(() => expect(overallBalanceText()).toContain(formatSignedBRL(75000)))
    // Cada saldo tem a sua consulta ao vivo: espera também a do mês.
    await waitFor(() =>
      expect(within(monthBalanceBlock()).getByText(text(formatSignedBRL(75000)))).toBeDefined(),
    )
    const month = monthBalanceBlock()
    expect(within(month).getByText(text(formatBRL(100000)))).toBeDefined()
    expect(within(month).getByText(text(formatBRL(25000)))).toBeDefined()

    // A lista também é uma consulta ao vivo à parte.
    await waitFor(() => expect(within(recentList()).getAllByRole('link')).toHaveLength(2))
    const items = within(recentList()).getAllByRole('link')
    expect(items.map((item) => item.textContent)).toEqual([
      expect.stringContaining('Feira'),
      expect.stringContaining('Salário de outubro'),
    ])
    expect(items[0].textContent).toContain(formatSignedBRL(-25000))
    expect(items[0].textContent).toContain(TODAY.split('-').reverse().join('/'))

    // Roteiro, item 3 — saída amanhã: muda o saldo geral (CA-02.3 / D-42) e o do mês (se amanhã
    // for no mês corrente), e não entra em "Últimos lançamentos" (RF-02 / D-40).
    await fillTransactionForm({ digits: '8000', tag: 'Mercado', description: 'Padaria' })
    fireEvent.change(dateInput(), { target: { value: TOMORROW } })
    await submit('Lançar')

    if (TOMORROW.slice(0, 7) === TODAY.slice(0, 7)) {
      await waitFor(() =>
        expect(within(monthBalanceBlock()).getByText(text(formatSignedBRL(67000)))).toBeDefined(),
      )
    }
    await waitFor(() => expect(overallBalanceText()).toContain(formatSignedBRL(67000)))
    await waitFor(() => expect(descriptionInput().value).toBe(''))
    // A data escolhida (amanhã) continua no formulário para o próximo lançamento.
    expect(dateInput().value).toBe(TOMORROW)

    // D-40 — lança um item de hoje e espera vê-lo na lista: essa releitura já enxerga a Padaria,
    // então a ausência dela prova a regra (e não só uma lista ainda não relida).
    await fillTransactionForm({ digits: '100', date: TODAY, tag: 'Mercado', description: 'Pão' })
    await submit('Lançar')
    await within(recentList()).findByText(/Pão/)
    expect(within(recentList()).getAllByRole('link')).toHaveLength(3)
    expect(within(recentList()).queryByText(/Padaria/)).toBeNull()
  })

  // CA-02.1 — positivo verde, negativo vermelho, zero neutro; o sinal sempre no texto.
  it('cores e sinais dos saldos', async () => {
    const { market } = await seedTags()
    await createTransaction({
      type: 'expense',
      amountCents: 4590,
      date: TODAY,
      tagId: market.id,
      description: 'Lanche',
    })
    await createTransaction({
      type: 'income',
      amountCents: 12000,
      // Mês passado: aparece nos últimos lançamentos (D-40) e fica fora do saldo do mês.
      date: PREVIOUS_MONTH,
      tagId: market.id,
      description: 'Reembolso',
    })
    await openHome()

    const negative = await screen.findAllByText(text(formatSignedBRL(-4590)))
    expect(negative[0].textContent?.startsWith('−')).toBe(true)
    expect(negative[0].className).toContain('text-red-700')

    const positive = await screen.findByText(text(formatSignedBRL(12000)))
    expect(positive.textContent?.startsWith('+')).toBe(true)
    expect(positive.className).toContain('text-green-700')
  })

  it('saldo zero é neutro (sem verde nem vermelho)', async () => {
    await openHome()
    await waitFor(() => expect(overallBalanceText()).toContain(formatSignedBRL(0)))
    // O saldo do mês vem de outra consulta ao vivo: espera por ele também.
    const [zero] = await within(monthBalanceBlock()).findAllByText(text(formatSignedBRL(0)))
    expect(zero.className).not.toMatch(/text-(green|red)/)
  })

  it('tocar num lançamento recente abre a edição', async () => {
    const { market } = await seedTags()
    const transaction = await createTransaction({
      type: 'expense',
      amountCents: 1000,
      date: TODAY,
      tagId: market.id,
      description: 'Café',
    })
    const router = await openHome()

    fireEvent.click(await screen.findByRole('link', { name: /Café/ }))
    expect(await screen.findByRole('heading', { level: 1, name: 'Lançamento' })).toBeDefined()
    expect(router.state.location.pathname).toBe(`/lancamentos/${transaction.id}`)
  })
})

// Princípio 16 / D-36 — botão desabilitado até ficar válido e erros enquanto digita.
describe('formulário de lançamento — validação (princípio 16 / CA-01.2)', () => {
  it('"Lançar" começa desabilitado, sem erros, e habilita quando tudo está válido', async () => {
    await seedTags()
    await openHome()

    await expectSubmitEnabled('Lançar', false)
    expect(screen.queryByText('Informe um valor maior que zero')).toBeNull()
    expect(screen.queryByText('Informe a descrição')).toBeNull()

    typeAmount('1999')
    await expectSubmitEnabled('Lançar', false)
    typeDescription('Mercado')
    await expectSubmitEnabled('Lançar', false)
    fireEvent.click(await screen.findByRole('radio', { name: 'Mercado' }))
    await expectSubmitEnabled('Lançar', true)
  })

  it('erros aparecem enquanto digita, depois de o campo ser editado', async () => {
    await seedTags()
    await openHome()

    typeAmount('5')
    clearAmount()
    const amountError = await screen.findByText('Informe um valor maior que zero')
    expect(amountInput().getAttribute('aria-describedby')).toBe(amountError.id)

    typeDescription('a'.repeat(101))
    expect(await screen.findByText('A descrição pode ter no máximo 100 caracteres')).toBeDefined()
    typeDescription('   ')
    expect(await screen.findByText('Informe a descrição')).toBeDefined()
    typeDescription('Feira')
    await waitFor(() => expect(screen.queryByText('Informe a descrição')).toBeNull())

    fireEvent.change(dateInput(), { target: { value: '' } })
    expect(await screen.findByText('Informe a data')).toBeDefined()
    await expectSubmitEnabled('Lançar', false)
  })

  it('trocar o tipo não limpa o que foi digitado', async () => {
    await openHome()
    typeAmount('1999')
    chooseType('Entrada')
    expect(amountInput().value).toBe(formatBRL(1999))
  })
})
